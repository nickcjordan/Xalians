// Builds the Codex: the whole of Xalia canon as one document, in four
// formats, for machines and humans that cannot execute the SPA's
// JavaScript (NotebookLM's website import, most LLM browsing tools, search
// crawlers). Contract: docs/design/xalian-lore-codex.md.
//
// Sources (read relative to __dirname, never the process cwd):
//   docs/encyclopedia/encyclopedia.json
//   docs/encyclopedia/chronicle.json
//   docs/encyclopedia/tour.json
//   docs/species-templates/RATIFIED.json
//   docs/species-templates/registries.json
//   docs/species-templates/<key>.json  (one per ratified species)
//   lambda/src/json/planetRecords.json
//
// Exports build(): { markdown, text, html, json, llms, warnings } without
// touching the filesystem. When run directly (`node scripts/buildCodex.js`)
// writes my-app/public/lore/xalia.{md,txt,html,json} and
// my-app/public/llms.txt, creating the directory, and prints a word count
// and any warnings.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const J = (...parts) => JSON.parse(fs.readFileSync(path.join(ROOT, ...parts), 'utf8'));

const SITE = 'https://www.xalians.com';
const URLS = {
	md: `${SITE}/lore/xalia.md`,
	txt: `${SITE}/lore/xalia.txt`,
	html: `${SITE}/lore/xalia.html`,
	json: `${SITE}/lore/xalia.json`,
	llms: `${SITE}/llms.txt`,
	encyclopedia: `${SITE}/encyclopedia`,
};

const RATING_LABEL = {
	optimal: 'OPTIMAL',
	viable: 'VIABLE',
	inefficient: 'INEFFICIENT',
	unsupported: 'UNSUPPORTED',
	'not-applicable': 'NOT APPLICABLE',
};

const PROTOCOL_LABEL = {
	'apex-accords-standard': 'APEX Accords standard',
};

function protocolLabel(slug) {
	return PROTOCOL_LABEL[slug] || slug.replace(/-/g, ' ');
}

function cap(s) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

