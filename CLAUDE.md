# Gold&Geld — Hinweise für Claude

Lokal gespeicherte PWA für Verträge, Abos und Ausgaben. React 19, Vite 7,
Tailwind 4, reines JavaScript (kein TypeScript). Kein Backend, kein Konto.

## Befehle

```
npm run dev      # Entwicklungsserver
npm test         # node --test, läuft in ~1,5s
npm run lint     # ESLint über das ganze Projekt (~10s)
npm run build    # Produktionsbuild nach dist/
```

Die CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) fährt lint → test → build.
Genau diese drei müssen durchlaufen.

## Sprache

- **Kommentare und Oberflächentexte: Deutsch.** Die ganze Codebasis ist so
  geschrieben, auch die Abschnittsbalken (`// ─── Geld ───`).
- **Commit-Nachrichten: Englisch**, Conventional Commits (`feat(expenses): …`).
- Jeder sichtbare Text läuft über `translations` in
  [src/lib/i18n.js](src/lib/i18n.js) — **immer in `de` und `en` zugleich**.
  [src/lib/i18n.test.js](src/lib/i18n.test.js) besteht auf gleichen Schlüsseln,
  gleicher Form (String / Funktion / Array) und gleicher Argumentzahl.

## Daten — der empfindlichste Teil

Alles liegt ausschließlich in `localStorage` und IndexedDB auf dem Gerät. Es gibt
keinen Server, von dem sich ein kaputter Stand wiederherstellen ließe.

Wer die Form gespeicherter Daten ändert
([entryStore](src/lib/entryStore.js), [expenseStore](src/lib/expenseStore.js),
[accountStore](src/lib/accountStore.js), [documentStore](src/lib/documentStore.js),
[budget](src/lib/budget.js), [vault](src/lib/vault.js)), muss dreierlei mitziehen:

1. [src/lib/backup.js](src/lib/backup.js) — neue Felder ex- und importieren,
   nötigenfalls `BACKUP_VERSION` erhöhen. Sicherungen der Version 1 müssen
   lesbar bleiben.
2. Ein Lesepfad für alte Daten ohne das neue Feld (Default oder Migration).
   Bestehende Installationen haben den alten Stand noch im Browser liegen.
3. Die Tabelle „Wo die Daten liegen" in [README.md](README.md).

Beträge werden in ihrer Erfassungswährung gespeichert; USD ist nur die
Zwischengröße zum Rechnen ([src/lib/money.js](src/lib/money.js)).

## Aufbau

| Ort | Was |
|---|---|
| [src/lib/](src/lib/) | Ablage, Rechnen, Formatieren — ohne React, deshalb testbar |
| [src/ui/](src/ui/) | geteilte Bausteine, gebündelt über [src/ui/index.js](src/ui/index.js) |
| [src/features/expenses/](src/features/expenses/) | der Bereich Ausgaben |
| [src/App.jsx](src/App.jsx) | Verträge, Kalender, Auswertung, Einstellungen |

`App.jsx` ist mit ~4700 Zeilen gewachsen. Neues Geteiltes gehört nach `src/ui/`,
neue Bereiche nach `src/features/` — nicht dazu.

`dist/` ist Build-Ausgabe und wird bei jedem Build überschrieben, `sw.js` darin
zusätzlich von [vite.config.js](vite.config.js). Änderungen gehören nach `src/`
oder `public/`.

## Tests

`node --test`, Testdateien liegen neben dem Code (`*.test.js`). Es gibt weder
Vitest noch jsdom noch Testing Library — **getestet wird nur Logik ohne React**.
Für eine neue Rechnung, ein Format oder eine Ablage gehört ein Test dazu; für
Komponenten gibt es keinen Weg, also auch keine Erwartung.

## Gestaltung

[design-language.html](design-language.html) ist die Quelle, nicht das Gefühl.

- Farben nur als semantische Marken (`surface`, `border`, `ink`, `accent`) aus
  [src/index.css](src/index.css); Klassenrezepte stehen in
  [src/ui/tokens.js](src/ui/tokens.js) (`CARD`, `PANEL`, `btn(…)`). Keine
  Tailwind-Palettenwerte wie `bg-gray-100` direkt im Markup.
- Farbe ist dem Status vorbehalten (aktiv, pausiert, Testphase, Frist), der
  Akzent nur Schaltern und Fokusringen.
- Bewegung ausschließlich über CSS-Keyframes; JS misst nur und setzt Inline-
  Shorthands ([src/lib/motion.js](src/lib/motion.js)). `prefers-reduced-motion`
  schaltet alles auf sofort.

## Hooks

In [.claude/settings.json](.claude/settings.json) hängen vier Hooks, beschrieben
in [.claude/hooks/README.md](.claude/hooks/README.md): ESLint auf der gerade
geänderten Datei, eine Erinnerung bei Änderungen an der Datenschicht, eine
Sperre für erzeugte Dateien und `npm test` am Ende des Turns.
