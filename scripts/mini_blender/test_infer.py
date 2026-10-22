import argparse
import importlib.util
import io
import os
from pathlib import Path
import json
import runpy
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

import infer
import mini_blender


class InferenceTests(unittest.TestCase):
    def setUp(self):
        parent = Path(__file__).resolve().parents[2] / 'untracked'
        parent.mkdir(exist_ok=True)
        self.scratch = tempfile.TemporaryDirectory(dir=parent)
        self.addCleanup(self.scratch.cleanup)
        self.root = Path(self.scratch.name)
        (self.root / 'render.py').write_text('import json, bpy\nimport helper\n')
        (self.root / 'helper.py').write_text('from pathlib import Path\nimport render\nx="settings.json"\n')
        (self.root / 'settings.json').write_text('{}')
        self.command = ['blender', '-b', '--python', str(self.root / 'render.py'), '--',
                        '--out', str(self.root / 'result'), '--samples=32']

    def job(self, command=None):
        return infer.infer(self.command if command is None else command, cwd=self.root, check_version=False)

    def test_local_import_cycle_and_sibling_config_are_included(self):
        job = self.job()
        self.assertEqual({Path(p).name for p in job.config['inputs']}, {'render.py', 'helper.py', 'settings.json'})
        self.assertEqual(job.config['args'][-1], '--samples=32')
        self.assertEqual(len(job.config['outputs']), 1)

    def test_flag_gated_optional_import_is_skipped_only_when_unreachable(self):
        (self.root / 'helper.py').write_text("import sys\nif '--extract' in sys.argv:\n import missing_dependency\n")
        self.job()
        with self.assertRaisesRegex(infer.Unsafe, 'unresolved'):
            self.job(self.command + ['--extract'])

    def test_dynamic_import_execution_and_absolute_resources_rejected(self):
        for source in ('import importlib\nimportlib.import_module("helper")',
                       'exec("print(1)")', 'import subprocess\nsubprocess.run(["x"])',
                       'from pathlib import Path\nx=Path("C:/private/file.json")'):
            (self.root / 'helper.py').write_text(source)
            with self.assertRaises(infer.Unsafe):
                self.job()

    def test_unknown_path_roles_and_output_overlap_rejected(self):
        for command in (self.command + ['--mystery', str(self.root)],
                        ['blender', '-b', '--python', str(self.root / 'render.py'), '--', '--out', str(self.root)]):
            with self.assertRaises(infer.Unsafe):
                self.job(command)

    def test_aliases_and_unresolved_resource_reads_rejected(self):
        for source in ('from subprocess import run as launch\nlaunch(["x"])',
                       'from importlib import import_module as load\nload("helper")',
                       'from shutil import copy2\ncopy2("cwd-asset.png", "result.png")',
                       'from pathlib import Path\nPath(input()).read_text()'):
            (self.root / 'helper.py').write_text(source)
            with self.assertRaises(infer.Unsafe):
                self.job()

    def test_cwd_optional_config_is_included(self):
        (self.root / 'helper.py').write_text('from pathlib import Path\np=Path("optional.json")\nif p.exists():\n data=p.read_text()')
        (self.root / 'optional.json').write_text('{}')
        self.assertIn('optional.json', {Path(p).name for p in self.job().config['inputs']})

    def test_package_child_is_included(self):
        package = self.root / 'pkg'
        package.mkdir()
        (package / '__init__.py').write_text('')
        (package / 'child.py').write_text('VALUE=1')
        (self.root / 'helper.py').write_text('from pkg import child')
        names = {Path(p).name for p in self.job().config['inputs']}
        self.assertTrue({'__init__.py', 'child.py'} <= names)

    def test_stateful_output_modes_fall_back_without_touching_existing_file(self):
        output = self.root / 'result'
        output.mkdir()
        existing = output / 'data.txt'
        existing.write_text('preserve')
        for mode in ('a', 'a+', 'r+', 'x'):
            (self.root / 'helper.py').write_text('open("result/data.txt", %r)' % mode)
            with self.assertRaises(infer.Unsafe):
                self.job()
            self.assertEqual(existing.read_text(), 'preserve')

    def test_stateful_path_operations_rejected(self):
        for operation in ('touch()', 'unlink()', 'rmdir()', 'rename("other")', 'replace("other")', 'mkdir()'):
            (self.root / 'helper.py').write_text('from pathlib import Path\nPath("result").' + operation)
            with self.assertRaises(infer.Unsafe):
                self.job()

    def test_empty_input_directory_rejected(self):
        (self.root / 'empty').mkdir()
        (self.root / 'helper.py').write_text('from pathlib import Path\nPath("empty").is_dir()')
        with self.assertRaisesRegex(infer.Unsafe, 'empty input directory'):
            self.job()

    def test_asset_loaders_include_cwd_resources_or_reject_unresolved_paths(self):
        (self.root / 'asset.png').write_bytes(b'asset')
        for loader in ('bpy.data.images.load', 'bpy.data.libraries.load', 'np.load'):
            imports = 'import bpy\nimport numpy as np\n'
            (self.root / 'helper.py').write_text(imports + loader + '("asset.png")')
            self.assertIn('asset.png', {Path(p).name for p in self.job().config['inputs']})
            (self.root / 'helper.py').write_text(imports + loader + '(config["asset"])')
            with self.assertRaisesRegex(infer.Unsafe, 'unresolved filesystem'):
                self.job()

    def test_shell_and_inline_python_rejected(self):
        for command in (['wsl', 'bash', '-lc', 'blender -b'], ['blender', '-b', '--python-expr', 'print(1)']):
            with self.assertRaises(infer.Unsafe):
                self.job(command)

    def test_wsl_direct_command_and_owned_threads(self):
        command = ['wsl', '-d', 'Ubuntu', '--exec', 'blender', '-t', '20', *self.command[1:]]
        job = self.job(command)
        self.assertNotIn('-t', job.config['args'])

    def test_remote_preflight_failure_becomes_local_fallback(self):
        evidence = self.root / 'evidence'
        evidence.mkdir()
        (evidence / 'result.json').write_text(json.dumps({'inferenceUnsafe': True}))
        with patch.object(infer, 'infer', return_value=self.job()), \
             patch.object(mini_blender, 'mini', side_effect=RuntimeError('preflight rejected')):
            with self.assertRaisesRegex(infer.Unsafe, 'dependency check failed'):
                infer.spill(self.command, evidence)


    def test_supervisor_failure_before_blender_becomes_local_fallback(self):
        evidence = self.root / 'evidence'
        evidence.mkdir()
        (evidence / 'result.json').write_text(json.dumps({'returncode': 1, 'error': 'docker daemon unreachable'}))
        (evidence / 'blender.log').write_text('')
        with patch.object(infer, 'infer', return_value=self.job()),              patch.object(mini_blender, 'mini', side_effect=RuntimeError('mini Blender failed')):
            with self.assertRaisesRegex(infer.Unsafe, 'unavailable before Blender ran'):
                infer.spill(self.command, evidence)

    def test_blender_failure_on_mini_still_fails(self):
        evidence = self.root / 'evidence'
        evidence.mkdir()
        (evidence / 'result.json').write_text(json.dumps({'returncode': 1}))
        (evidence / 'blender.log').write_text('Error: scene broke')
        with patch.object(infer, 'infer', return_value=self.job()),              patch.object(mini_blender, 'mini', side_effect=RuntimeError('mini Blender failed')):
            with self.assertRaises(RuntimeError):
                infer.spill(self.command, evidence)

