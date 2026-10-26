import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// A local .env may select development for Express. Client release builds must
// still use production React and production dead-code elimination on every OS.
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const child = spawn(process.execPath, [vite, 'build', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});
child.once('error', () => {
  console.error('Could not start the client build. Check Node.js and installed dependencies.');
  process.exitCode = 1;
});
child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
