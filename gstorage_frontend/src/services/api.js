import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

apiClient.interceptors.request.use(
  (config) => {
    if (
      config.url === '/api/token/' || 
      config.url === '/api/token/refresh/' ||
      config.url.includes('/password-reset/')
    ) {
      return config;
    }
    const authTokens = JSON.parse(localStorage.getItem('authTokens'));

    if (authTokens) {
      config.headers['Authorization'] = `Bearer ${authTokens.access}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
let isRefreshing = false; 
let failedQueue = []; 

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url === '/api/token/' || 
        originalRequest.url === '/api/token/refresh/' ||
        originalRequest.url.includes('/password-reset/') 
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const authTokens = JSON.parse(localStorage.getItem('authTokens'));
      if (!authTokens || !authTokens.refresh) {
        localStorage.removeItem('authTokens');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const rs = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
          refresh: authTokens.refresh
        });
        
        const newTokens = rs.data;
        
        localStorage.setItem('authTokens', JSON.stringify(newTokens));

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newTokens.access}`;
        originalRequest.headers['Authorization'] = `Bearer ${newTokens.access}`;
        
        processQueue(null, newTokens.access);
        
        return apiClient(originalRequest);
        
      } catch (_error) {
        console.error("Refresh token falló. Cerrando sesión.", _error);
        processQueue(_error, null);
        localStorage.removeItem('authTokens');
        window.location.href = '/login';
        return Promise.reject(_error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;