class BlendGuardTests(unittest.TestCase):
    def test_sequence_and_udim_assets_require_manifest(self):
        for source in ('SEQUENCE', 'TILED'):
            with tempfile.TemporaryDirectory() as folder:
                config = Path(folder) / 'config.json'
                config.write_text(json.dumps({'inputs': [], 'blends': ['test.blend']}))
                data = types.SimpleNamespace(libraries=[], images=[types.SimpleNamespace(source=source)],
                                             fonts=[], sounds=[], movieclips=[], cache_files=[], volumes=[], objects=[])
                bpy = types.SimpleNamespace(data=data, ops=types.SimpleNamespace(
                    wm=types.SimpleNamespace(open_mainfile=lambda **kw: None)))
                with patch.dict(sys.modules, bpy=bpy), patch.object(sys, 'argv', ['guard', str(config)]):
                    with self.assertRaisesRegex(RuntimeError, 'sequence or tiled'):
                        runpy.run_path(str(Path(__file__).with_name('blend_guard.py')))


class SlotFallbackTests(unittest.TestCase):
    def setUp(self):
        path = Path(__file__).resolve().parents[2] / 'art/pipeline/slot/slot.py'
        spec = importlib.util.spec_from_file_location('tested_slot', path)
        self.slot = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.slot)
        self.args = argparse.Namespace(command=['blender', '-b'], cls='blender', wait=10, owner='test')

    def test_unsafe_inference_logs_and_preserves_local_wait(self):
        with patch.object(self.slot, 'try_acquire', return_value=None), \
             patch.object(infer, 'spill', side_effect=infer.Unsafe('unknown output role')), \
             patch.object(self.slot, 'wait_acquire', return_value='blender:0:test') as wait, \
             patch.object(self.slot, 'remove_if_token'), \
             patch.object(self.slot.subprocess, 'call', return_value=0), \
             patch.object(self.slot.sys, 'stderr', new_callable=io.StringIO) as log:
            self.assertEqual(self.slot.cmd_run(self.args), 0)
            wait.assert_called_once()
            self.assertIn('unknown output role', log.getvalue())
            self.assertIn('waiting for local', log.getvalue())

    def test_busy_safe_job_spills_without_local_reservation(self):
        with patch.object(self.slot, 'try_acquire', return_value=None), \
             patch.object(infer, 'spill', return_value=0) as spill, \
             patch.object(self.slot, 'wait_acquire') as wait:
            self.assertEqual(self.slot.cmd_run(self.args), 0)
            spill.assert_called_once()
            wait.assert_not_called()

    def test_free_slot_keeps_command_local(self):
        with patch.object(self.slot, 'try_acquire', return_value='blender:0:test'), \
             patch.object(infer, 'spill') as spill, patch.object(self.slot, 'remove_if_token'), \
             patch.object(self.slot.subprocess, 'call', return_value=7):
            self.assertEqual(self.slot.cmd_run(self.args), 7)
            spill.assert_not_called()


if __name__ == '__main__':
    unittest.main()
