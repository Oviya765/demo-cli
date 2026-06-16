import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import AppRouter from './routes/AppRouter';
import './index.css';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          className: 'toast-custom',
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '0.875rem',
            border: '1px solid rgba(255,255,255,0.08)',
          },
        }}
      />
    </AuthProvider>
  );
}
