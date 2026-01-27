import axios from 'axios';

const getBaseUrl = () => {

    return 'https://scriptishrxcodebase.onrender.com';
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
    console.log(`[API Interceptor] ${config.method?.toUpperCase()} ${config.url}`);
    if (token) {
        console.log(`[API Interceptor] ✅ Token attached (${token.substring(0, 20)}...)`);
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        console.warn(`[API Interceptor] ⚠️ No token found in localStorage - request will likely fail`);
    }
    return config;
});

// Response Interceptor: Handle 401 (Refresh Logic)
api.interceptors.response.use(
    (response) => {
        console.log(`[API Interceptor] ✅ SUCCESS ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        console.error(`[API Interceptor] ❌ ERROR`);
        console.error(`  Status: ${error.response?.status || 'No Response'}`);
        console.error(`  Method: ${error.config?.method?.toUpperCase()}`);
        console.error(`  URL: ${error.config?.url}`);
        console.error(`  Message: ${error.message}`);
        console.error(`  CORS: ${error.response?.headers?.['access-control-allow-origin'] ? 'ALLOWED' : 'BLOCKED'}`);

        // If 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            console.log(`[API Interceptor] 🔄 Attempting token refresh...`);

            try {
                // Attempt Refresh with absolute URL
                const baseUrl = getBaseUrl();
                const refreshUrl = `${baseUrl}/api/auth/refresh`;
                
                const { data } = await axios.post(refreshUrl, {}, {
                    withCredentials: true
                });

                if (data.token) {
                    console.log(`[API Interceptor] ✅ Token refreshed successfully`);
                    localStorage.setItem('token', data.token); // Update Access Token
                    originalRequest.headers.Authorization = `Bearer ${data.token}`;
                    return api(originalRequest); // Retry original request
                }
            } catch (refreshError) {
                // Refresh failed (Session expired)
                console.error(`[API Interceptor] ❌ Token refresh failed - logging out`);
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
