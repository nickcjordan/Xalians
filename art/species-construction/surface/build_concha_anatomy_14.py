"""Run the approved anatomy post step without generating coat data."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from concha_v1_post import main
main()
