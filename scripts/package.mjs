import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const outputDirectory = resolve('public');
const outputPath = resolve(outputDirectory, `${packageJson.name}-${packageJson.version}.vsix`);

mkdirSync(outputDirectory, { recursive: true });
execFileSync(command, ['run', 'compile'], { stdio: 'inherit' });
execFileSync(npx, ['--no-install', 'vsce', 'package', '--out', outputPath], { stdio: 'inherit' });

console.log(`Created ${outputPath}`);
