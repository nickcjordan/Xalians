import React from 'react';

/*
	PASS 52, THE LEGEND (docs/design/reclamation-glance-redesign.md, "Teaching the marks").

	The table carries no labels, so a first game gets its key once: a number pinned on each
	instrument where it actually is on the screen, and a short key beside them. It opens by
	itself the first time this browser plays (never under automation, so the checks see the
	table at rest), and from the ? key after that. It does not block the table: the first
	press anywhere, or Escape, puts it away, and that press still does what it would have.

	Each entry names a selector and says what that instrument means in a few words. An
	instrument that is not on the table at this moment (no figures yet, no stake left) is
	left out rather than pointed at nothing.
*/
export const LEGEND_ITEMS = [
	{ key: 'track', selector: '[data-round-track]', text: 'The nine worlds of the game, three rounds of three. Each fills with the color of whoever won it.' },
	{ key: 'score', selector: '[data-score]', text: 'Worlds won toward five: the rival’s row above in brass, yours below in cyan. The » number is sends left.' },
	{ key: 'totals', selector: '[data-front-totals]', text: 'Each side’s hold on this world after the Clash, the rival’s above yours. The higher takes the world.' },
	{ key: 'world', selector: '[data-site-id]', fallbackFor: 'totals', text: 'A world goes to whoever holds more of it after the Clash. The rival stands above the line, you below.' },
	{ key: 'bar', selector: '[data-rank] .rec-figure-foot', text: 'A creature’s hold. A red striped end is what the Clash would take from it.' },
	{ key: 'fit', selector: '[data-slot-state="hand"] [data-fit]', text: 'What this creature would add to each world if sent now, counting what it does in the Clash, in world order. Past a brass tick, it takes the lead there.' },
	{ key: 'role', selector: '[data-slot-state="hand"] .rec-plinth-role', text: 'Its role in the Clash: strike one, sweep all, shield, or bolster.' },
	{ key: 'stake', selector: '[data-stake-mode]', text: 'Once a game: make one world count two.' },
];

function visibleRect(el) {
	if (!el) {
		return null;
	}
	const r = el.getBoundingClientRect();
	if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) {
		return null;
	}
	return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
}

// the targets on screen now, numbered in reading order
export function measureLegend(root) {
	const scope = root || document;
	const found = [];
	const have = new Set();
	LEGEND_ITEMS.forEach((item) => {
		if (item.fallbackFor && have.has(item.fallbackFor)) {
			return;
		}
		const el = [...scope.querySelectorAll(item.selector)].find((node) => visibleRect(node));
		const rect = visibleRect(el);
		if (rect) {
			have.add(item.key);
			found.push({ ...item, rect });
		}
	});
	return found.map((item, i) => ({ ...item, n: i + 1 }));
}

const overlaps = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

// the key goes over whichever world covers the fewest of the numbered targets
function placeKey(items, root) {
	const worlds = [...(root || document).querySelectorAll('[data-site-id]')].map(visibleRect).filter(Boolean);
	const narrow = window.innerWidth <= 760;
	const width = narrow ? Math.min(window.innerWidth - 24, 340) : 340;
	const candidates = [];
	if (!narrow) {
		worlds.forEach((w) => candidates.push({ left: w.left + (w.width - width) / 2, top: w.top + 48, width }));
	} else if (worlds.length) {
		const top = Math.min(...worlds.map((w) => w.top));
		const bottom = Math.max(...worlds.map((w) => w.bottom));
		candidates.push({ left: (window.innerWidth - width) / 2, top: top + 36, width });
		candidates.push({ left: (window.innerWidth - width) / 2, top: Math.max(top + 36, bottom - 300), width });
	}
	if (!candidates.length) {
		return { left: (window.innerWidth - width) / 2, top: 80, width };
	}
	const cost = (c) => {
		const box = { left: c.left, right: c.left + c.width, top: c.top, bottom: c.top + 280 };
		return items.filter((item) => overlaps(box, item.rect)).length;
	};
	return candidates.reduce((best, c) => (cost(c) < cost(best) ? c : best));
}

export default function ReclamationLegend({ onClose, onRules }) {
	const [items, setItems] = React.useState([]);
	const [key, setKey] = React.useState(null);
	const panelRef = React.useRef(null);

	React.useLayoutEffect(() => {
		const measure = () => {
			const root = document.querySelector('.rec-match');
			const found = measureLegend(root);
			setItems(found);
			setKey(placeKey(found, root));
		};
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	}, []);

	React.useEffect(() => {
		// the first press anywhere else puts the key away, and still does what it would have
		const away = (e) => {
			if (panelRef.current && panelRef.current.contains(e.target)) {
				return;
			}
			onClose();
		};
		const esc = (e) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};
		document.addEventListener('pointerdown', away, true);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('pointerdown', away, true);
			document.removeEventListener('keydown', esc);
		};
	}, [onClose]);

	return (
		<div className="rec-legend" data-legend role="dialog" aria-label="What the marks on the table mean">
			{items.map((item) => (
				<React.Fragment key={item.key}>
					<span
						className="rec-legend-ring"
						style={{ left: item.rect.left - 3, top: item.rect.top - 3, width: item.rect.width + 6, height: item.rect.height + 6 }}
						aria-hidden="true"
					/>
					<span
						className="rec-legend-badge"
						style={{ left: Math.max(2, item.rect.left - 10), top: Math.max(2, item.rect.top - 10) }}
						data-legend-badge={item.key}
						aria-hidden="true"
					>
						{item.n}
					</span>
				</React.Fragment>
			))}
			{key && (
				<div className="g-panel rec-legend-key" ref={panelRef} style={{ left: Math.max(8, key.left), top: key.top, width: key.width }}>
					<ol className="rec-legend-list">
						{items.map((item) => (
							<li key={item.key} data-legend-item={item.key}>
								<span className="rec-legend-n" aria-hidden="true">{item.n}</span>
								<span>{item.text}</span>
							</li>
						))}
					</ol>
					<div className="rec-legend-actions">
						<button type="button" className="g-btn g-btn--primary" onClick={onClose} data-legend-close>Got it</button>
						{onRules && <button type="button" className="g-btn" onClick={onRules} data-legend-rules>How to play</button>}
					</div>
				</div>
			)}
		</div>
	);
}
