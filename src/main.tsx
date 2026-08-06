import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SessionProvider } from './context/SessionContext';
import { RouterProvider } from './hooks/useRouter';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </RouterProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Não foi possível ativar o modo instalável.', error);
    });
  });
}
