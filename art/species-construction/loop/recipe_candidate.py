"""recipe.py candidate: one call per candidate.

Runs, blocking, build (pins and cache respected), loop_tools check, packet (which also writes measured.json and
the seam check against the baseline packet), diff against the baseline packet, and contain for every step the
candidate changed or added. Writes candidate.json into the packet and prints one compact JSON summary.
Progress is a few brief lines; the JSON summary is the last line of output.
"""
import contextlib
import datetime
import io
import json
import re
import sys
import time
import types
from pathlib import Path

CHECK_MINUTES = 0.1     # measured on the 2026-10-02 test run; used by --dry-run only
PACKET_MINUTES = 1.5    # packet incl. posed fit, measured and seam check (0.9 with the pose cache hit, more when the pose is rebuilt)
DIFF_MINUTES = 0.2


def changed_steps(rc, recipe, base_path):
    """{step id: 'changed'|'added'} against the base the candidate was cut from: its derivedFrom block, else --base, else
    the species' live recipe.json."""
    block = recipe.data.get('derivedFrom')
    source = 'derivedFrom'
    if base_path:
        base = rc.load(base_path)
        prints = {s['id']: rc.step_fingerprint(s) for s in base.steps}
        source = str(base_path)
    elif block:
        prints = block['steps']
    else:
        live = rc.ROOT/'docs/design/species-construction'/recipe.species/'recipe.json'
        if not live.is_file():
            rc.fail('no derivedFrom block and no --base; cannot tell which steps the candidate changed')
        prints = {s['id']: rc.step_fingerprint(s) for s in rc.load(live).steps}
        source = live.as_posix()
    out = {}
    for step in recipe.steps:
        if step['id'] not in prints:
            out[step['id']] = 'added'
        elif rc.step_fingerprint(step) != prints[step['id']]:
            out[step['id']] = 'changed'
    return out, source


def dry_run(rc, recipe, cache, plan, changed, packet_name, args):
    rc.print_plan(recipe, plan, cache)
    est = rc.estimate(recipe, cache, plan)
    build = est['wallMinutes']
    total = build+CHECK_MINUTES+PACKET_MINUTES+DIFF_MINUTES
    print(f"contain: {', '.join(changed) or 'nothing (no changed or added steps)'}")
    print(f"plan: build ~{build} min, check ~{CHECK_MINUTES}, packet+measured+seams ~{PACKET_MINUTES}, diff ~{DIFF_MINUTES}, "
          f"contain ~{.3*len(changed):.1f}; total ~{total+.3*len(changed):.1f} min")
    print(f"packet: {packet_name or 'untracked/.../loop/packets/<assembly named at build>'}")
    if total > 9:
        print('over about 9 minutes: run it with run_in_background (a foreground Bash call times out at 10 minutes)')


def criteria_changes(before, after):
    out = []
    for cid in sorted(after, key=lambda k: (k[0] != 'R', k)):
        a, b = after[cid], before.get(cid)
        if b is None:
            continue  # a criterion the baseline packet predates; listed under measuredNew
        elif b.get('value') != a.get('value') or b.get('result') != a.get('result'):
            out.append({'id': cid, 'region': a.get('region'), 'before': b.get('value'), 'after': a.get('value'),
                        'bound': bound(a), 'result': [b.get('result'), a.get('result')]})
    return out


def bound(c):
    if 'expected' in c:
        return {'expected': c['expected']}
    return {k: c[k] for k in ('min', 'max') if c.get(k) is not None}


def containment_rows(report):
    rows = {**report['foreign'], 'outsideAllZones': report['outsideAllZones']}
    worst = sorted(rows.items(), key=lambda kv: -kv[1].get('excess', kv[1]['max']))
    return [{'region': r, 'max': e['max'], 'allowance': e.get('allowance'), 'excess': e.get('excess'), 'flagged': e.get('flagged')}
            for r, e in worst[:3] if e['max'] > 0]


def hint(own, criteria, regions, seams, contained):
    parts = []
    by = {}
    for c in criteria:
        by.setdefault(c['region'], []).append(c)
    for region in sorted(by, key=lambda r: (r != own, r)):
        rows = by[region]
        now_pass = sum(1 for c in rows if c['result'][0] != 'pass' and c['result'][1] == 'pass')
        now_fail = sum(1 for c in rows if c['result'][0] == 'pass' and c['result'][1] != 'pass')
        text = f'{region} measured: {len(rows)} changed'
        if now_pass or now_fail:
            text += f' ({now_pass} newly passing, {now_fail} newly failing)'
        parts.append(text)
    if seams:
        parts.append('seams flagged at '+', '.join(sorted({f"{s['joint']}/{s['view']} {s['kind']}" for s in seams})))
    else:
        parts.append('no new seams flagged')
    bad = sorted({r['region'] for c in contained.values() for r in c.get('worst', []) if r.get('flagged')})
    parts.append('containment over allowance in '+', '.join(bad) if bad else 'containment within allowance')
    big = sorted(regions.items(), key=lambda kv: -kv[1])[:3]
    big = [(r, m) for r, m in big if m >= .0005]
    parts.append('picture change '+', '.join(f'{r} {m:.4f}' for r, m in big) if big else 'picture change below .0005 everywhere')
    return '; '.join(parts)


