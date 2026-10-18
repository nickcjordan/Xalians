import os,sys,runpy,traceback
from pathlib import Path
import importlib
import ear_annulus
importlib.reload(ear_annulus)
try:runpy.run_path(str(Path(__file__).with_name('annulus_core.py')),run_name='__main__')
except Exception:
 traceback.print_exc();sys.argv=[sys.argv[0],'--','--stage','hold'];runpy.run_path(str(Path(__file__).with_name('build_gamemesh.py')),run_name='__main__')
