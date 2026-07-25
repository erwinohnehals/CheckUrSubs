# Gold&Geld

Ein lokal gespeicherter Überblick über alles, was regelmäßig Geld kostet:
Versicherungen, Strom, Internet, Mobilfunk, Miete, Rundfunkbeitrag und Abos —
inklusive Vertragsdaten, Kündigungsfristen, Dokumenten und Portal-Zugängen.
Ohne Konto, ohne Backend.

![PWA](https://img.shields.io/badge/PWA-ready-blueviolet)
![React](https://img.shields.io/badge/React-19-61dafb)
![Vite](https://img.shields.io/badge/Vite-7-646cff)
![Storage](https://img.shields.io/badge/storage-local--only-green)

## Funktionen

- Summen pro Monat, Jahr und Tag, Abbuchungskalender und anstehende Zahlungen
- **Kündigungsfristen**: Vertragsende + Frist ergeben das Datum, bis zu dem
  gekündigt sein muss — inklusive Rollen auf das nächste Vertragsjahr bei
  automatischer Verlängerung
- **Vertragsdaten je Kategorie**: Versichertennummer, Versicherungsschein-Nr.,
  Zählernummer, MaLo-ID, Jahresverbrauch, Rufnummer, ICCID, Beitragsnummer,
  IBAN, Kennzeichen, HU-Termin und mehr
- **Eigene Felder** mit frei wählbarem Typ (Text, Zahl, Datum, Betrag, Link,
  geheim, mehrzeilig)
- **Dokumente**: Policen, Verträge und Rechnungen als Datei anhängen
- **Zugangsdaten**: Portal-Link, Benutzername und ein Passwort im
  verschlüsselten Tresor
- Auswertung nach Kategorie und Eintrag, Kostenverlauf über 3/6/12 Monate
- Mehrere Währungen mit zwischengespeicherten Wechselkursen
- Deutsch und Englisch
- CSV- und JSON-Export/-Import
- **Vollständige Sicherung** als eine Datei — mit Dokumenten und Einstellungen
- Installierbare PWA

## Wo die Daten liegen

Alles bleibt im Browser dieses Geräts — es gibt kein Konto und keine Synchronisation.

| Was | Wo | Schlüssel |
|---|---|---|
| Einträge, Vertragsdaten, eigene Felder | `localStorage` | `goldgeld.entries` |
| Dokumente (Blobs, max. 20 MB je Datei) | IndexedDB | `goldgeld` / `documents` |
| Tresor-Metadaten (Salt + Prüf-Token) | `localStorage` | `goldgeld.vault` |

Wer die Browserdaten der Seite löscht, löscht auch die Einträge.

## Sichern und wiederherstellen

Unter **Auswertung → Daten** stehen zwei Wege nebeneinander:

| | Enthält | Beim Einlesen |
|---|---|---|
| **Export** (CSV / JSON) | Einträge, beim JSON zusätzlich die Tresor-Metadaten | wird zum vorhandenen Bestand **hinzugefügt**, Dubletten übersprungen |
| **Sicherung** (JSON) | Einträge, Dokumente, Einstellungen (Sprache, Währung, Farbschema) und Tresor-Metadaten | **ersetzt** nach Rückfrage den gesamten Stand des Geräts |

Die Sicherung ist die Datei für den Ernstfall und für den Umzug auf ein anderes
Gerät. Beide Dateien liest derselbe Knopf (*Import → Datei wählen*) — eine
Sicherung wird an ihrem Format erkannt. Dokumente stecken als Base64 darin, die
Datei ist also etwa ein Drittel größer als die Dateien zusammen. Nach dem
Wiederherstellen lädt die Seite neu, damit Sprache und Farbschema greifen.

Daten aus der Vorgängerversion (`checkursubs.subscriptions`) werden beim ersten
Start automatisch übernommen.

## Passwort-Tresor

Passwörter werden mit **AES-GCM** verschlüsselt. Der Schlüssel wird per
**PBKDF2** (SHA-256, 250 000 Iterationen) aus einem Master-Passwort abgeleitet
und existiert nur im Speicher der laufenden Sitzung — nach einem Neuladen muss
erneut entsperrt werden. Gespeichert werden ausschließlich Salt, Iterationszahl
und ein verschlüsseltes Prüf-Token.

Daraus folgt:

- **Das Master-Passwort ist nicht wiederherstellbar.** Ist es weg, sind die
  gespeicherten Passwörter weg.
- Der JSON-Export enthält die verschlüsselten Passwörter samt Tresor-Metadaten.
  Auf einem anderen Gerät lassen sie sich mit demselben Master-Passwort öffnen.
- Beim Import in ein Profil, das bereits einen eigenen Tresor hat, werden die
  mitgelieferten Passwörter verworfen — sie wären dort ohnehin nicht lesbar.
- Beim Wiederherstellen einer Sicherung gilt das Gegenteil: sie bringt ihren
  Tresor mit und setzt einen vorhandenen außer Kraft. Zum Aufsperren zählt
  danach das Master-Passwort der Sicherung.
- Verschlüsselung braucht einen sicheren Kontext: HTTPS oder `localhost`.

Dokumente sind **nicht** verschlüsselt. In der Sicherung liegen sie im Klartext
(Base64) — sie gehört an einen Ort, dem man das zutraut.

## Loslegen

```bash
npm ci
npm run dev
```

Die von Vite ausgegebene URL öffnen, üblicherweise <http://127.0.0.1:5173/>.
Umgebungsvariablen oder externe Dienste braucht es nicht.

## Skripte

```bash
npm run dev      # Entwicklungsserver
npm run build    # Produktionsbuild
npm run preview  # Produktionsbuild lokal ansehen
npm run lint     # ESLint
npm test         # Tests der lokalen Ablage
```

## Gestaltung

Die Oberfläche folgt der Designsprache in [`design-language.html`](design-language.html):
warmes Creme im Hellen, warme Kohle im Dunklen, praktisch monochrom — Farbe ist
dem Status vorbehalten (aktiv, pausiert, Testphase, Frist), der Akzent nur
Schaltern und Fokusringen.

- **Farben** liegen als semantische Marken (`surface`, `border`, `ink`, `accent`)
  in [`src/index.css`](src/index.css) und schalten über die Klasse `dark` auf
  `<html>`. Hell, dunkel oder Systemeinstellung wählt der Knopf in der
  Seitenleiste bzw. der Kopfzeile; gespeichert unter `goldgeld.theme`.
- **Bewegung** läuft ausschließlich über CSS-Keyframes; JS misst nur und setzt
  Inline-Shorthands ([`src/lib/motion.js`](src/lib/motion.js)). Hauskurve ist
  `cubic-bezier(0.625, 0.05, 0, 1)`, Austritte laufen schneller als Eintritte,
  Listen kaskadieren, und in Reitern gleitet eine einzelne Markierung.
  `prefers-reduced-motion` schaltet alles auf sofort.
- **Schrift** ist DM Sans, lokal gebündelt — die PWA braucht dafür kein Netz.

## Stack

| Schicht | Technologie |
|---|---|
| UI | React 19, Tailwind CSS 4, CSS-Keyframes |
| Ablage | localStorage + IndexedDB |
| Verschlüsselung | Web Crypto (AES-GCM, PBKDF2) |
| Build | Vite 7 |
| PWA | eigener Service Worker |
| Icons | Lucide React |
| Schrift | DM Sans (@fontsource-variable) |

## Installation als App

**iPhone:** in Safari öffnen, „Teilen“ antippen, dann **Zum Home-Bildschirm**.

**Android:** in Chrome öffnen, Browser-Menü, dann **App installieren** oder
**Zum Startbildschirm hinzufügen**.

Die installierte PWA nutzt dieselben lokalen Daten wie das Browserprofil, aus
dem sie installiert wurde, und synchronisiert nichts auf andere Geräte.

## Lizenz

MIT
