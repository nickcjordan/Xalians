import sys
from pathlib import Path
sys.path.insert(0,r'C:/dev/src/xalians-creature-pipeline/art/pipeline/rig')
import optimize_game_hip as o
o.OUT=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-rig/pass3')
o.main()
