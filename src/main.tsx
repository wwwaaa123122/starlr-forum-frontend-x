import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './lib/auth';
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
function applyTheme() {
  try {
    const saved = localStorage.getItem('starlr.theme');
    const theme = saved === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#ffffff' : '#070912');
  } catch {
    /* ignore */
  }
}
applyTheme();

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

export { applyTheme };
