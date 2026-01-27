import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TokenPayload {
    exp?: number;
    iat?: number;
    userId?: string;
    email?: string;
}

/**
 * Decodes JWT token to extract payload
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
function decodeToken(token: string): TokenPayload | null {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to decode token:', error);
        return null;
    }
}

/**
 * Hook that monitors JWT token expiration and logs user out automatically
 * - Checks token every 60 seconds
 * - Logs out user 2 minutes before token expires
 * - Logs out immediately if token is already expired
 */
export function useTokenExpiration() {
    const router = useRouter();
    const WARNING_TIME = 2 * 60 * 1000; // Warn 2 minutes before expiration

    useEffect(() => {
        const checkTokenExpiration = () => {
            try {
                const token = localStorage.getItem('token');
                
                if (!token) {
                    // No token found, likely already logged out
                    return;
                }

                const decoded = decodeToken(token);
                
                if (!decoded || !decoded.exp) {
                    console.warn('⚠️ Token does not have expiration info');
                    return;
                }

                const expirationTime = decoded.exp * 1000; // Convert to milliseconds
                const currentTime = Date.now();
                const timeRemaining = expirationTime - currentTime;

                // Token is expired
                if (timeRemaining <= 0) {
                    console.log('🔴 Token expired - logging out user');
                    handleLogout();
                    return;
                }

                // Token expiring soon (within 2 minutes)
                if (timeRemaining < WARNING_TIME) {
                    console.warn(`⚠️ Token expiring in ${Math.floor(timeRemaining / 1000)} seconds`);
                }

                // Log remaining time for debugging
                const minutes = Math.floor(timeRemaining / 60000);
                const seconds = Math.floor((timeRemaining % 60000) / 1000);
                console.log(`⏰ Token valid for ${minutes}m ${seconds}s`);
            } catch (error) {
                console.error('Error checking token expiration:', error);
            }
        };

        const handleLogout = () => {
            // Clear all auth data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            
            // Redirect to login
            router.push('/login');
        };

        // Check token immediately on mount
        checkTokenExpiration();

        // Set up interval to check every 60 seconds
        const interval = setInterval(checkTokenExpiration, 60 * 1000);

        return () => clearInterval(interval);
    }, [router]);
}

export default useTokenExpiration;
