"use client";

import { useState, useEffect } from 'react';
import { useInboundCalls, deleteInboundCall } from '@/hooks/useInboundCalls';
import { GlassCard } from '@/components/ui/GlassCard';
import { Search, Mail, Phone, ChevronLeft, ChevronRight, Trash2, PhoneCall, Loader2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LeadsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [tabView, setTabView] = useState<'inbound' | 'team'>('inbound');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [callingId, setCallingId] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    
    const { data: inboundData, isLoading: inboundLoading, refetch: refetchInbound } = useInboundCalls(page, 10, search);

    const inboundCalls = inboundData?.inboundCalls || [];
    const inboundPagination = inboundData?.pagination || { total: 0, totalPages: 1 };

    useEffect(() => {
        const fetchTeamMembers = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('https://scriptshrxcodebase.onrender.com/api/organization/team', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.team) {
                        setTeamMembers(data.team || []);
                    }
                }
            } catch (error) {
                console.error('Error fetching team members:', error);
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
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Inbound Calls & Team</h1>
                    <p className="text-zinc-500 mt-1">Manage inbound calls and team members.</p>
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
                    Inbound Call Leads ({inboundPagination.total})
                </button>
               
            </div>

            {/* Inbound Calls Table */}
            {tabView === 'inbound' && (
            <GlassCard className="!p-0 overflow-hidden border-zinc-200/50 shadow-xl shadow-zinc-200/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Caller Information</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone Number</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Duration</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Call Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {inboundLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-6" colSpan={6}>
                                            <div className="h-12 bg-zinc-100 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : inboundCalls.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                                                <PhoneCall className="w-8 h-8 text-zinc-300" />
                                            </div>
                                            <p className="text-zinc-500 font-medium">No inbound calls yet.</p>
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
                                                        <p className="font-semibold text-zinc-900">{call.callerName || 'Unknown Caller'}</p>
                                                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                                            Inbound Call
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-zinc-600 font-mono">
                                                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                                    {call.callerPhone}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-zinc-600">
                                                    {call.duration ? `${call.duration}s` : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    call.status === 'completed'
                                                        ? 'bg-green-50 text-green-700 border border-green-100'
                                                        : call.status === 'missed'
                                                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                                                        : 'bg-red-50 text-red-700 border border-red-100'
                                                }`}>
                                                    {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                                    {new Date(call.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleCallInbound(call.callerPhone)}
                                                        disabled={callingId === call.callerPhone}
                                                        className="p-2 hover:bg-green-100 rounded-lg transition-colors text-zinc-400 hover:text-green-600 disabled:opacity-50"
                                                        title="Call back"
                                                    >
                                                        {callingId === call.callerPhone ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <PhoneCall className="w-4 h-4" />
                                                        )}
                                                    </button>
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
                        Showing <span className="text-zinc-900">{inboundCalls.length}</span> of <span className="text-zinc-900">{inboundPagination.total}</span> calls
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
                                <th className="px-6 py-4 font-semibold text-zinc-900">Role</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {teamMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Users className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                                        <p className="text-zinc-500 font-medium">No team members</p>
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
                                            {member.phoneNumber ? (
                                                <div className="flex items-center gap-2 text-zinc-600">
                                                    <Phone className="w-4 h-4" />
                                                    {member.phoneNumber}
                                                </div>
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
