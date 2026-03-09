"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useInboundCalls, deleteInboundCall } from '@/hooks/useInboundCalls';
import { GlassCard } from '@/components/ui/GlassCard';
import { Search, Mail, Phone, ChevronLeft, ChevronRight, Trash2, PhoneCall, Loader2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LeadsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [tabView, setTabView] = useState<'inbound' | 'team'>('team');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [callingId, setCallingId] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const[loadingLeads,setLoadingLeads]=useState<boolean>(true);
    const[inboundCalls,setInboundCalls]=useState<any[]>([]);
    
    const { data: inboundData, isLoading: inboundLoading, refetch: refetchInbound } =
        useInboundCalls(page, 10, search, { poll: false }); // polling disabled so list only updates on manual refetch


    //const inboundCalls = inboundData?.inboundCalls || [];
    const inboundPagination = inboundData?.pagination || { total: 0, totalPages: 1 };

    useEffect(() => {
        if (inboundData) {
            console.log('[Leads] inboundData:', inboundData);
            console.log('[Leads] computed inboundCalls length', inboundCalls.length);
        }
    }, [inboundData]);

    useEffect(() => {
        const fetchInboundCalls = async () => {
       // setIsLoadingBookings(true);
        try {
            console.log('[Bookings] Fetching bookings...');
            const token = localStorage.getItem('token');
            
            const response = await axios.get(`https://scriptishrxnewmark.onrender.com/api/bookings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log(`[Bookings] ✅ Received ${response.data.bookings?.length || 0} bookings`);
            console.log('[Bookings] Sample booking data:', response.data.bookings?.[0]);
            setInboundCalls(response.data.bookings || []);
        } catch (error: any) {
            console.error('[Bookings] ❌ Error:', error.message);
            console.error('[Bookings] Status:', error.response?.status);
            console.error('[Bookings] Data:', error.response?.data);
        } finally {
            //setIsLoadingBookings(false);
        }
    };

    fetchInboundCalls();
    }, []);

     useEffect(() => {
        const fetchTeamMembers = async () => {
            setLoadingLeads(true);
            let token = localStorage.getItem('token');
            try {
                console.log('[Leads] Fetching team members (same as bookings)...');
                const response = await axios.get('https://scriptishrxnewmark.onrender.com/api/organization/team', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('[Leads] team-members response', response.data);
                setTeamMembers(response.data.team || []);
            } catch (error: any) {
                console.error('[Leads] ❌ Error fetching team members:', error.message);
                console.error('[Leads] Status:', error.response?.status);

                // fallback to clients, endpoint if team fails
                try {
                    console.log('[Leads] Falling back to /api/clients...');
                    const response = await axios.get('https://scriptishrxnewmark.onrender.com/api/clients', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    console.log('[Leads] clients fallback response', response.data);
                    setTeamMembers(response.data.clients || []);
                } catch (fallbackError: any) {
                    console.error('[Leads] ❌ Fallback also failed:', fallbackError.message);
                }
            } finally {
                setLoadingLeads(false);
            }
        };
        fetchTeamMembers();
    }, []);

    const handleDeleteInbound = async (id: string) => {
        if (!confirm('Are you sure you want to delete this inbound call record?')) return;
        
        setDeletingId(id);
        try {
            await deleteInboundCall(id);
            refetchInbound();
        } catch (error) {
            console.error('Error deleting inbound call:', error);
            alert('Failed to delete inbound call');
        } finally {
            setDeletingId(null);
        }
    };

    const handleCallInbound = async (callerPhone: string) => {
        setCallingId(callerPhone);
        try {
            const response = await fetch('/api/voice/outbound', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ to: callerPhone })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Call failed');
            
            alert('Call initiated to ' + callerPhone);
        } catch (error) {
            console.error('Error making call:', error);
            alert('Failed to initiate call');
        } finally {
            setCallingId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">All Leads</h1>
                    <p className="text-zinc-500 mt-1">Leads captured from invite and voice calls.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl w-64 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2">
                 <button
                    onClick={() => { setTabView('team'); setPage(1); }}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                        tabView === 'team'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                >
                    <Users className="w-4 h-4 inline mr-2" />
                    Captured Leads ({teamMembers.length})
                </button>
                <button
                    onClick={() => { setTabView('inbound'); setPage(1); }}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                        tabView === 'inbound'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                >
                    <PhoneCall className="w-4 h-4 inline mr-2" />
                    Voice Call Leads ({inboundCalls?.length})
                </button>
               
            </div>

            {/* Inbound Calls Table */}
            {tabView === 'inbound' && (
            <GlassCard className="!p-0 overflow-hidden border-zinc-200/50 shadow-xl shadow-zinc-200/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Caller Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Call Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {inboundLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-6" colSpan={5}>
                                            <div className="h-12 bg-zinc-400 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : inboundCalls.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                                                <PhoneCall className="w-8 h-8 text-zinc-300" />
                                            </div>
                                            <p className="text-zinc-500 font-medium">No leads yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {inboundCalls.map((call: any, idx: number) => (
                                        <motion.tr
                                            key={call.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover:bg-zinc-50/80 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-100">
                                                        <PhoneCall className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-zinc-900">{call.client?.name || 'Unknown Lead'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-zinc-600 font-mono">
                                                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                                    {call.client?.phone || '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                                    {call.client?.email || '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600">
                                                {call.createdAt ? new Date(call.createdAt).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleCallInbound(call.client?.phone || '')}
                                                        disabled={callingId === call.client?.phone || !call.client?.phone}
                                                        className="p-2 hover:bg-green-100 rounded-lg transition-colors text-zinc-400 hover:text-green-600 disabled:opacity-50"
                                                        title="Call"
                                                    >
                                                        {callingId === call.client?.phone ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <PhoneCall className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    {call.type === 'inbound' && (
                                                        <button
                                                            onClick={() => handleDeleteInbound(call.id)}
                                                            disabled={deletingId === call.id}
                                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-zinc-400 hover:text-red-600 disabled:opacity-50"
                                                            title="Delete"
                                                        >
                                                            {deletingId === call.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
                    <p className="text-sm text-zinc-500 font-medium">
                        Showing <span className="text-zinc-900">{inboundCalls.length}</span> of <span className="text-zinc-900">{inboundCalls.length}</span> items
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-zinc-900 px-2">
                            {page} / {inboundPagination.totalPages}
                        </span>
                        <button
                            disabled={page === inboundPagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </GlassCard>
            )}

            {/* Team Members Table */}
            {tabView === 'team' && (
            <GlassCard className="!p-0 overflow-hidden border-zinc-200/50 shadow-xl shadow-zinc-200/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                                <th className="px-6 py-4 font-semibold text-zinc-900">Name</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Email</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Phone</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Country</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Role</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {teamMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Users className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                                        <p className="text-zinc-500 font-medium">{loadingLeads?'Loading Leads...':'No leads captured'}</p>
                                    </td>
                                </tr>
                            ) : (
                                teamMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-zinc-900">{member.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-zinc-600">
                                                <Mail className="w-4 h-4" />
                                                {member.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {member.phoneNumber || member.phone ? (
                                                <div className="flex items-center gap-2 text-zinc-600">
                                                    <Phone className="w-4 h-4" />
                                                    {member.phoneNumber || member.phone}
                                                </div>
                                            ) : (
                                                <span className="text-zinc-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {member.country ? (
                                                <div className="text-zinc-600">{member.country}</div>
                                            ) : (
                                                <span className="text-zinc-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                                member.role === 'ADMIN' 
                                                    ? 'bg-red-100 text-red-700' 
                                                    : member.role === 'MEMBER' 
                                                    ? 'bg-blue-100 text-blue-700' 
                                                    : 'bg-zinc-100 text-zinc-700'
                                            }`}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-600 text-sm">
                                            {new Date(member.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
            )}
        </div>
    );
}
