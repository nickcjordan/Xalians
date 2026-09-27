# Builds neutral reader packets (images named by number only) for the intuitiveness audit.
import json, os, shutil
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.abspath(os.path.join(HERE, '..', '..', 'untracked', 'powerworks-audit'))
S = os.path.join(A, 'shots')
P = os.path.join(A, 'packets')
shutil.rmtree(P, ignore_errors=True)
os.makedirs(P)

def font(size):
    for f in ['C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/arial.ttf']:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()

def copy(src, dst):
    shutil.copy(os.path.join(S, src), dst)

# 1. Planning session: eight moments in play order.
plan_order = ['P1-opening', 'P2-hover', 'P3-aimed', 'P4-plan', 'P5-statuses', 'P6-charged', 'P7-crowded', 'P8-inspect']
for cond in ['planning', 'planning-guide']:
    d = os.path.join(P, cond); os.makedirs(d)
    for k, m in enumerate(plan_order, 1):
        copy(f'{m}.png', os.path.join(d, f'screen-{k:02d}.png'))
    if cond == 'planning-guide':
        shutil.copy(os.path.join(S, 'G-guide.txt'), os.path.join(d, 'guide.txt'))

# 2. Phone session.
d = os.path.join(P, 'phone'); os.makedirs(d)
for k, m in enumerate(['P9-phone-opening', 'P10-phone-chosen'], 1):
    copy(f'{m}.png', os.path.join(d, f'screen-{k:02d}.png'))

# 3. Playback session: each beat is a strip of its frames, left to right, in time order.
beats = [
    ('B1-sector1', [0, 1]), ('B1-sector1', [2, 3]), ('B1-sector1', [4, 5]), ('B1-sector1', [6, 7]),
    ('B1-sector1', [8, 9, 10, 11]), ('B1-sector1', [12, 13]), ('B1-sector1', [19, 20, 21]),
    ('B1-sector1', [22, 23, 24]), ('B2-release', [2, 3, 4, 5, 6]), ('B2-release', [14, 15, 16]),
    ('B3-broken', [7, 8, 9, 10, 11]),
]
d = os.path.join(P, 'playback'); os.makedirs(d)
for k, (b, idx) in enumerate(beats, 1):
    for j, i in enumerate(idx):
        copy(f'{b}-{i:03d}.png', os.path.join(d, f'moment-{k:02d}-{"abcdefg"[j]}.png'))
copy('B1-sector1-000.png', os.path.join(d, 'before-the-round.png'))

# 4. Signal naming: isolated crops on one sheet, then each screen with numbered boxes.
signals = []
for f in sorted(os.listdir(S)):
    if f.endswith('-signals.json'):
        mid = f[:-len('-signals.json')]
        for name, box in json.load(open(os.path.join(S, f))).items():
            if box:
                signals.append((mid, name, box))
d = os.path.join(P, 'signals'); os.makedirs(d)
key = []
cells = []
for n, (mid, name, b) in enumerate(signals, 1):
    im = Image.open(os.path.join(S, f'{mid}.png'))
    scale = im.width / 1920 if im.width != 390 else 1
    pad = 6
    x0, y0 = max(0, b['x'] - pad), max(0, b['y'] - pad)
    x1, y1 = min(im.width, b['x'] + b['width'] + pad), min(im.height, b['y'] + b['height'] + pad)
    crop = im.crop((int(x0), int(y0), int(x1), int(y1)))
    f = 2 if crop.width < 150 else 1
    cells.append((n, crop.resize((crop.width * f, crop.height * f))))
    key.append({'n': n, 'moment': mid, 'signal': name})
cols, cw, ch = 5, 300, 200
sheet = Image.new('RGB', (cols * cw, ((len(cells) + cols - 1) // cols) * ch), (235, 235, 235))
dr = ImageDraw.Draw(sheet)
for i, (n, c) in enumerate(cells):
    cx, cy = (i % cols) * cw, (i // cols) * ch
    c.thumbnail((cw - 20, ch - 40))
    sheet.paste(c, (cx + (cw - c.width) // 2, cy + 30 + (ch - 40 - c.height) // 2))
    dr.text((cx + 8, cy + 4), f'#{n}', fill=(0, 0, 0), font=font(22))
sheet.save(os.path.join(d, 'part-1-isolated.png'))
by_moment = {}
for k in key:
    by_moment.setdefault(k['moment'], []).append(k)
for j, (mid, ks) in enumerate(by_moment.items(), 1):
    im = Image.open(os.path.join(S, f'{mid}.png')).convert('RGB')
    dr = ImageDraw.Draw(im)
    for k in ks:
        b = dict(signals[k['n'] - 1][2])
        x0, y0, x1, y1 = b['x'] - 5, b['y'] - 5, b['x'] + b['width'] + 5, b['y'] + b['height'] + 5
        dr.rectangle((x0, y0, x1, y1), outline=(255, 0, 255), width=4)
        dr.rectangle((x0, y0 - 30, x0 + 52, y0), fill=(255, 0, 255))
        dr.text((x0 + 5, y0 - 28), f'#{k["n"]}', fill=(255, 255, 255), font=font(22))
    im.save(os.path.join(d, f'part-2-screen-{j:02d}.png'))
    for k in ks:
        k['screen'] = f'part-2-screen-{j:02d}.png'
json.dump(key, open(os.path.join(A, 'signal-key.json'), 'w'), indent=1)
# The question sheets travel with each packet.
for name in ['planning', 'planning-guide', 'phone', 'playback']:
    shutil.copy(os.path.join(HERE, 'questions', f'{name}.md'), os.path.join(P, name, 'questions.md'))
print(len(signals), 'signals;', len(by_moment), 'context screens;', len(beats), 'beats')

# The signal sheet's questions list which marks each in-place screen carries.
screens = {}
for k in key:
    screens.setdefault(k['screen'], []).append(k['n'])
lines = ['# Questions', '', 'This is about the marks and icons in a game where you give orders to four creatures (at the bottom) and then watch a round play out against machines (at the top).', '', '## Part 1: part-1-isolated.png', 'Each numbered cell shows one mark cut out of the game screen, with nothing around it. For each number, say what you think it means, or "no idea". One short line each, with (confidence 1 to 5).', '', '## Part 2: the screens', 'Now each mark is shown in place, outlined in magenta with its number. Look at each screen and, for each number on it, say what you now think the mark means. Note whether seeing it in place changed your answer.', '']
for s, ns in screens.items():
    lines.append('- ' + s + ': marks ' + ', '.join('#' + str(n) for n in ns))
lines += ['', '## At the end', '- Which marks were hardest to understand?', '- Which marks looked alike but seemed to mean different things?']
open(os.path.join(P, 'signals', 'questions.md'), 'w').write('
'.join(lines) + '
')
