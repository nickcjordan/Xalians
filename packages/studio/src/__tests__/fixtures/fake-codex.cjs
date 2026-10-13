// A stand-in for `codex exec` used by the studio tests (STUDIO_CODEX_BIN). It reads the prompt on
// stdin, writes output.png into the -C folder, writes the --output-last-message file and prints a
// "tokens used" line. FAKE_CODEX_MODE=fail exits 1; =nooutput writes no image.
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const at = (flag) => args[args.indexOf(flag) + 1];
const dir = at('-C');
const reply = at('--output-last-message');
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (stdin += c));
process.stdin.on('end', () => {
	const mode = process.env.FAKE_CODEX_MODE || 'ok';
	fs.writeFileSync(path.join(dir, 'seen-prompt.txt'), stdin);
	fs.writeFileSync(path.join(dir, 'seen-args.json'), JSON.stringify({ args, cwd: process.cwd(), files: fs.readdirSync(dir) }));
	if (mode === 'fail') {
		console.error('ERROR: image generation is unavailable');
		process.exit(1);
	}
	const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(stdin + Math.random())]);
	const original = path.join(dir, '..', 'generated-original.png');
	if (mode !== 'nooutput') fs.writeFileSync(path.join(dir, 'output.png'), png);
	fs.writeFileSync(reply, `${original}\n`);
	console.log('codex');
	console.log('tokens used');
	console.log('12,345');
});