def find_containment(recipe, out_name):
    """A containment report already written for this output (outputs are immutable, so it is reused), else None."""
    for path in [recipe.work/out_name/'containment.json', recipe.work/f'{out_name}.containment.json']:
        if path.is_file():
            report = json.loads(path.read_text(encoding='utf-8'))
            if report.get('output') == out_name and 'verdict' in report:
                return path, report
    return None, None


def log_reason(recipe, text):
    """The error line a failed Blender job left in its log (a failed assembly prints nothing else)."""
    m = re.search(r'assembly failed \(([^)]+)\)', text)
    log = recipe.work/f'{m.group(1)}.log' if m else None
    if log and log.is_file():
        lines = [l for l in log.read_text(encoding='utf-8', errors='replace').splitlines() if l.startswith(('ValueError', 'RuntimeError', 'Error'))]
        if lines:
            return ' | '+lines[-1][:300]
    return ''


def run(args, rc):
    started = time.time()
    recipe = rc.load(args.recipe)
    cache = rc.Cache(recipe)
    base_packet = Path(args.baseline)
    if not (base_packet/'index.json').is_file():
        base_packet = recipe.work/'loop/packets'/args.baseline
    if not (base_packet/'index.json').is_file():
        rc.fail(f'--baseline {args.baseline}: not a packet directory (no index.json)')
    base_packet = base_packet.resolve()
    base_measured = json.loads((base_packet/'measured.json').read_text(encoding='utf-8'))
    changed, changed_source = changed_steps(rc, recipe, args.base)
    plan, keys = rc.make_plan(recipe, cache)
    named = args.assembly_name if args.assembly_name not in (None, 'auto') else None
    if args.dry_run:
        dry_run(rc, recipe, cache, plan, changed, named, args)
        return
    species = rc.species_flags(recipe)
    summary = {'recipe': recipe.path.name, 'baselinePacket': str(base_packet), 'baselineAssembly': base_packet.name,
               'region': args.region, 'changedSteps': changed, 'changedSource': changed_source, 'stage': 'start', 'ok': False}
    warnings = []
    if args.region:
        for sid in changed:
            if args.region not in recipe.byid[sid].get('regions', []):
                warnings.append(f"step {sid} is {changed[sid]} but not tagged {args.region}")
    if warnings:
        summary['warnings'] = warnings
    packet = [None]

    def finish(code, message=None):
        if message:
            summary['failure'] = message
        summary['wallMinutes'] = round((time.time()-started)/60, 1)
        target = packet[0] or recipe.work/'loop/packets'/f"unbuilt-{recipe.path.stem}-{datetime.datetime.now():%Y%m%d-%H%M%S}"
        target.mkdir(parents=True, exist_ok=True)
        (target/'candidate.json').write_bytes((json.dumps(summary, indent=1)+'\n').encode('utf-8'))
        print(json.dumps(summary, separators=(',', ':')), flush=True)
        sys.exit(code)

    def stage(name, fn):
        summary['stage'] = name
        try:
            return fn()
        except SystemExit as error:
            code = str(error.code)
            reason = log_reason(recipe, code)
            finish(2, f'{name}: '+(code.splitlines()[0]+reason if reason else ' / '.join(code.splitlines()[:12])))

    # ---- build
    pinned = rc.plan_changed(plan)
    if pinned:
        summary['stage'] = 'build'
        finish(2, 'pin refusal, a pinned input changed after its output was built: '
               + '; '.join(f'{sid} {key} {state}' for sid, key, state in pinned)
               + '. Copy the new bytes to a new name and point the step at it, or restore the pinned bytes.')
    todo = [s['id'] for s in recipe.order if not plan[s['id']]['dir']]+(['assembly'] if not plan['assembly']['dir'] else [])
    est = rc.estimate(recipe, cache, plan)
    rc.say(f"build: {', '.join(todo) or 'nothing (all cached)'}; about {est['wallMinutes']} min")
    built, name, head, body, asm_seconds = stage('build', lambda: rc.execute(recipe, plan, keys, cache, assembly_name=named))
    entries = cache._load()['steps']
    summary['build'] = {'assembly': name, 'head': head, 'body': body,
                        'rebuilt': {sid: {'dir': d, 'minutes': round((entries.get(keys[sid]) or {}).get('seconds', 0)/60, 1)}
                                    for sid, d in built.items()},
                        'assemblyMinutes': round(asm_seconds/60, 1) if asm_seconds else 0,
                        'cachedSteps': sum(1 for s in plan if s != 'assembly' and plan[s]['dir'])}
    summary['assembly'] = name
    summary['componentDirs'] = {recipe.byid[sid].get('component', sid): built.get(sid) or plan[sid]['dir'] for sid in changed}
    summary['componentDirs'].update(head=head, body=body)
    packet[0] = recipe.work/'loop/packets'/name
    summary['packet'] = str(packet[0])

    # ---- technical check
    rc.say(f'check {name}')
    check = json.loads(stage('check', lambda: rc.tool('check', *species, name)).strip().splitlines()[-1])
    reasons = []
    if check['components'] != 1:
        reasons.append(f"{check['components']} components (must be 1)")
    if check['nonManifoldEdges']:
        reasons.append(f"{check['nonManifoldEdges']} non-manifold edges")
    if check['heightSpread']:
        reasons.append(f"height spread {check['heightSpread']}")
    if check['groundSpread']:
        reasons.append(f"ground spread {check['groundSpread']}")
    summary['check'] = {'pass': bool(check['pass']), 'reasons': reasons,
                        **{k: check[k] for k in ('components', 'nonManifoldEdges', 'vertices', 'removedFragments', 'heightSpread', 'groundSpread')}}
    if not check['pass']:
        finish(3, 'technical check failed: '+'; '.join(reasons or ['see check']))

    # ---- packet (renders, posed fit, measured.json, seam check against the baseline packet)
    if (packet[0]/'index.json').is_file() and (packet[0]/'seams.json').is_file():
        rc.say(f'packet {name} exists, reused')
    else:
        rc.say(f'packet {name} (renders, posed fit, measured, seams against {base_packet.name}; several minutes)')
        stage('packet', lambda: rc.tool('packet', *species, name, str(packet[0]), '--baseline', str(base_packet)))
    measured = json.loads((packet[0]/'measured.json').read_text(encoding='utf-8'))
    summary['measuredChanged'] = criteria_changes(base_measured, measured)
    summary['measuredNew'] = {k: {'value': v['value'], 'result': v['result'], 'bound': bound(v)}
                              for k, v in measured.items() if k not in base_measured}
    summary['measuredFailing'] = sorted(k for k, v in measured.items() if v['result'] != 'pass')
    seams = json.loads((packet[0]/'seams.json').read_text(encoding='utf-8'))
    flat = []
    for f in seams['flagged']:
        for m in f['metrics']:
            flat.append({'joint': f['joint'], 'view': f['view'], 'kind': m, 'value': f['values'][m], 'where': f['where'].get(m)})
    summary['seamsMode'] = seams['mode']
    summary['seamsNew'] = flat

    # ---- diff against the baseline packet
    rc.say(f'diff against {base_packet.name}')
    stage('diff', lambda: rc.tool('diff', *species, str(base_packet), str(packet[0])))
    diff = json.loads((packet[0]/'diff.json').read_text(encoding='utf-8'))
    summary['regionChange'] = {r: v['magnitude'] for r, v in diff['regionChange'].items()}
    summary['changedRegions'] = diff['changedRegions']

    # ---- geometry change per region against the baseline assembly (the judge's geometry carry, LOOP-v3 v3.9)
    owned = [r for r in (args.owned or args.region or '').split(',') if r]
    base_asm = recipe.work/base_packet.name
    try:
        import region_shift
        zones, cfg = rc.load_zones(recipe, None)
        rows = region_shift.shift(region_shift.assembly_glb(recipe.work, str(base_asm)), region_shift.assembly_glb(recipe.work, name),
                                  zones, cfg.get('frame', {}), owned)
        summary['regionShift'] = {r: v['max'] for r, v in rows.items()}
    except Exception as error:  # a missing shift only turns the geometry carry off for this candidate
        summary['regionShiftError'] = f'{type(error).__name__}: {error}'

    # ---- containment of every changed or added step
    summary['stage'] = 'contain'
    contained = {}
    for sid in changed:
        out_name = built.get(sid) or plan[sid]['dir']
        path, report = find_containment(recipe, out_name)
        if report is None:
            rc.say(f'contain {sid} ({out_name})')
            sink = io.StringIO()
            try:
                with contextlib.redirect_stdout(sink):
                    rc.cmd_contain(types.SimpleNamespace(recipe=str(recipe.path), step=sid, out_dir=None, zones=None, no_reference=False))
                path = Path(json.loads(sink.getvalue().strip().splitlines()[-1])['written'])
                report = json.loads(path.read_text(encoding='utf-8'))
            except SystemExit as error:
                contained[sid] = {'error': str(error.code)}
                continue
        contained[sid] = {'output': out_name, 'report': str(path), 'owned': report['ownedRegions'],
                          'rule': 'relative' if report['rule']['referenceStep'] else 'flat',
                          'reference': report['rule']['referenceStep'], 'flaggedRelative': report['verdict']['relative'],
                          'worst': containment_rows(report)}
    summary['containment'] = contained

    summary['stage'] = 'done'
    summary['ok'] = True
    summary['verdict'] = hint(args.region, summary['measuredChanged'], summary['regionChange'], flat, contained)
    finish(0)
