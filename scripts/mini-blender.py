#!/usr/bin/env python3
"""Entry point for the manifest-based mini Blender runner."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent / 'mini_blender'))
from mini_blender import main

if __name__ == '__main__':
    sys.exit(main())
