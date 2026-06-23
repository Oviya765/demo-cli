import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8081',
});

api.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('clinic_flow_token');
    if (token && token.split('.').length === 3) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

export default api;
