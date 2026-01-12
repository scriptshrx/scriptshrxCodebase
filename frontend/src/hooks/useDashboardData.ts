import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: async () => {
            const { data } = await api.get('/clients/stats');
            return data;
        },
        refetchInterval: 10000,
        refetchOnWindowFocus: true
    });
}

export function useVoiceStats() {
    return useQuery({
        queryKey: ['voice', 'stats'],
        queryFn: async () => {
            // Fetch from new endpoint
            const { data } = await api.get('/twilio/stats');
            return data; // Endpoint now returns the stats object directly
        },
        refetchInterval: 5000, // Faster poll for voice stats
        refetchOnWindowFocus: true
    });
}

export function useRecentBookings() {
    return useQuery({
        queryKey: ['dashboard', 'bookings'],
        queryFn: async () => {
            const { data } = await api.get('/bookings');
            // Sort by date desc and take top 5
            return Array.isArray(data)
                ? data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
                : [];
        }
    });
}
