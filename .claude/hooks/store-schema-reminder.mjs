// PostToolUse (Edit|Write): Erinnerung bei Änderungen an der Datenschicht.
//
// Alle Daten dieser App liegen ausschließlich im Browser des Geräts. Wer die
// Form der gespeicherten Daten ändert, ohne backup.js und einen Migrationspfad
// mitzuziehen, verliert beim nächsten Wiederherstellen echte Nutzerdaten —
// es gibt kein Backend, das den Stand noch einmal liefern könnte.

import { readHookInput, editedPath } from './_input.mjs';

const STORES = [
  'src/lib/entryStore.js',
  'src/lib/expenseStore.js',
  'src/lib/accountStore.js',
  'src/lib/documentStore.js',
  'src/lib/budget.js',
  'src/lib/vault.js',
];

const input = await readHookInput();
const path = editedPath(input);

if (!STORES.includes(path)) process.exit(0);

process.stdout.write(
  JSON.stringify({
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        `${path} gehört zur persistenten Datenschicht (localStorage/IndexedDB, kein Backend). ` +
        'Falls sich die Form der gespeicherten Daten geändert hat, bitte prüfen: ' +
        '(1) src/lib/backup.js — werden die neuen Felder ex- und importiert, muss BACKUP_VERSION hoch? ' +
        '(2) Lesen alte gespeicherte Daten ohne das neue Feld weiterhin sauber (Migration/Default)? ' +
        '(3) Stimmt die Tabelle "Wo die Daten liegen" in README.md noch? ' +
        'Ist nichts davon betroffen, einfach weitermachen.',
    },
  }),
);
