import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';
import './responsive.css';

// Offline app: when a new version is published, load it straight away instead of
// keeping the old cached copy, and look for updates every 30 minutes (a board can stay open all day).
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => updateSW(true),
  onRegisteredSW: (_url, reg) => {
    if (reg) setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
