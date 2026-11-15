import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/sora/wght.css';
import '@fontsource/bodoni-moda/latin-700.css';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './app/App';
import { registerServiceWorker } from './pwa/register';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
registerServiceWorker();