// Serial-comma join for a list of names the builder authors into a sentence
// (as opposed to canon prose, which is quoted verbatim): "a, b, and c".
function joinSerial(items) {
	if (items.length === 0) return '';
	if (items.length === 1) return items[0];
	if (items.length === 2) return `${items[0]} and ${items[1]}`;
	return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function lower(s) {
	return s.toLowerCase();
}

function fail(message) {
	throw new Error(`buildCodex: ${message}`);
}

// ---- registries: resolve a key to its display name, mirroring
// my-app/src/lore/species.js resolveRegistry() but in plain Node against the
// docs/ source registries.json (array-of-{key,name,nature} per vocabulary,
// physiology nested one level deeper by field). ----

function toMap(list) {
	return new Map((list || []).map((item) => [item.key, item]));
}

function buildRegistryMaps(registriesData) {
	return {
		attributes: toMap(registriesData.attributes),
		archetypes: toMap(registriesData.archetypes),
		traits: toMap(registriesData.traits),
		elements: toMap(registriesData.elements),
		capabilities: toMap(registriesData.capabilities),
		senses: toMap(registriesData.senses),
		anatomy: toMap(registriesData.anatomy),
		channels: toMap(registriesData.channels),
		actions: toMap(registriesData.actions),
		physiology: Object.fromEntries(
			Object.entries(registriesData.physiology || {}).map(([k, v]) => [k, toMap(v)])
		),
	};
}

// Every registry key printed in the Bestiary must resolve; a key with no
// registry row is a build error (contract §1 outputs / §"registries.json"
// resolution rule, item 7 of Document order).
function resolveName(map, key, context) {
	const item = map.get(key);
	if (!item) fail(`unresolved registry key "${key}" (${context})`);
	return item.name;
}

function lookupInstrument(maps, key, context) {
	const item = maps.anatomy.get(key) || maps.channels.get(key);
	if (!item) fail(`unresolved instrument key "${key}" (${context})`);
	return item.name;
}

// ---- Environmental report block, reused from scripts/buildCanonCompendium.js. ----

function reportBlock(r) {
	const lines = [];
	lines.push(
		`> **Standardized Environmental Report.** Unit: ${r.unit}${
			r.unitNote ? ` (${r.unitNote})` : ''
		}. Protocol: ${protocolLabel(r.protocol)}. Cycle: ${r.cycle}. Receipt unconfirmed.`
	);
	lines.push('>');
	lines.push(`> **Terrain:** ${r.terrain.features.join('; ')}. ${r.terrain.notes || ''}`.trim());
	const mob = ['flight', 'swim', 'burrow', 'climb', 'sprint']
		.map((a) => {
			const m = r.mobility[a];
			return `${a} ${RATING_LABEL[m.rating]}${m.note ? ` (${m.note})` : ''}`;
		})
		.join('; ');
	lines.push(`> **Mobility:** ${mob}.`);
	lines.push(`> **Extant fauna:** ${r.fauna.observations.join('. ')}.`);
	lines.push(`> **Hazards:** ${r.hazards.join('; ')}.`);
	lines.push(
		`> **Output priorities:** ${r.outputPriorities.join('; ')}.${r.outputNotes ? ' ' + r.outputNotes : ''}`
	);
	return lines.join('\n');
}

// ---- markdown helpers ----

function mdList(items) {
	return items.map((i) => `- ${i}`).join('\n');
}

function mdOrderedItem(n, text) {
	return `${n}. ${text}`;
}

// ---- build() ----

function build() {
	const warnings = [];

	const encyclopedia = J('docs', 'encyclopedia', 'encyclopedia.json');
	const chronicle = J('docs', 'encyclopedia', 'chronicle.json');
	const tour = J('docs', 'encyclopedia', 'tour.json');
	const ratified = J('docs', 'species-templates', 'RATIFIED.json');
	const registriesData = J('docs', 'species-templates', 'registries.json');
	const planetRecords = J('lambda', 'src', 'json', 'planetRecords.json');

	const registries = buildRegistryMaps(registriesData);

	const speciesTemplates = ratified.species.map((key) =>
		J('docs', 'species-templates', `${key}.json`)
	);

	const version = [
		encyclopedia.version,
		chronicle.version,
		tour.version,
		ratified.version,
		registriesData.version,
	].join('+');

	// ---- lookups ----

	const planetsByKey = new Map(planetRecords.map((p) => [p.key, p]));
	const entriesByKey = new Map(encyclopedia.entries.map((e) => [e.key, e]));
	const erasInOrder = [...chronicle.eras].sort((a, b) => a.order - b.order);
	const erasByKey = new Map(chronicle.eras.map((e) => [e.key, e]));
	const eventsByEra = new Map();
	for (const ev of chronicle.events) {
		if (!eventsByEra.has(ev.era)) eventsByEra.set(ev.era, []);
		eventsByEra.get(ev.era).push(ev);
	}
	for (const list of eventsByEra.values()) list.sort((a, b) => a.order - b.order);
	const paragraphsByPlanetIndex = new Map(
		chronicle.paragraphs.map((p) => [`${p.planet}:${p.index}`, p])
	);

	// Species keyed the same way templates are keyed.
	const speciesByKey = new Map(speciesTemplates.map((t) => [t.key, t]));

	// Resolve "related" keys against entries, planets, or species (contract
	// says any unresolved related key must throw).
	function resolveRelatedTitle(key, context) {
		const entry = entriesByKey.get(key);
		if (entry) return entry.title;
		const planet = planetsByKey.get(key);
		if (planet) return planet.name;
		const species = speciesByKey.get(key);
		if (species) return species.name;
		fail(`unresolved related key "${key}" (${context})`);
	}

	// ---- counts (the only digits allowed in the preamble/machine note) ----

	const counts = {
		worlds: planetRecords.length,
		species: speciesTemplates.length,
		entries: encyclopedia.entries.length,
		eras: erasInOrder.length,
	};

	// ---- 1. Title and preamble ----

	const title = 'Encyclopedia Xalia: The Codex';

	const preamble = [
		`This document is the complete published canon of the world of Xalia, generated from the archive's sources and gathered into one file: ${counts.worlds} worlds, ${counts.species} species, ${counts.entries} encyclopedia entries, and ${counts.eras} eras of the Chronicle.`,
		`It is ordered to be read start to end: a preamble, a note for machine readers, the First Survey, the Chronicle, the Worlds, the Encyclopedia, the Bestiary, and an Index of Names.`,
		`The timeline in the Chronicle is deliberately undated.`,
		`The archive keeps three questions open and answers none of them here.`,
		`What is the weapon on the moon of Phantiri?`,
		`What was found at Deepwater Black on Endessa?`,
		`What built the worldship of Veridium?`,
	].join(' ');

	// ---- 2. Machine note ----

	const machineNote = [
		`Nearly every proper name in this document has its own heading in the Encyclopedia, the Worlds, or the Bestiary section; aliases are listed in the Index of Names, cross-references appear as See also lines, and this document is published in four formats: Markdown at ${URLS.md}, plain text at ${URLS.txt}, HTML at ${URLS.html}, and JSON at ${URLS.json}.`,
	].join(' ');

	// ---- 3. Foreword: The First Survey ----

	const tourBeats = [...tour.beats].sort((a, b) => a.order - b.order);
	const tourSection = {
		heading: 'Foreword: The First Survey',
		beats: tourBeats.map((beat) => {
			const era = erasByKey.get(beat.era);
			if (!era) fail(`tour beat "${beat.key}" has unknown era "${beat.era}"`);
			const worldNames = beat.worlds.map((w) => {
				const p = planetsByKey.get(w);
				if (!p) fail(`tour beat "${beat.key}" has unknown world "${w}"`);
				return p.name;
			});
			return {
				title: beat.title,
				eraName: era.name,
				worldNames,
				prose: beat.prose,
			};
		}),
	};

	// ---- 4. The Chronicle ----

	const chronicleSection = erasInOrder.map((era) => {
		const events = eventsByEra.get(era.key) || [];
		return {
			era,
			events: events.map((ev) => {
				const planetNames = ev.planets.map((k) => {
					const p = planetsByKey.get(k);
					if (!p) fail(`chronicle event "${ev.key}" has unknown planet "${k}"`);
					return p.name;
				});
				const quotes = ev.anchors.map((a) => {
					const p = planetsByKey.get(a.planet);
					if (!p) fail(`chronicle event "${ev.key}" anchor has unknown planet "${a.planet}"`);
					return { text: a.quote, worldName: p.name, paragraph: a.paragraph };
				});
				const entryTitle = ev.entry ? resolveRelatedTitle(ev.entry, `chronicle event ${ev.key}`) : null;
				return {
					title: ev.title,
					planetNames,
					firmness: ev.firmness,
					quotes,
					entryTitle,
				};
			}),
		};
	});

	// ---- 5. The Worlds ----

	const worldsSection = planetRecords.map((planet) => {
		const chapters = planet.history.map((text, index) => {
			const tag = paragraphsByPlanetIndex.get(`${planet.key}:${index}`);
			if (!tag) {
				warnings.push(`world "${planet.name}" history paragraph ${index} has no chronicle era tag`);
				return { text, eraLabel: 'Untagged' };
			}
			// "natural" is a real sentinel value in chronicle.json for paragraphs
			// that describe a world's pre-history geology/astronomy rather than an
			// event in one of the seven named eras (see loaders.js / worlds.js,
			// which use the same fallback). It is not itself an era row.
			if (tag.era === 'natural') return { text, eraLabel: 'Natural History' };
			const era = erasByKey.get(tag.era);
			if (!era) fail(`world "${planet.name}" paragraph ${index} tagged with unknown era "${tag.era}"`);
			return { text, eraLabel: era.name };
		});

		const nativeSpeciesNames = speciesTemplates
			.filter((t) => t.homePlanet === planet.key)
			.map((t) => t.name)
			.sort((a, b) => a.localeCompare(b));

		const ownEntry = entriesByKey.get(planet.key) || null;
		const relatedEntries = encyclopedia.entries
			.filter((e) => e.key !== planet.key && (e.related || []).includes(planet.key))
			.map((e) => e.title)
			.sort((a, b) => a.localeCompare(b));

		return {
			planet,
			chapters,
			nativeSpeciesNames,
			ownEntry,
			relatedEntries,
		};
	});

	// ---- 6. The Encyclopedia (excludes category "xalians": species are the Bestiary) ----

	const encyclopediaSection = encyclopedia.categories
		.filter((c) => c !== 'xalians')
		.map((category) => {
			const entries = encyclopedia.entries
				.filter((e) => e.category === category)
				.slice()
				.sort((a, b) => a.title.localeCompare(b.title))
				.map((e) => {
					const related = (e.related || []).map((k) => resolveRelatedTitle(k, `entry ${e.key}`));
					return {
						title: e.title,
						aliases: e.aliases || [],
						definition: e.definition,
						related,
					};
				});
			return { category, entries };
		})
		.filter((section) => section.entries.length > 0);

	// ---- 7. The Bestiary ----

	const worldOrderIndex = new Map(planetRecords.map((p, i) => [p.key, i]));

	const bestiarySection = [...speciesTemplates]
		.sort((a, b) => {
			const wa = worldOrderIndex.get(a.homePlanet);
			const wb = worldOrderIndex.get(b.homePlanet);
			if (wa !== wb) return wa - wb;
			return a.name.localeCompare(b.name);
		})
		.map((t) => {
			const homeWorld = planetsByKey.get(t.homePlanet);
			if (!homeWorld) fail(`species "${t.key}" has unknown home world "${t.homePlanet}"`);
			const otherWorlds = (t.generatorPlanets || [])
				.filter((k) => k !== t.homePlanet)
				.map((k) => {
					const p = planetsByKey.get(k);
					if (!p) fail(`species "${t.key}" has unknown generator world "${k}"`);
					return p.name;
				});

			const phys = t.physiology;
			const bodyPlanName = resolveName(registries.physiology.bodyPlan, phys.bodyPlan, `species ${t.key} bodyPlan`);
			const coveringName = resolveName(registries.physiology.covering, phys.covering, `species ${t.key} covering`);
			const dietName = resolveName(registries.physiology.diet, phys.diet, `species ${t.key} diet`);
			const lifespanName = resolveName(
				registries.physiology.lifespan,
				phys.lifespan,
				`species ${t.key} lifespan`
			);
			const corporealityName = resolveName(
				registries.physiology.corporeality,
				phys.corporeality,
				`species ${t.key} corporeality`
			);
			const isNonCorporeal = phys.corporeality !== 'corporeal';

			const entry = entriesByKey.get(t.key);
			if (!entry) fail(`species "${t.key}" has no encyclopedia entry (category xalians)`);

			const topTraits = Object.entries(t.traits.pool)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3)
				.map(([key]) => lower(resolveName(registries.traits, key, `species ${t.key} trait`)));

			let signature = null;
			if (t.signatureAbility) {
				const sig = t.signatureAbility;
				signature = { name: sig.name, description: sig.description };
			}

			const related = (entry.related || []).map((k) => resolveRelatedTitle(k, `species entry ${t.key}`));

			return {
				key: t.key,
				name: t.name,
				elementName: resolveName(registries.elements, t.element, `species ${t.key} element`),
				homeWorldName: homeWorld.name,
				otherWorlds,
				bodyPlanName,
				coveringName,
				heightCm: phys.size.heightCm,
				weightKg: phys.size.weightKg,
				lifespanName,
				dietName,
				corporealityName,
				isNonCorporeal,
				definition: entry.definition,
				description: t.lore.description,
				biomeNiche: t.lore.biomeNiche,
				topTraits,
				signature,
				related,
			};
		});

	// ---- 8. Index of Names ----

	const indexItems = [];
	for (const e of encyclopedia.entries) {
		// Ratified species already get one index line from the speciesTemplates
		// loop below ("(species, Bestiary)"); skip their category-"xalians"
		// entry line here so they are not listed twice. The two xalians-category
		// entries that are not ratified species (battle-fee, the general
		// "xalians" concept entry) still get their normal entry line.
		if (e.category === 'xalians' && speciesByKey.has(e.key)) continue;
		indexItems.push({ name: e.title, kind: e.category, section: e.category === 'xalians' ? 'Bestiary' : 'Encyclopedia' });
		for (const alias of e.aliases || []) {
			indexItems.push({ name: alias, kind: 'alias', section: `see ${e.title}`, isAlias: true, targetTitle: e.title });
		}
	}
	for (const p of planetRecords) {
		indexItems.push({ name: p.name, kind: 'world', section: 'Worlds' });
	}
	for (const t of speciesTemplates) {
		indexItems.push({ name: t.name, kind: 'species', section: 'Bestiary' });
	}
	for (const era of erasInOrder) {
		indexItems.push({ name: era.name, kind: 'era', section: 'Chronicle' });
	}
	indexItems.sort((a, b) => a.name.localeCompare(b.name));

	// ================= render: Markdown =================

	const md = [];
	md.push(`# ${title}`, '');
	md.push(preamble, '');
	md.push('## A note for readers that are machines', '');
	md.push(machineNote, '');

	md.push(`## ${tourSection.heading}`, '');
	for (const beat of tourSection.beats) {
		md.push(`### ${beat.title}`, '');
		md.push(`*${beat.eraName}. Worlds: ${beat.worldNames.join(', ')}.*`, '');
		md.push(beat.prose, '');
	}

	md.push('## The Chronicle', '');
	for (const { era, events } of chronicleSection) {
		md.push(`### ${era.name}`, '');
		md.push(era.definition, '');
		if (events.length) {
			events.forEach((ev, i) => {
				const planetsPart = ev.planetNames.join(', ');
				const firmnessPart = ev.firmness !== 'firm' ? `, ${ev.firmness === 'era-only' ? 'conjectural' : ev.firmness}` : '';
				md.push(mdOrderedItem(i + 1, `**${ev.title}** (${planetsPart}${firmnessPart})`));
				for (const q of ev.quotes) {
					md.push(`   > "${q.text}" (${q.worldName}, paragraph ${q.paragraph})`);
				}
				if (ev.entryTitle) md.push(`   See also: ${ev.entryTitle}`);
			});
			md.push('');
		}
	}

	md.push('## The Worlds', '');
	for (const w of worldsSection) {
		const p = w.planet;
		md.push(`### ${p.name}`, '');
		md.push(
			`**Element:** ${cap(p.element)} · **Terrain:** ${p.physical.terrainLabel} · **Size:** ${p.physical.sizeVsEarth}x Earth · **Radius:** ${p.physical.radiusKm.toLocaleString('en-US')} km · **Gravity:** ${p.physical.gravityVsEarth}x Earth · **Temperature:** ${p.physical.temperatureC.low} to ${p.physical.temperatureC.high} °C`,
			''
		);
		md.push(reportBlock(p.report), '');
		md.push(`#### History of ${p.name}`, '');
		for (const chapter of w.chapters) {
			md.push(`[${chapter.eraLabel}] ${chapter.text.trim()}`, '');
		}
		md.push('#### Native species', '');
		md.push(w.nativeSpeciesNames.length ? w.nativeSpeciesNames.join(', ') : 'None recorded.', '');
		md.push(`#### Encyclopedia entries about ${p.name}`, '');
		if (w.ownEntry) md.push(w.ownEntry.definition, '');
		if (w.relatedEntries.length) md.push(mdList(w.relatedEntries), '');
	}

	md.push('## The Encyclopedia', '');
	for (const section of encyclopediaSection) {
		md.push(`### ${cap(section.category)}`, '');
		for (const e of section.entries) {
			md.push(`#### ${e.title}`, '');
			if (e.aliases.length) md.push(`Also called: ${e.aliases.join(', ')}.`, '');
			md.push(e.definition, '');
			if (e.related.length) md.push(`See also: ${e.related.join(', ')}.`, '');
		}
	}

	md.push('## The Bestiary', '');
	for (const s of bestiarySection) {
		md.push(`### ${s.name}`, '');
		const dataParts = [
			`**Element:** ${s.elementName}`,
			`**Home world:** ${s.homeWorldName}`,
		];
		if (s.otherWorlds.length) dataParts.push(`**Other generator worlds:** ${s.otherWorlds.join(', ')}`);
		dataParts.push(`**Body plan:** ${s.bodyPlanName}`);
		dataParts.push(`**Covering:** ${s.coveringName}`);
		dataParts.push(`**Height:** ${s.heightCm[0]} to ${s.heightCm[1]} cm`);
		dataParts.push(`**Weight:** ${s.weightKg[0]} to ${s.weightKg[1]} kg`);
		dataParts.push(`**Lifespan:** ${s.lifespanName}`);
		dataParts.push(`**Diet:** ${s.dietName}`);
		if (s.isNonCorporeal) dataParts.push(`**Corporeality:** ${s.corporealityName}`);
		md.push(dataParts.join(' · '), '');
		md.push(s.definition, '');
		md.push(s.description, '');
		if (s.biomeNiche) md.push(`Niche: ${s.biomeNiche}.`, '');
		if (s.topTraits.length) md.push(`Its most pronounced traits are ${joinSerial(s.topTraits)}.`, '');
		if (s.signature) md.push(`**${s.signature.name}.** ${s.signature.description}`, '');
		if (s.related.length) md.push(`See also: ${s.related.join(', ')}.`, '');
	}

	md.push('## Index of Names', '');
	for (const item of indexItems) {
		if (item.isAlias) {
			md.push(`- ${item.name}, see ${item.targetTitle} (alias)`);
		} else {
			md.push(`- ${item.name} (${item.kind}, ${item.section})`);
		}
	}
	md.push('');

	const markdown = md.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

	// ================= render: text (byte-identical twin) =================

	const text = markdown;

	// ================= render: HTML =================

	function esc(s) {
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	// Convert the markdown body into semantic HTML by walking the same
	// structured data rather than re-parsing markdown, so the two stay in
	// lockstep by construction.
	const h = [];
	h.push(`<h1>${esc(title)}</h1>`);
	h.push(`<p>${esc(preamble)}</p>`);
	h.push(`<h2>A note for readers that are machines</h2>`);
	h.push(`<p>${esc(machineNote)}</p>`);

	h.push(`<h2>${esc(tourSection.heading)}</h2>`);
	for (const beat of tourSection.beats) {
		h.push(`<h3>${esc(beat.title)}</h3>`);
		h.push(`<p><strong>${esc(beat.eraName)}.</strong> Worlds: ${esc(beat.worldNames.join(', '))}.</p>`);
		h.push(`<p>${esc(beat.prose)}</p>`);
	}

	h.push(`<h2>The Chronicle</h2>`);
	for (const { era, events } of chronicleSection) {
		h.push(`<h3>${esc(era.name)}</h3>`);
		h.push(`<p>${esc(era.definition)}</p>`);
		if (events.length) {
			h.push('<ol>');
			for (const ev of events) {
				const planetsPart = ev.planetNames.join(', ');
				const firmnessPart = ev.firmness !== 'firm' ? `, ${ev.firmness === 'era-only' ? 'conjectural' : ev.firmness}` : '';
				h.push(`<li><strong>${esc(ev.title)}</strong> (${esc(planetsPart)}${esc(firmnessPart)})`);
				for (const q of ev.quotes) {
					h.push(`<blockquote>"${esc(q.text)}" (${esc(q.worldName)}, paragraph ${q.paragraph})</blockquote>`);
				}
				if (ev.entryTitle) h.push(`<p>See also: ${esc(ev.entryTitle)}</p>`);
				h.push('</li>');
			}
			h.push('</ol>');
		}
	}

	h.push('<h2>The Worlds</h2>');
	for (const w of worldsSection) {
		const p = w.planet;
		h.push(`<h3>${esc(p.name)}</h3>`);
		h.push(
			`<p><strong>Element:</strong> ${esc(cap(p.element))} · <strong>Terrain:</strong> ${esc(p.physical.terrainLabel)} · <strong>Size:</strong> ${esc(p.physical.sizeVsEarth)}x Earth · <strong>Radius:</strong> ${esc(p.physical.radiusKm.toLocaleString('en-US'))} km · <strong>Gravity:</strong> ${esc(p.physical.gravityVsEarth)}x Earth · <strong>Temperature:</strong> ${esc(p.physical.temperatureC.low)} to ${esc(p.physical.temperatureC.high)} °C</p>`
		);
		h.push(`<blockquote>${esc(p.report.unit)} report</blockquote>`);
		h.push(`<h4>History of ${esc(p.name)}</h4>`);
		for (const chapter of w.chapters) {
			h.push(`<p>[${esc(chapter.eraLabel)}] ${esc(chapter.text.trim())}</p>`);
		}
		h.push('<h4>Native species</h4>');
		h.push(`<p>${w.nativeSpeciesNames.length ? esc(w.nativeSpeciesNames.join(', ')) : 'None recorded.'}</p>`);
		h.push(`<h4>Encyclopedia entries about ${esc(p.name)}</h4>`);
		if (w.ownEntry) h.push(`<p>${esc(w.ownEntry.definition)}</p>`);
		if (w.relatedEntries.length) {
			h.push('<ul>');
			for (const t of w.relatedEntries) h.push(`<li>${esc(t)}</li>`);
			h.push('</ul>');
		}
	}

	h.push('<h2>The Encyclopedia</h2>');
	for (const section of encyclopediaSection) {
		h.push(`<h3>${esc(cap(section.category))}</h3>`);
		for (const e of section.entries) {
			h.push(`<h4>${esc(e.title)}</h4>`);
			if (e.aliases.length) h.push(`<p>Also called: ${esc(e.aliases.join(', '))}.</p>`);
			h.push(`<p>${esc(e.definition)}</p>`);
			if (e.related.length) h.push(`<p>See also: ${esc(e.related.join(', '))}.</p>`);
		}
	}

	h.push('<h2>The Bestiary</h2>');
	for (const s of bestiarySection) {
		h.push(`<h3>${esc(s.name)}</h3>`);
		const dataParts = [
			`<strong>Element:</strong> ${esc(s.elementName)}`,
			`<strong>Home world:</strong> ${esc(s.homeWorldName)}`,
		];
		if (s.otherWorlds.length) dataParts.push(`<strong>Other generator worlds:</strong> ${esc(s.otherWorlds.join(', '))}`);
		dataParts.push(`<strong>Body plan:</strong> ${esc(s.bodyPlanName)}`);
		dataParts.push(`<strong>Covering:</strong> ${esc(s.coveringName)}`);
		dataParts.push(`<strong>Height:</strong> ${esc(s.heightCm[0])} to ${esc(s.heightCm[1])} cm`);
		dataParts.push(`<strong>Weight:</strong> ${esc(s.weightKg[0])} to ${esc(s.weightKg[1])} kg`);
		dataParts.push(`<strong>Lifespan:</strong> ${esc(s.lifespanName)}`);
		dataParts.push(`<strong>Diet:</strong> ${esc(s.dietName)}`);
		if (s.isNonCorporeal) dataParts.push(`<strong>Corporeality:</strong> ${esc(s.corporealityName)}`);
		h.push(`<p>${dataParts.join(' · ')}</p>`);
		h.push(`<p>${esc(s.definition)}</p>`);
		h.push(`<p>${esc(s.description)}</p>`);
		if (s.biomeNiche) h.push(`<p>Niche: ${esc(s.biomeNiche)}.</p>`);
		if (s.topTraits.length) h.push(`<p>Its most pronounced traits are ${esc(joinSerial(s.topTraits))}.</p>`);
		if (s.signature) h.push(`<p><strong>${esc(s.signature.name)}.</strong> ${esc(s.signature.description)}</p>`);
		if (s.related.length) h.push(`<p>See also: ${esc(s.related.join(', '))}.</p>`);
	}

	h.push('<h2>Index of Names</h2>');
	h.push('<ul>');
	for (const item of indexItems) {
		if (item.isAlias) {
			h.push(`<li>${esc(item.name)}, see ${esc(item.targetTitle)} (alias)</li>`);
		} else {
			h.push(`<li>${esc(item.name)} (${esc(item.kind)}, ${esc(item.section)})</li>`);
		}
	}
	h.push('</ul>');

	const html = [
		'<!doctype html>',
		'<html lang="en">',
		'<head>',
		'<meta charset="utf-8">',
		'<meta name="viewport" content="width=device-width, initial-scale=1">',
		`<title>${esc(title)}</title>`,
		'<style>',
		'body{font-family:Georgia,serif;max-width:52rem;margin:2rem auto;padding:0 1.5rem;line-height:1.5;color:#1a1a1a;background:#fdfdfb;}',
		'h1,h2,h3,h4{font-family:Georgia,serif;line-height:1.2;}',
		'blockquote{margin:0.5rem 0;padding:0.25rem 1rem;border-left:3px solid #999;color:#333;}',
		'ol,ul{padding-left:1.5rem;}',
		'</style>',
		'</head>',
		'<body>',
		h.join('\n'),
		'</body>',
		'</html>',
	].join('\n');

	// ================= render: JSON bundle =================

	const jsonBundle = {
		version,
		sources: {
			encyclopedia: encyclopedia.version,
			chronicle: chronicle.version,
			tour: tour.version,
			ratified: ratified.version,
			registries: registriesData.version,
		},
		preamble,
		machineNote,
		tour: tourSection,
		chronicle: chronicleSection,
		worlds: worldsSection,
		entries: encyclopediaSection,
		species: bestiarySection,
		aliases: indexItems.filter((i) => i.isAlias),
	};

	const json = JSON.stringify(jsonBundle, null, 2) + '\n';

	// ================= render: llms.txt =================

	const llms = [
		'# Encyclopedia Xalia',
		'',
		`Encyclopedia Xalia is the complete published canon of the world of Xalia: fourteen worlds, their histories, the undated Chronicle of eras and events, the Encyclopedia of named concepts, and the Bestiary of every ratified Xalian species. This file points to the Codex, the single document that carries all of it, alongside the site's interactive Encyclopedia.`,
		'',
		'## Docs',
		'',
		`- [Codex (Markdown)](${URLS.md}): the complete canon, one file, machine readable`,
		`- [Codex (plain text)](${URLS.txt}): byte-identical twin for importers that reject Markdown`,
		`- [Codex (HTML)](${URLS.html}): script-free semantic HTML twin`,
		`- [Codex (JSON)](${URLS.json}): the structured data the Codex was built from`,
		`- [Encyclopedia Xalia (site)](${URLS.encyclopedia}): the interactive reading room`,
		'',
	].join('\n');

	return { markdown, text, html, json, llms, warnings };
}

module.exports = { build };

if (require.main === module) {
	const result = build();
	const outDir = path.join(ROOT, 'my-app', 'public', 'lore');
	fs.mkdirSync(outDir, { recursive: true });
	fs.writeFileSync(path.join(outDir, 'xalia.md'), result.markdown);
	fs.writeFileSync(path.join(outDir, 'xalia.txt'), result.text);
	fs.writeFileSync(path.join(outDir, 'xalia.html'), result.html);
	fs.writeFileSync(path.join(outDir, 'xalia.json'), result.json);
	fs.writeFileSync(path.join(ROOT, 'my-app', 'public', 'llms.txt'), result.llms);

	const wordCount = result.markdown.trim().split(/\s+/).length;
	console.log(`Wrote Codex: ${wordCount} words.`);
	if (result.warnings.length) {
		console.log(`${result.warnings.length} warning(s):`);
		result.warnings.forEach((w) => console.log(`  - ${w}`));
	} else {
		console.log('No warnings.');
	}
}
