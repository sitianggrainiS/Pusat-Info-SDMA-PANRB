import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent opaque third-party cross-origin script errors (e.g. from extensions or embed iframes)
// from triggering noisy unhandled exception overlays
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.' || (!event.filename && !event.lineno)) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(<App />);
