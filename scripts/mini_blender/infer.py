"""Conservative command-only Blender inference. Never execute user Python to infer dependencies."""
import ast
import json
import os
from pathlib import Path
import re
import subprocess
import sys

from mini_blender import Job, canonical, pc_path

OUTPUT_FLAGS = {'--out', '--output', '--output-dir', '--out-dir', '-o', '--render-output'}
INPUT_FLAGS = {'--surface', '--input', '--source', '--scene', '--blend', '--config', '--configuration'}
DATA_SUFFIXES = {'.blend', '.json', '.yaml', '.yml', '.toml', '.txt', '.npy', '.npz', '.png', '.jpg',
                 '.jpeg', '.exr', '.hdr', '.tif', '.tiff', '.obj', '.mtl', '.glb', '.gltf', '.bin'}
BLENDER_MODULES = {'bpy', 'bmesh', 'mathutils', 'numpy', '_cycles', 'gpu', 'blf', 'aud'}
FORBIDDEN_MODULES = {'subprocess', 'importlib', 'socket', 'http', 'urllib', 'ftplib', 'smtplib', 'sqlite3', 'shutil'}


class Unsafe(ValueError):
    pass


def absolute(value, cwd):
    if value.startswith('//'):
        raise Unsafe('Blender-relative // paths require a manifest')
    if re.match(r'^(?:[A-Za-z]:[/\\]|/mnt/[A-Za-z]/)', value):
        return canonical(value)
    if value.startswith('/'):
        raise Unsafe('input/output outside a Windows drive mapping: ' + value)
    return canonical(str(Path(cwd) / value))


def unwrap(command):
    command = list(command)
    prefix = []
    if Path(command[0]).name.lower() in ('wsl', 'wsl.exe'):
        prefix.append(command.pop(0))
        while command and command[0] in ('-d', '--distribution', '-u', '--user'):
            prefix += command[:2]
            command = command[2:]
        if command and command[0] in ('--exec', '-e', '--'):
            prefix.append(command.pop(0))
        else:
            raise Unsafe('WSL shell commands cannot be inferred; use wsl --exec blender')
    if not command or command[0].replace('\\', '/').rsplit('/', 1)[-1].lower() not in ('blender', 'blender.exe'):
        raise Unsafe('command is not a direct Blender executable')
    return prefix + [command[0]], command[1:]


