// Stop: die Testsuite läuft in ~1,5s durch — billig genug, um sie am Ende
// jedes Turns laufen zu lassen, statt den Fehler erst in der CI zu sehen.
//
// Läuft nur an, wenn seit dem letzten Lauf tatsächlich Quellcode angefasst
// wurde; sonst kostet jedes "danke, passt" unnötig Zeit.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { readHookInput } from './_input.mjs';

const input = await readHookInput();

// Schutz vor der Schleife: blockt der Hook, läuft Claude weiter und stoppt
// erneut — beim zweiten Mal nicht noch einmal blocken.
if (input?.stop_hook_active) process.exit(0);

const root = input?.cwd || process.cwd();
const stamp = resolve(root, 'node_modules/.cache/claude-hooks/last-test-run');

// Neuester Änderungszeitpunkt unter src/ — ohne git, das ist schneller.
const listing = spawnSync(
  process.execPath,
  [
    '-e',
    `const {readdirSync,statSync}=require('fs'),{join}=require('path');
     let newest=0;
     const walk=(d)=>{for(const e of readdirSync(d,{withFileTypes:true})){
       const p=join(d,e.name);
       if(e.isDirectory()){walk(p);continue}
       if(!/\\.(js|jsx)$/.test(e.name))continue;
       const m=statSync(p).mtimeMs; if(m>newest)newest=m;
     }};
     walk('src'); console.log(newest);`,
  ],
  { cwd: root, encoding: 'utf8' },
);

const newest = Number(listing.stdout?.trim() || 0);
const lastRun = existsSync(stamp) ? Number(readFileSync(stamp, 'utf8')) : 0;
if (newest && newest <= lastRun) process.exit(0);

const run = spawnSync(process.execPath, ['--test'], { cwd: root, encoding: 'utf8' });

if (run.status === 0) {
  try {
    mkdirSync(dirname(stamp), { recursive: true });
    writeFileSync(stamp, String(Date.now()));
  } catch {
    // Stempel ist nur Optimierung — wenn er nicht geht, laufen die Tests eben immer.
  }
  process.exit(0);
}

// Der spec-Reporter hängt am Ende einen Abschnitt "failing tests:" an, in dem
// jeder Fehlschlag mit Datei, Zeile und Diff steht. Nur den zurückgeben —
// die 120 bestandenen Tests davor helfen niemandem.
const output = `${run.stdout || ''}${run.stderr || ''}`;
const marker = output.lastIndexOf('failing tests:');
const failures = (marker === -1 ? output.slice(-4000) : output.slice(marker))
  .split('\n')
  .slice(0, 80)
  .join('\n');

process.stderr.write(
  `npm test schlägt fehl:\n\n${failures}\n\n` +
    'Bitte beheben — mit diesen Fehlern schlägt auch die CI fehl.\n',
);
process.exit(2);
