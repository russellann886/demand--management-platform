import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import { AuthProvider } from './auth/AuthContext';
import { AuthGate } from './auth/guards';
import RoutesComponent from './app';
import { AppErrorFallback } from './components/AppErrorFallback';
import { Toaster } from './components/ui/sonner';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <ErrorBoundary FallbackComponent={AppErrorFallback}>
            <RoutesComponent />
            <Toaster />
          </ErrorBoundary>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
