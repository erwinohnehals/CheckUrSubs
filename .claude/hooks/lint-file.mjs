// PostToolUse (Edit|Write): ESLint nur für die gerade geänderte Datei.
//
// `npx eslint .` über das ganze Projekt dauert ~10s, eine einzelne Datei
// ~3s. Deshalb hier gezielt — die vollständige Prüfung macht die CI.
// eslint wird direkt aus node_modules gestartet, das spart die npx-Auflösung
// und umgeht die .cmd/.ps1-Shims unter Windows.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readHookInput, editedPath } from './_input.mjs';

const input = await readHookInput();
const path = editedPath(input);

// Nur JS/JSX, und nur was die eslint-Config auch abdeckt.
if (!/\.(js|jsx)$/.test(path)) process.exit(0);
if (path.startsWith('dist/') || path.startsWith('node_modules/')) process.exit(0);

const root = input?.cwd || process.cwd();
const eslint = resolve(root, 'node_modules/eslint/bin/eslint.js');
if (!existsSync(eslint)) process.exit(0); // vor `npm install` einfach still bleiben

const run = spawnSync(process.execPath, [eslint, '--format', 'stylish', path], {
  cwd: root,
  encoding: 'utf8',
});

if (run.status === 0 || run.status === null) process.exit(0);

// Exit 2 gibt stderr an Claude zurück, ohne den Turn abzubrechen.
process.stderr.write(
  `ESLint meldet Fehler in ${path}:\n\n${run.stdout || ''}${run.stderr || ''}\n` +
    'Bitte beheben, bevor es weitergeht — dieselben Regeln laufen in der CI.\n',
);
process.exit(2);
