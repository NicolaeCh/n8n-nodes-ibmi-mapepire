import { readFileSync } from 'node:fs';

const pkg = JSON.parse(
	readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

const safeName = pkg.name.replace(/^@/, '').replaceAll('/', '-');
const filename = `${safeName}-${pkg.version}.tgz`;

if (process.argv[2] === 'release') {
	console.log(`release/${filename}`);
} else if (process.argv[2] === 'stem') {
	console.log(`${safeName}-${pkg.version}`);
} else {
	console.log(filename);
}
