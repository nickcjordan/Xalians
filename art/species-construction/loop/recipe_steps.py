"""Helpers for recipe.py: hashing, script closures, glb statistics, argument round trips, recipe formatting.

Nothing here runs Blender. All of it is plain Python and numpy so a recipe can be planned, keyed and
checked on a machine that cannot build.
"""
import ast
import hashlib
import json
import re
import struct
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
CONSTRUCTION = ROOT/'art/species-construction'
TEXT_SUFFIXES = {'.py', '.json', '.md', '.txt'}


# ---------------------------------------------------------------- hashing

def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def lf(data):
    """Line endings normalised to LF. A checkout with core.autocrlf turns every text file to CRLF on
    Windows; keys must not depend on that."""
    return data.replace(b'\r\n', b'\n')


def crlf(data):
    return lf(data).replace(b'\n', b'\r\n')


def file_hash(path, normalise=None):
    """sha256 of a file. Text files (by suffix) are LF-normalised unless normalise is False."""
    data = Path(path).read_bytes()
    if normalise is None:
        normalise = Path(path).suffix.lower() in TEXT_SUFFIXES
    return sha256_bytes(lf(data) if normalise else data)


def hash_variants(path):
    """The raw, LF and CRLF hashes of a file: a recorded hash matches if it equals any of them."""
    data = Path(path).read_bytes()
    return {sha256_bytes(data), sha256_bytes(lf(data)), sha256_bytes(crlf(data))}


# ---------------------------------------------------------------- script closure

