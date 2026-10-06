import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './lib/auth';
import { initTheme } from './lib/theme';
import './index.css';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/** 主题：暗色优先，跟随 localStorage 记忆 */
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
      <Toaster
        position="bottom-center"
        theme={document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}
        toastOptions={{
          style: {
            background: 'var(--sl-surface2)',
            color: 'var(--sl-ink)',
            border: '1px solid var(--sl-line)',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
);

