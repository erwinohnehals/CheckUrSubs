# Gold&Geld

Ein lokal gespeicherter Überblick über laufende Kosten und alltägliche Ausgaben:
Verträge, Abos, einmalige Einkäufe, Einnahmen und Budgets — inklusive
Kündigungsfristen, Belegen, Vertragsdokumenten und Portal-Zugängen. Ohne
Benutzerkonto, ohne Backend.

![PWA](https://img.shields.io/badge/PWA-ready-blueviolet)
![React](https://img.shields.io/badge/React-19-61dafb)
![Vite](https://img.shields.io/badge/Vite-7-646cff)
![Storage](https://img.shields.io/badge/storage-local--only-green)

## Funktionen

- Summen pro Monat, Jahr und Tag, Abbuchungskalender und anstehende Zahlungen
- **Ausgaben & Einnahmen**: einzelne Beträge oder Einkäufe mit Positionen,
  eigenen Kategorien, Konten, Notizen, Tags und Belegen
- **Budgets mit Übertrag**: nicht verbrauchtes oder überzogenes Budget wird in
  den Folgemonat übernommen; ein manueller Neustart ist jederzeit möglich
- **Jahresbericht**: Einnahmen und Einmalausgaben je Monat, Kategorien,
  größte Einkäufe und direkter Vergleich mit den laufenden Kosten
- **Umbuchungen zählen nicht mit**: Geld zwischen eigenen Konten oder aus
  Erspartem lässt sich als Umbuchung erfassen — die Zeile bleibt in der Liste,
  geht aber in keine Summe ein, nicht in Monat, Budget oder Jahresbericht. So
  bleibt sichtbar, was tatsächlich verdient und ausgegeben wurde
- Vergangene Vorgänge mit **Erneut erfassen** als Vorlage für heute übernehmen
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
- **Kontoauszug einlesen**: Sparkasse-CSV, Kreditkarten-CSV, CAMT.052 (auch als
  ZIP) und PayPal — mit Kategorievorschlag, den du bestätigst oder überschreibst
- Auswertung nach Kategorie und Eintrag, Kostenverlauf über 3/6/12 Monate
- Mehrere Währungen mit zwischengespeicherten Wechselkursen
- Deutsch und Englisch
- Getrennte CSV-Exporte für Verträge und Ausgaben sowie JSON-Export/-Import
- **Vollständige Sicherung** als eine Datei — mit Ausgaben, Konten, Budgets,
  Dokumenten und Einstellungen
- Installierbare PWA

## Wo die Daten liegen

Alles bleibt im Browser dieses Geräts — es gibt kein Konto und keine Synchronisation.

| Was | Wo | Schlüssel |
|---|---|---|
| Einträge, Vertragsdaten, eigene Felder | `localStorage` | `goldgeld.entries` |
| Ausgaben und Einnahmen (inkl. Flagge `internal` für Umbuchungen und `entry_id` für den verknüpften Vertrag) | `localStorage` | `goldgeld.expenses` |
| Benannte Konten | `localStorage` | `goldgeld.accounts` |
| Budgets und Übertragsbeginn | `localStorage` | `goldgeld.budgets` |
| Gelernte Importregeln (Kategorie, Konto und Vertrag je Zahlungskennung) | `localStorage` | `goldgeld.bankrules` |
| Dokumente (Blobs, max. 20 MB je Datei) | IndexedDB | `goldgeld` / `documents` |
| Tresor-Metadaten (Salt + Prüf-Token) | `localStorage` | `goldgeld.vault` |

Wer die Browserdaten der Seite löscht, löscht auch die Einträge.

## Kontoauszug einlesen

Unter **Monat → Auszug einlesen**. Erkannt werden am Inhalt, nicht am Dateinamen:

| Format | Woher | Eindeutige Referenz |
|---|---|---|
| **CAMT.052** (XML, auch als ZIP) | Triodos u. a. | `AcctSvcrRef` der Bank |
| **CSV-CAMT V2** | Sparkasse Giro | aus dem Zeileninhalt gebildet |
| **Kreditkarten-CSV** | Sparkasse Kreditkarte | `Buchungsreferenz` |
| **PayPal-CSV** | PayPal-Aktivitäten | `Transaktionscode` |

Drei Regeln tragen den Import:

- **Nichts wird stillschweigend übernommen.** Jede Zeile bekommt einen
  Kategorievorschlag; die Prüfansicht zeigt zuerst die unsicheren. Eine
  Korrektur gilt dem ganzen Händler, nicht der einzelnen Zeile.
- **Dieselbe Datei zweimal einzulesen ist folgenlos.** Die Referenz erkennt
  bekannte Buchungen wieder — überlappende Zeiträume sind der Normalfall. Zwei
  echte gleiche Zahlungen am selben Tag bleiben trotzdem zwei Vorgänge.
- **Geld zwischen eigenen Konten zählt nicht als Ausgabe.** Kreditkarten-
  abrechnung, PayPal-Einzug, Deckungsbuchungen, Autorisierungen und Überweisungen
  auf den eigenen Namen (etwa mit „Mein Geld“ im Verwendungszweck) sind
  abgewählt — wer Giro, Karte und PayPal einliest, zählt sonst dreifach.
  Vorgemerktes aus CAMT.052 kommt gar nicht erst an. Wer eine solche Zeile
  trotzdem einschließt, bekommt sie als **Umbuchung** in die Bücher.

Was du beim Einlesen entscheidest, wird gemerkt: Händler → Kategorie und
Dateikennung → Konto liegen unter `goldgeld.bankrules` und gelten beim nächsten
Auszug. Gelernt wird nur aus Widerspruch, nie aus dem eigenen Vorschlag.

## Sichern und wiederherstellen

Unter **Einstellungen → Daten** stehen Export und vollständige Sicherung
nebeneinander:

| | Enthält | Beim Einlesen |
|---|---|---|
| **Verträge CSV / JSON** | Vertragsdaten, beim JSON zusätzlich die Tresor-Metadaten | wird zum vorhandenen Vertragsbestand **hinzugefügt**, Dubletten übersprungen |
| **Ausgaben CSV** | eine Zeile je Position; `receipt_id` hält die Zeilen eines Einkaufs zusammen | Export zur Weiterverarbeitung |
| **Sicherung** (JSON) | Verträge, Ausgaben, Konten, Budgets, Dokumente, Einstellungen und Tresor-Metadaten | **ersetzt** nach Rückfrage den gesamten Stand des Geräts |

Die Sicherung ist die Datei für den Ernstfall und für den Umzug auf ein anderes
Gerät. Beide Dateien liest derselbe Knopf (*Import → Datei wählen*) — eine
Sicherung wird an ihrem Format erkannt. Sicherungen der Version 1 bleiben
lesbar. Dokumente und Belege stecken als Base64 darin, die Datei ist also etwa
ein Drittel größer als die Dateien zusammen. Nach dem Wiederherstellen lädt die
Seite neu, damit Sprache und Farbschema greifen.

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
