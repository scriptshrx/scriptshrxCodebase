import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useInboundCalls(page = 1, limit = 10, search = '') {
    return useQuery({
        queryKey: ['inboundCalls', page, limit, search],
        queryFn: async () => {
            const { data } = await api.get('/inbound-calls', {
                params: { page, limit, search }
            });
            return data;
        },
        placeholderData: (previousData) => previousData,
        refetchInterval: 5000 // Poll every 5s for real-time updates
    });
}

export async function deleteInboundCall(id: string) {
    const { data } = await api.delete(`/inbound-calls/${id}`);
    return data;
}

export async function convertInboundCallToLead(id: string, leadData: { name?: string; email?: string; notes?: string }) {
    const { data } = await api.post(`/inbound-calls/${id}/convert-to-lead`, leadData);
    return data;
}
