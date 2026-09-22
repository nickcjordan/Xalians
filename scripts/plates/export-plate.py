"""Export a living plate from its source page into the site.

usage: python scripts/plates/export-plate.py <era>

Reads art/plates/<era>/source.html (the design page: one plate, its controls and notes),
slices out the definitions block, the stacked layers and the two surface sheets, rewrites
the sheets to the site's asset paths, and writes apps/web/public/assets/plates/<era>/
plate.html plus the two texture files. Edit the source, never the export.
"""
import io
import os
import shutil
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
era = sys.argv[1]
src = os.path.join(ROOT, 'art', 'plates', era, 'source.html')
out_dir = os.path.join(ROOT, 'apps', 'web', 'public', 'assets', 'plates', era)
tex = os.path.join(ROOT, 'art', 'plates', '_textures')

s = io.open(src, encoding='utf-8').read()
a = s.index('<svg class="defs"')
b = s.index('<div class="controls">')
b = s.rindex('    </div>\n  </div>', a, b)
frag = s[a:b]
assert frag.count('url(../_textures/strokes.jpg)') == 1 and frag.count('url(../_textures/paper.jpg)') == 1, 'surface sheets missing'
frag = frag.replace('url(../_textures/strokes.jpg)', 'url(/assets/plates/%s/strokes.jpg)' % era)
frag = frag.replace('url(../_textures/paper.jpg)', 'url(/assets/plates/%s/paper.jpg)' % era)
head = '<!-- The %s era plate as a living painting: stacked SVG layers sharing one set of definitions, and two raster surface sheets blended over them. Exported from art/plates/%s/source.html by scripts/plates/export-plate.py; edit the source, not this file. -->\n' % (era, era)
os.makedirs(out_dir, exist_ok=True)
io.open(os.path.join(out_dir, 'plate.html'), 'w', encoding='utf-8', newline='\n').write(head + frag.strip() + '\n')
shutil.copy(os.path.join(tex, 'paper.jpg'), os.path.join(out_dir, 'paper.jpg'))
shutil.copy(os.path.join(tex, 'strokes.jpg'), os.path.join(out_dir, 'strokes.jpg'))
print('ok', len(frag) // 1024, 'KB', frag.count('<svg '), 'svgs')
