import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useLeads(page = 1, limit = 10, search = '') {
    return useQuery({
        queryKey: ['leads', page, limit, search],
        queryFn: async () => {
            const { data } = await api.get('/leads', {
                params: { page, limit, search }
            });
            return data;
        },
        placeholderData: (previousData) => previousData,
        refetchInterval: 10000 // Poll every 10s for real-time feel
    });
}
