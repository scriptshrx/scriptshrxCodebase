import axios from 'axios';

const getBaseUrl = () => {
    if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    if (process.env.NODE_ENV === 'development') return 'http://localhost:5000/api';
    return process.env.NEXT_PUBLIC_API_URL || '/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Token
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor: Handle 401 (Refresh Logic)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Attempt Refresh
                const refreshBase = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
                    ? 'http://localhost:5000'
                    : '';
                const refreshUrl = typeof window !== 'undefined' && process.env.NODE_ENV !== 'development'
                    ? '/api/auth/refresh'
                    : `${refreshBase}/api/auth/refresh`;
                const { data } = await axios.post(refreshUrl, {}, {
                    withCredentials: true
                });

                if (data.token) {
                    localStorage.setItem('token', data.token); // Update Access Token
                    originalRequest.headers.Authorization = `Bearer ${data.token}`;
                    return api(originalRequest); // Retry original request
                }
            } catch (refreshError) {
                // Refresh failed (Session expired)
                console.error('Session expired:', refreshError);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
