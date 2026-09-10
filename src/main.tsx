// Typsnittet självhostas via npm — inga nätverksanrop, fungerar i flygplansläge.
import '@fontsource-variable/instrument-sans';
import './design/theme.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { keepUpToDate } from './pwa';

const root = document.getElementById('root');
if (!root) throw new Error('Hittade inte #root');

keepUpToDate();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
