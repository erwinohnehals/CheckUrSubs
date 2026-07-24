# CheckUrSubs

A local-first subscription tracker. Track recurring costs, upcoming billing dates,
and spending by category without creating an account or connecting a backend.

![PWA](https://img.shields.io/badge/PWA-ready-blueviolet)
![React](https://img.shields.io/badge/React-19-61dafb)
![Vite](https://img.shields.io/badge/Vite-7-646cff)
![Storage](https://img.shields.io/badge/storage-local--only-green)

## Features

- Dashboard totals by month, year, and day
- Billing calendar and upcoming charges
- Category and service analytics
- Monthly, yearly, paused, and trial subscriptions
- Multi-currency display with cached exchange rates
- RU and EN localization
- CSV and JSON import/export
- Installable PWA
- Local browser storage with no account or cloud synchronization

## Local data

Subscriptions are stored in the browser's `localStorage` under
`checkursubs.subscriptions`.

- Data stays in the current browser profile.
- There is no account, Supabase project, or automatic device synchronization.
- Clearing the site's browser data also clears subscriptions.
- Use the JSON or CSV export in the Analytics tab for backups or manual transfer
  to another device.

Exchange-rate refreshes use a public API when online. Cached or built-in fallback
rates keep the tracker usable without a connection.

## Getting started

```bash
npm ci
npm run dev
```

Open the URL printed by Vite, usually <http://127.0.0.1:5173/>.

No environment variables or external services are required.

## Scripts

```bash
npm run dev      # start the development server
npm run build    # create a production build
npm run preview  # preview the production build
npm run lint     # run ESLint
npm test         # run local storage tests
```

## Stack

| Layer | Technology |
|---|---|
| UI | React 19, Tailwind CSS 4, Framer Motion |
| Storage | Browser localStorage |
| Build | Vite 7 |
| PWA | Custom service worker |
| Icons | Lucide React |

## PWA installation

**iPhone:** open in Safari, tap Share, then **Add to Home Screen**.

**Android:** open in Chrome, open the browser menu, then choose **Install app** or
**Add to Home screen**.

The installed PWA uses the same local data as the browser profile that installed
it. It does not synchronize that data to other devices.

## License

MIT
