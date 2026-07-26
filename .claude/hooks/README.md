# Hooks

Konfiguriert in [../settings.json](../settings.json). Jeder Hook bekommt ein
JSON auf stdin (`cwd`, `tool_name`, `tool_input`, bei PostToolUse zusätzlich
`tool_response`) und meldet sich über Exit-Code oder JSON auf stdout zurück.

| Datei | Ereignis | Was passiert |
|---|---|---|
| [guard-paths.mjs](guard-paths.mjs) | PreToolUse `Edit\|Write` | Lehnt Änderungen an `dist/`, `node_modules/` und `package-lock.json` ab — erzeugte Dateien, jede Änderung dort ist beim nächsten Build weg. |
| [lint-file.mjs](lint-file.mjs) | PostToolUse `Edit\|Write` | ESLint nur auf der geänderten Datei (~3s statt ~10s fürs ganze Projekt). Bei Fehlern Exit 2, der Bericht geht zurück an Claude. |
| [store-schema-reminder.mjs](store-schema-reminder.mjs) | PostToolUse `Edit\|Write` | Meldet sich, wenn eine Datei der Datenschicht angefasst wurde, und erinnert an `backup.js`, `BACKUP_VERSION`, Migration und die Tabelle in der README. Blockt nie. |
| [run-tests.mjs](run-tests.mjs) | Stop | `node --test` am Ende des Turns, aber nur wenn seit dem letzten Lauf etwas unter `src/` geändert wurde. Bei Fehlern Exit 2 mit dem Abschnitt „failing tests". |

[_input.mjs](_input.mjs) hält das Lesen von stdin und die Pfadauflösung, die
alle vier teilen. Pfade werden auf POSIX-Schreibweise relativ zum Projektstamm
gebracht, damit dieselben Muster unter Windows und in der CI greifen.

## Anpassen und abschalten

`/hooks` zeigt und bearbeitet die Konfiguration. Einzelne Hooks lassen sich
abschalten, indem man den Eintrag aus `settings.json` nimmt; `disableAllHooks`
in den Einstellungen schaltet alle ab.

Nach einer Änderung an `settings.json` lässt sich ein Hook so prüfen, ohne auf
den nächsten Turn zu warten:

```bash
ROOT="$(pwd)"
echo "{\"cwd\":\"$ROOT\",\"tool_input\":{\"file_path\":\"$ROOT/src/lib/expenseStore.js\"}}" \
  | node .claude/hooks/store-schema-reminder.mjs
```

Der Stempel, mit dem `run-tests.mjs` unnötige Läufe überspringt, liegt unter
`node_modules/.cache/claude-hooks/last-test-run`. Löschen erzwingt den nächsten
Lauf.
