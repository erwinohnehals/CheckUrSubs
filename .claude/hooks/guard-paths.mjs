// PreToolUse (Edit|Write): verbietet Änderungen an erzeugten Dateien.
//
// dist/ entsteht bei jedem Build neu — vite.config.js schreibt dort sogar
// sw.js noch einmal um. Eine Änderung dort ist immer verloren, sobald jemand
// `npm run build` ausführt.

import { readHookInput, editedPath } from './_input.mjs';

const BLOCKED = [
  {
    test: (p) => p === 'dist' || p.startsWith('dist/'),
    why: 'dist/ ist Build-Ausgabe. Die Änderung gehört in src/, public/ oder vite.config.js — beim nächsten `npm run build` wird dist/ komplett überschrieben (inklusive sw.js, das der inject-sw-version-Plugin neu schreibt).',
  },
  {
    test: (p) => p === 'node_modules' || p.startsWith('node_modules/'),
    why: 'node_modules/ wird von npm verwaltet. Änderungen überlebt kein `npm ci`.',
  },
  {
    test: (p) => p === 'package-lock.json',
    why: 'package-lock.json wird von npm erzeugt. Stattdessen `npm install <paket>` ausführen.',
  },
];

const input = await readHookInput();
const path = editedPath(input);
if (!path) process.exit(0);

const hit = BLOCKED.find((rule) => rule.test(path));
if (!hit) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `${path}: ${hit.why}`,
    },
  }),
);
