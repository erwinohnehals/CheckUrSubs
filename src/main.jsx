import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Inter liegt lokal im Bündel — die PWA soll ohne Netz vollständig aussehen
import '@fontsource-variable/inter'
import './index.css'
import Root from './App.jsx'

const rootElement = document.getElementById('root')

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

// ─── Service Worker ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {

        // Принудительно проверяем новую версию SW при каждом запуске.
        // Браузер по умолчанию делает это раз в 24ч — это слишком редко.
        registration.update();

        // Когда новый SW готов (ждёт активации) — активируем сразу,
        // без необходимости перезагружать страницу вручную.
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // Новый SW установлен и ждёт — говорим ему активироваться
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Когда SW сменился (activated) — тихо перезагружаем страницу
        // чтобы юзер получил новую версию без ручных действий
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

      })
      .catch((err) => {
        console.error('Service worker registration failed:', err);
      });
  });
}
