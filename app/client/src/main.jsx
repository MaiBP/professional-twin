import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadSettings } from './i18n.js';
import './styles.css';
import './twin.css';

// Settings (language and theme) first, then the app, so the texts already come out in the chosen language.
loadSettings()
  .then(() => import('./App.jsx'))
  .then(({ default: App }) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