def infer(command, cwd=None, check_version=True):
    cwd = Path.cwd() if cwd is None else Path(cwd)
    executable, original = unwrap(command)
    if check_version:
        try:
            version = subprocess.run(executable + ['--version'], capture_output=True, text=True, timeout=15, check=True)
        except (OSError, subprocess.SubprocessError) as error:
            raise Unsafe('could not verify local Blender version: ' + str(error))
        if not version.stdout.startswith('Blender 5.2.2'):
            raise Unsafe('remote Blender 5.2.2 does not match the requested local version')
    args = []
    inputs = {}
    outputs = {}
    scripts = []
    blends = []
    folders = set()
    cli_paths = {}

    def add_file(value):
        path = absolute(value, cwd)
        local = Path(pc_path(path))
        if not local.is_file() or local.is_symlink():
            raise Unsafe('missing or linked input: ' + path)
        inputs[path.casefold()] = path
        if local.suffix.lower() == '.blend':
            blends.append(path)
        if len(inputs) > 256 or sum(Path(pc_path(p)).stat().st_size for p in inputs.values()) > 2 * 2**30:
            raise Unsafe('inferred inputs exceed 256 files or 2 GiB; use a manifest')
        return path

    def add_input(value):
        path = absolute(value, cwd)
        local = Path(pc_path(path))
        if local.is_symlink() or (hasattr(local, 'is_junction') and local.is_junction()):
            raise Unsafe('linked input requires a manifest: ' + path)
        if local.is_dir():
            before = len(inputs)
            for base, dirs, names in os.walk(local, followlinks=False):
                if any(d in ('.git', 'node_modules') or (Path(base) / d).is_symlink() for d in dirs):
                    raise Unsafe('input directory contains repository metadata or links')
                for name in names:
                    item = Path(base) / name
                    if item.suffix.lower() not in DATA_SUFFIXES:
                        raise Unsafe('unrecognized input file in directory: ' + str(item))
                    add_file(str(item))
            if len(inputs) == before and not any(p.startswith(path + '/') for p in inputs.values()):
                raise Unsafe('empty input directory cannot be mirrored: ' + path)
        else:
            add_file(path)
        return path

    if '-b' not in original and '--background' not in original:
        raise Unsafe('headless -b is required')
    after_separator = False
    i = 0
    while i < len(original):
        token = original[i]
        if token == '--':
            after_separator = True
            args.append(token)
            i += 1
            continue
        if not after_separator and token in ('--python-expr', '--python-console', '--python-use-system-env'):
            raise Unsafe('inline Python, console or external Python environment requires a manifest')
        if not after_separator and token in ('-t', '--threads'):
            if i + 1 >= len(original):
                raise Unsafe('missing thread value')
            i += 2  # The remote runner owns the cap; local fallback keeps the original command.
            continue
        if not after_separator and token.startswith('--threads='):
            i += 1
            continue
        flag, equals, inline = token.partition('=')
        value = inline if equals else (original[i + 1] if i + 1 < len(original) else None)
        if flag in ('--python', '-P') and not after_separator:
            if not value:
                raise Unsafe('missing Python script')
            path = add_file(value)
            scripts.append(path)
        elif flag in OUTPUT_FLAGS:
            if not value:
                raise Unsafe('missing output path')
            path = absolute(value, cwd)
            # Blender render patterns name files; script --out names a directory
            # unless the value has a recognized file suffix.
            output = path
            if flag in ('-o', '--render-output') or Path(path).suffix.lower() in DATA_SUFFIXES:
                output = canonical(str(Path(pc_path(path)).parent))
            outputs[output.casefold()] = output
        elif flag in INPUT_FLAGS:
            if not value:
                raise Unsafe('missing input path')
            path = add_input(value)
        else:
            if not token.startswith('-') and Path(token).suffix.lower() == '.blend' and not after_separator:
                path = add_file(token)
                args.append(path)
                i += 1
                continue
            if value and flag.startswith('--') and not value.startswith('-'):
                # Named existing configuration files are inputs even with a
                # caller-specific option name. Unknown path-like values fail.
                local = Path(pc_path(absolute(value, cwd))) if not value.startswith('/') or value.startswith('/mnt/') else None
                if local is not None and local.is_file() and local.suffix.lower() in DATA_SUFFIXES:
                    path = add_input(value)
                elif '/' in value or '\\' in value or (local is not None and local.is_dir()):
                    raise Unsafe('unknown path argument role for ' + flag)
                else:
                    args.extend([token] if equals else [token, value])
                    i += 1 if equals else 2
                    continue
            else:
                args.append(token)
                i += 1
                continue
        args.append(flag + '=' + path if equals else flag)
        cli_paths[flag.lstrip('-').replace('-', '_')] = Path(pc_path(path))
        if not equals:
            args.append(path)
        i += 1 if equals else 2
    if not outputs:
        raise Unsafe('no explicit output location was inferred')
    if not scripts and not blends:
        raise Unsafe('no Python script or blend input was inferred')
    if '--python-exit-code' not in args:
        args[0:0] = ['--python-exit-code', '98']

    seen = set()
    search = [Path(pc_path(p)).parent for p in scripts]

    def module(name, directory, level=0):
        if name.split('.')[0] in FORBIDDEN_MODULES:
            raise Unsafe('dynamic/process/network module requires a manifest: ' + name)
        base = directory
        for _ in range(max(0, level - 1)):
            base = base.parent
        candidates = [base] if level else [directory, *search]
        for folder in candidates:
            target = folder.joinpath(*name.split('.'))
            if target.with_suffix('.py').is_file():
                scan(target.with_suffix('.py'), False)
                return target.with_suffix('.py')
            if (target / '__init__.py').is_file():
                scan(target / '__init__.py', False)
                return target / '__init__.py'
        if level or name.split('.')[0] not in (set(sys.stdlib_module_names) | BLENDER_MODULES):
            raise Unsafe('unresolved nonstandard import: ' + name)

    def scan(path, entry):
        key = str(path.resolve()).casefold()
        if key in seen:
            return
        seen.add(key)
        add_file(str(path))
        folders.add(path.parent)
        try:
            tree = ast.parse(path.read_text(encoding='utf-8-sig'))
        except (SyntaxError, UnicodeError) as error:
            raise Unsafe('cannot analyze Python: ' + str(error))

        aliases = {}
        assignments = {}
        cli_names = {'args'}
        for item in ast.walk(tree):
            if isinstance(item, ast.Import):
                aliases.update({a.asname or a.name.split('.')[0]: a.name for a in item.names})
            elif isinstance(item, ast.ImportFrom):
                aliases.update({a.asname or a.name: (item.module or '') + '.' + a.name for a in item.names})
            elif isinstance(item, (ast.Assign, ast.AnnAssign)):
                targets = item.targets if isinstance(item, ast.Assign) else [item.target]
                for target in targets:
                    if isinstance(target, ast.Name) and item.value is not None:
                        assignments.setdefault(target.id, []).append(item.value)
                        if isinstance(item.value, ast.Call) and ast.unparse(item.value.func).endswith('.parse_args'):
                            cli_names.add(target.id)

        def full_name(node):
            name = ast.unparse(node)
            first, dot, rest = name.partition('.')
            return aliases.get(first, first) + (dot + rest if dot else '')

        def path_value(node, chain=()):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                return Path(pc_path(absolute(node.value, cwd)))
            if isinstance(node, ast.Name):
                if node.id == '__file__':
                    return path
                values = assignments.get(node.id, [])
                if node.id in chain or not values or len({ast.dump(v) for v in values}) != 1:
                    return None
                return path_value(values[0], (*chain, node.id))
            if isinstance(node, ast.Attribute):
                if isinstance(node.value, ast.Name) and node.value.id in cli_names:
                    return cli_paths.get(node.attr)
                if node.attr == 'parent':
                    value = path_value(node.value, chain)
                    return value.parent if value else None
            if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Div):
                base = path_value(node.left, chain)
                if isinstance(node.right, ast.Constant) and isinstance(node.right.value, str):
                    return base / node.right.value if base else None
                if isinstance(node.right, ast.JoinedStr):
                    # Dynamic output filenames are safe only within a known
                    # output directory. Dynamic reads are rejected below.
                    return base / '*DYNAMIC*' if base else None
            if isinstance(node, ast.Call):
                call = full_name(node.func)
                if call in ('pathlib.Path', 'Path', 'str') and len(node.args) == 1:
                    return path_value(node.args[0], chain)
                if isinstance(node.func, ast.Attribute) and node.func.attr in ('resolve', 'absolute'):
                    return path_value(node.func.value, chain)
            return None

        def filesystem(node, write=False):
            value = path_value(node)
            if value is None:
                raise Unsafe('unresolved filesystem path in ' + path.name + ': ' + ast.unparse(node))
            rendered = canonical(str(value))
            inside_output = any(rendered.casefold() == p.casefold() or rendered.casefold().startswith(p.casefold() + '/')
                                for p in outputs.values())
            if write:
                if not inside_output:
                    raise Unsafe('write outside declared outputs in ' + path.name)
                return
            if inside_output or '*DYNAMIC*' in str(value):
                raise Unsafe('output-dependent or dynamic resource read in ' + path.name)
            if value.is_dir():
                add_input(str(value))
            elif value.exists():
                if value.suffix.lower() not in DATA_SUFFIXES | {'.py'}:
                    raise Unsafe('unrecognized resource read in ' + path.name)
                add_file(str(value))
            # A missing static file stays missing in the private drive mirror.

        def walk(node):
            if isinstance(node, ast.If):
                test = node.test
                # Common command-gated optional imports, including Akinza's
                # --extract branch, are reachable only when that flag is set.
                if (isinstance(test, ast.Compare) and isinstance(test.left, ast.Constant)
                    and isinstance(test.left.value, str) and len(test.ops) == 1
                    and isinstance(test.ops[0], ast.In) and ast.unparse(test.comparators[0]) == 'sys.argv'):
                    for child in (node.body if test.left.value in original else node.orelse):
                        walk(child)
                    return
                if ast.unparse(test) in ("__name__ == '__main__'", "'__main__' == __name__"):
                    for child in (node.body if entry else node.orelse):
                        walk(child)
                    return
            if isinstance(node, ast.Import):
                for alias in node.names:
                    module(alias.name, path.parent)
            elif isinstance(node, ast.ImportFrom):
                imported = module(node.module or '', path.parent, node.level)
                for alias in node.names:
                    folder = imported.parent if imported and imported.name == '__init__.py' else path.parent
                    sibling = folder / (alias.name + '.py')
                    if sibling.is_file():
                        scan(sibling, False)
            elif isinstance(node, ast.Call):
                call = full_name(node.func)
                if call in ('exec', 'eval', '__import__', 'importlib.import_module', 'os.chdir', 'os.system') or call.startswith('subprocess.'):
                    raise Unsafe('dynamic execution or process side effect in ' + path.name + ': ' + call)
                if call.startswith('os.') and not call.startswith('os.path.'):
                    raise Unsafe('unresolved OS side effect or environment dependency in ' + path.name)
                if call.startswith('sys.path.') and node.args and '__file__' not in ast.unparse(node):
                    raise Unsafe('unresolved Python search path change in ' + path.name)
                if (call.startswith('bpy.data.') and call.endswith('.load')) or call in (
                        'numpy.load', 'numpy.loadtxt', 'numpy.genfromtxt', 'numpy.fromfile', 'PIL.Image.open'):
                    resource = node.args[0] if node.args else next(
                        (k.value for k in node.keywords if k.arg in ('filepath', 'file', 'fname')), None)
                    if resource is None:
                        raise Unsafe('unresolved asset loader in ' + path.name + ': ' + call)
                    filesystem(resource)
                if call.startswith('bpy.ops.import_'):
                    raise Unsafe('Blender import operators require an explicit manifest')
                if call in ('open', 'io.open', 'builtins.open'):
                    if not node.args:
                        raise Unsafe('unresolved open call')
                    mode = node.args[1] if len(node.args) > 1 else next((k.value for k in node.keywords if k.arg == 'mode'), ast.Constant('r'))
                    if not isinstance(mode, ast.Constant) or not isinstance(mode.value, str):
                        raise Unsafe('dynamic file access mode')
                    if any(c in mode.value for c in 'ax+'):
                        raise Unsafe('append, exclusive or updating output requires existing state; use a manifest')
                    filesystem(node.args[0], any(c in mode.value for c in 'wax+'))
                if isinstance(node.func, ast.Attribute):
                    operation = node.func.attr
                    if operation in ('read_text', 'read_bytes', 'is_file', 'is_dir', 'exists', 'glob', 'rglob', 'iterdir', 'stat', 'lstat'):
                        filesystem(node.func.value)
                    elif operation in ('touch', 'unlink', 'rmdir', 'rename', 'replace'):
                        raise Unsafe('stateful filesystem operation requires a manifest: ' + operation)
                    elif operation == 'mkdir':
                        exist_ok = next((k.value for k in node.keywords if k.arg == 'exist_ok'), None)
                        if not isinstance(exist_ok, ast.Constant) or exist_ok.value is not True:
                            raise Unsafe('mkdir must use exist_ok=True for automatic inference')
                        filesystem(node.func.value, True)
                    elif operation in ('write_text', 'write_bytes'):
                        filesystem(node.func.value, True)
                    elif operation == 'open':
                        if call not in ('io.open', 'builtins.open'):
                            raise Unsafe('file-object open requires an explicit manifest')
                if call == 'bpy.ops.wm.open_mainfile':
                    filename = next((k.value for k in node.keywords if k.arg == 'filepath'), None)
                    if filename is None:
                        raise Unsafe('unresolved blend load')
                    filesystem(filename)
                if call in ('bpy.ops.wm.save_as_mainfile', 'bpy.ops.wm.save_mainfile'):
                    filename = next((k.value for k in node.keywords if k.arg == 'filepath'), None)
                    if filename is None:
                        raise Unsafe('implicit blend save path')
                    filesystem(filename, True)
            elif isinstance(node, ast.Constant) and isinstance(node.value, str):
                value = node.value
                if re.match(r'^(?:[A-Za-z]:[/\\]|/mnt/[A-Za-z]/|/home/)', value):
                    raise Unsafe('hardcoded absolute resource path in ' + path.name)
                if '\n' not in value and Path(value).suffix.lower() in DATA_SUFFIXES:
                    resource = path.parent / value
                    if resource.is_file():
                        add_file(str(resource))
            for child in ast.iter_child_nodes(node):
                # Docstrings are prose, not executed filesystem dependencies.
                if isinstance(child, ast.Expr) and isinstance(child.value, ast.Constant) and isinstance(child.value.value, str):
                    continue
                walk(child)
        walk(tree)

    for script in scripts:
        scan(Path(pc_path(script)), True)
    working = canonical(str(cwd))
    drives = sorted({p[0].upper() for p in [*inputs.values(), *outputs.values(), working]})
    config = {'mappings': [{'source': drive + ':/', 'target': 'drive-' + drive.lower()} for drive in drives],
              'inputs': list(inputs.values()), 'outputs': list(outputs.values()), 'args': args,
              'inferred': True, 'blend_inputs': sorted(set(blends)), 'cwd': working}
    try:
        return Job(config)
    except ValueError as error:
        raise Unsafe(str(error))


def spill(command, evidence):
    """Called by slot.py only after an unsuccessful local acquisition."""
    import mini_blender
    try:
        job = infer(command)
    except (ValueError, OSError) as error:
        raise Unsafe(str(error)) from error
    evidence = Path(evidence)
    evidence.mkdir(parents=True, exist_ok=True)
    (evidence / 'inferred-job.json').write_text(json.dumps(job.config, indent=2))
    print('local Blender slot busy; inferred %d inputs and %d output locations; spilling to mini' %
          (len(job.inputs), len(job.outputs)), file=sys.stderr)
    try:
        return mini_blender.mini(job, 'mini', evidence)
    except (OSError, subprocess.SubprocessError) as error:
        raise Unsafe('mini transport unavailable: ' + str(error))
    except RuntimeError:
        result = evidence / 'result.json'
        log = evidence / 'blender.log'
        if (result.exists() and json.loads(result.read_text()).get('inferenceUnsafe')) or (
                log.exists() and any(marker in log.read_text(errors='replace') for marker in
                                     ('FileNotFoundError', 'ModuleNotFoundError', 'INFERENCE_UNSAFE:'))):
            raise Unsafe('inferred dependency check failed; see ' + str(evidence))
        raise