def local_imports(path):
    """Names of the modules a script imports that exist as art/species-construction/<name>.py."""
    text = Path(path).read_text(encoding='utf-8', errors='replace')
    names = set()
    try:
        for node in ast.walk(ast.parse(text)):
            if isinstance(node, ast.Import):
                names.update(a.name.split('.')[0] for a in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module and not node.level:
                names.add(node.module.split('.')[0])
    except SyntaxError:
        for m in re.finditer(r'^\s*(?:from\s+(\w+)\s+import|import\s+([\w, ]+))', text, re.M):
            if m.group(1):
                names.add(m.group(1))
            else:
                names.update(x.strip().split(' as ')[0] for x in m.group(2).split(','))
    return sorted(n for n in names if (CONSTRUCTION/f'{n}.py').is_file())


def closure(script):
    """The script and every local module it imports, recursively, as repo-relative posix paths."""
    script = Path(script)
    path = script if script.is_absolute() else ROOT/script
    seen, todo = {}, [path]
    while todo:
        current = todo.pop()
        rel = current.relative_to(ROOT).as_posix()
        if rel in seen:
            continue
        seen[rel] = current
        todo.extend(CONSTRUCTION/f'{n}.py' for n in local_imports(current))
    return sorted(seen)


def closure_hash(script):
    """{repo-relative path: sha256 of its LF bytes} for the script and its local modules."""
    return {rel: sha256_bytes(lf((ROOT/rel).read_bytes())) for rel in closure(script)}


# ---------------------------------------------------------------- glb statistics and vertices

GLB_JSON, GLB_BIN = 0x4E4F534A, 0x004E4942


def read_glb(path):
    data = Path(path).read_bytes()
    magic, _version, _length = struct.unpack('<4sII', data[:12])
    if magic != b'glTF':
        raise ValueError(f'{path} is not a glb')
    offset, doc, blob = 12, None, b''
    while offset < len(data):
        size, kind = struct.unpack('<II', data[offset:offset+8])
        chunk = data[offset+8:offset+8+size]
        offset += 8+size
        if kind == GLB_JSON:
            doc = json.loads(chunk)
        elif kind == GLB_BIN:
            blob = chunk
    return doc, blob


def accessor_array(doc, blob, index):
    acc = doc['accessors'][index]
    view = doc['bufferViews'][acc['bufferView']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[acc['type']]
    dtype = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[acc['componentType']]
    start = view.get('byteOffset', 0)+acc.get('byteOffset', 0)
    stride = view.get('byteStride') or width*np.dtype(dtype).itemsize
    if stride == width*np.dtype(dtype).itemsize:
        return np.frombuffer(blob, dtype, acc['count']*width, start).reshape(acc['count'], width)
    raw = np.frombuffer(blob, np.uint8, stride*(acc['count']-1)+width*np.dtype(dtype).itemsize, start)
    rows = np.lib.stride_tricks.as_strided(raw, (acc['count'], width*np.dtype(dtype).itemsize), (stride, 1))
    return np.ascontiguousarray(rows).view(dtype).reshape(acc['count'], width)


def glb_stats(path):
    """Vertex and face counts and bounds of every mesh in a glb, from the accessors alone (no
    transforms: the exports in this pipeline carry none). Bounds are in glTF axes."""
    doc, blob = read_glb(path)
    vertices = faces = 0
    low, high = np.full(3, np.inf), np.full(3, -np.inf)
    for node in doc['nodes']:
        if 'mesh' not in node:
            continue
        for prim in doc['meshes'][node['mesh']]['primitives']:
            acc = doc['accessors'][prim['attributes']['POSITION']]
            vertices += acc['count']
            faces += (doc['accessors'][prim['indices']]['count'] if 'indices' in prim else acc['count'])//3
            if 'min' in acc and 'max' in acc:
                lo, hi = np.array(acc['min']), np.array(acc['max'])
            else:
                pos = accessor_array(doc, blob, prim['attributes']['POSITION'])
                lo, hi = pos.min(axis=0), pos.max(axis=0)
            low, high = np.minimum(low, lo), np.maximum(high, hi)
    return {'vertices': int(vertices), 'faces': int(faces),
            'bounds': [[round(float(v), 6) for v in low], [round(float(v), 6) for v in high]]}


def node_matrix(node):
    if 'matrix' in node:
        return np.array(node['matrix']).reshape(4, 4).T
    matrix = np.eye(4)
    t, q, s = node.get('translation', [0, 0, 0]), node.get('rotation', [0, 0, 0, 1]), node.get('scale', [1, 1, 1])
    x, y, z, w = q
    rot = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                    [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                    [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    matrix[:3, :3] = rot*np.array(s)
    matrix[:3, 3] = t
    return matrix


def glb_vertices(path, skin_only=True):
    """World vertices of a glb in Blender axes (Z up): glTF (x, y, z) becomes (x, -z, y). With
    skin_only the largest mesh only (the continuous skin; eyes, mouth and claws are separate objects)."""
    doc, blob = read_glb(path)
    chunks = []
    for node in doc['nodes']:
        if 'mesh' not in node:
            continue
        for prim in doc['meshes'][node['mesh']]['primitives']:
            pos = accessor_array(doc, blob, prim['attributes']['POSITION']).astype(np.float64)
            m = node_matrix(node)
            if not np.allclose(m, np.eye(4)):
                pos = pos@m[:3, :3].T+m[:3, 3]
            chunks.append(pos)
    if skin_only:
        chunks = [max(chunks, key=len)]
    gltf = np.concatenate(chunks)
    return np.stack([gltf[:, 0], -gltf[:, 2], gltf[:, 1]], axis=1)


# ---------------------------------------------------------------- argparse round trip

def script_parser(script):
    """The argparse parser a Blender script builds at module level, without importing bpy: the
    source between `parser = argparse.ArgumentParser` and `args = parser.parse_args` is executed alone."""
    import argparse
    import math
    text = Path(script).read_text(encoding='utf-8')
    lines = text.splitlines()
    start = next(k for k, line in enumerate(lines) if re.match(r'parser\s*=\s*argparse\.ArgumentParser', line))
    end = next(k for k, line in enumerate(lines) if k > start and re.match(r'args\s*=\s*parser\.parse_args', line))
    space = {'argparse': argparse, 'Path': Path, 'math': math, 'json': json, 'np': np, '__file__': str(script)}
    exec('\n'.join(lines[start:end]), space)
    return space['parser']


def namespace_to_argv(script, namespace, skip=()):
    """The command-line flags that reproduce a recorded argparse namespace, listing only values that
    differ from the script's own defaults. Paths named in skip are left for the caller to substitute."""
    parser = script_parser(script)
    argv = []
    for action in parser._actions:
        if action.dest in ('help',) or action.dest in skip or action.dest not in namespace:
            continue
        value, default = namespace[action.dest], action.default
        flag = max(action.option_strings, key=len)
        if value is None or value == default or (isinstance(default, (list, tuple)) and list(value) == list(default)):
            continue
        if action.nargs == 0:  # store_true / store_false
            if bool(value) != bool(default):
                argv.append(flag)
        elif isinstance(value, (list, tuple)):
            argv += [flag, *[str(v) for v in value]]
        else:
            argv += [flag, str(value)]
    return argv


def argv_to_namespace(script, argv):
    """What the script's own parser makes of argv (the inverse check of namespace_to_argv)."""
    return vars(script_parser(script).parse_args(argv))


# ---------------------------------------------------------------- recipe formatting

def group_args(tokens):
    """Tokens grouped one flag per group: ['--a', '1', '2', '--b'] becomes [['--a','1','2'], ['--b']]."""
    groups = []
    for token in tokens:
        if token.startswith('--') or not groups:
            groups.append([token])
        else:
            groups[-1].append(token)
    return groups


def dump_recipe(obj, indent=0):
    """JSON with one flag per line in `args` arrays and short lists on one line, so a recipe diffs well."""
    pad = '  '*indent
    if isinstance(obj, dict):
        if not obj:
            return '{}'
        body = []
        for key, value in obj.items():
            if key == 'args' and isinstance(value, list) and value and all(isinstance(v, str) for v in value):
                rows = [json.dumps(g)[1:-1] for g in group_args(value)]
                body.append(f'{pad}  {json.dumps(key)}: [\n'+',\n'.join(f'{pad}    {r}' for r in rows)+f'\n{pad}  ]')
            else:
                body.append(f'{pad}  {json.dumps(key)}: {dump_recipe(value, indent+1)}')
        return '{\n'+',\n'.join(body)+f'\n{pad}}}'
    if isinstance(obj, list):
        if not obj:
            return '[]'
        if all(not isinstance(v, (dict, list)) for v in obj) or (len(json.dumps(obj)) < 100):
            return json.dumps(obj)
        return '[\n'+',\n'.join(f'{pad}  {dump_recipe(v, indent+1)}' for v in obj)+f'\n{pad}]'
    return json.dumps(obj)
