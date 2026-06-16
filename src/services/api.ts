import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8081',
});

api.interceptors.request.use(
  (config: any) => {
    try {
      const stored = localStorage.getItem('clinic_flow_user');

      if (stored) {
        let token: string | undefined;
        try {
          const parsed = JSON.parse(stored);
          // Handle both possible object formats
          token = parsed?.token || parsed?.accessToken || parsed?.data?.token;
        } catch {
          // stored might be a raw token string
          token = stored;
        }

        if (token && typeof token === 'string') {
          // Only attach well-formed JWTs (simple validation: 2 dots)
          if (token.split('.').length === 3) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
          } else {
            console.warn('Stored token is not a valid JWT, skipping Authorization header');
          }
        } else {
          console.warn('No token found in stored user');
        }
      } else {
        console.warn('No user found in localStorage');
      }

    } catch (e) {
      console.error('Token parsing error:', e);
    }

    return config;
  },
  (error: any) => Promise.reject(error)
);

export default api;
