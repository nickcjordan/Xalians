// Dev-only harness (docs/design/home-story-small-pieces.md, section 5): renders a small piece at chosen
// moments side by side. /dev/pieces.html?piece=plague&t=0,1,2&cols=3&w=1000
import { PIECES, type PieceKey } from '../src/pages/home/pieces/pieces';
import { W } from '../src/pages/home/pieces/stage';

const q = new URLSearchParams(location.search);
const key = (q.get('piece') || 'plague') as PieceKey;
const piece = PIECES[key];
const times = (q.get('t') || Array.from({ length: 12 }, (_, i) => ((i * piece.loop) / 12).toFixed(2)).join(',')).split(',').map(Number);
const grid = document.getElementById('grid')!;
grid.style.setProperty('--cols', q.get('cols') || '3');
const px = Number(q.get('w') || 800);
for (const t of times) {
	const fig = document.createElement('figure');
	const c = document.createElement('canvas');
	c.width = px;
	c.height = Math.round((px * 562) / 1000);
	const cap = document.createElement('figcaption');
	cap.textContent = `${key} t=${t}`;
	fig.append(c, cap);
	grid.append(fig);
	const ctx = c.getContext('2d')!;
	ctx.setTransform(c.width / W, 0, 0, c.width / W, 0, 0);
	piece.draw(ctx, t, t + 3);
}
(window as unknown as { __done: boolean }).__done = true;
