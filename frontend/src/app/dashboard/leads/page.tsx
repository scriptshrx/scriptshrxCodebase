"use client";

import { useState } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { useInboundCalls, deleteInboundCall, convertInboundCallToLead } from '@/hooks/useInboundCalls';
import { GlassCard } from '@/components/ui/GlassCard';
import { Search, UserPlus, Mail, Phone, Calendar, ArrowRight, ChevronLeft, ChevronRight, Trash2, PhoneCall, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LeadsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [tabView, setTabView] = useState<'leads' | 'inbound'>('leads');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [convertingId, setConvertingId] = useState<string | null>(null);
    
    const { data, isLoading } = useLeads(page, 10, search);
    const { data: inboundData, isLoading: inboundLoading, refetch: refetchInbound } = useInboundCalls(page, 10, search);

    const leads = data?.leads || [];
    const pagination = data?.pagination || { total: 0, totalPages: 1 };
    
    const inboundCalls = inboundData?.inboundCalls || [];
    const inboundPagination = inboundData?.pagination || { total: 0, totalPages: 1 };

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

    const handleConvertToLead = async (id: string, callerPhone: string) => {
        const name = prompt('Enter caller name (optional):');
        
        setConvertingId(id);
        try {
            await convertInboundCallToLead(id, { 
                name: name || `Call from ${callerPhone}`,
                phone: callerPhone,
                notes: 'Auto-converted from inbound call'
            });
            
            // Refresh both lists
            refetchInbound();
            
            alert('Inbound call converted to lead successfully!');
        } catch (error) {
            console.error('Error converting inbound call:', error);
            alert('Failed to convert inbound call to lead');
        } finally {
            setConvertingId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">AI Captured Leads</h1>
                    <p className="text-zinc-500 mt-1">Real-time leads and inbound calls captured by your AI agents.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search leads..."
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
                    onClick={() => { setTabView('leads'); setPage(1); }}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                        tabView === 'leads'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                >
                    <UserPlus className="w-4 h-4 inline mr-2" />
                    AI Captured Leads
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
                    Inbound Calls ({inboundPagination.total})
                </button>
            </div>

            {/* Leads Table */}
            {tabView === 'leads' && (
            <GlassCard className="!p-0 overflow-hidden border-zinc-200/50 shadow-xl shadow-zinc-200/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Lead Information</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Capture Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-6" colSpan={5}>
                                            <div className="h-12 bg-zinc-100 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                                                <UserPlus className="w-8 h-8 text-zinc-300" />
                                            </div>
                                            <p className="text-zinc-500 font-medium">No leads found yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {leads.map((lead: any, idx: number) => (
                                        <motion.tr
                                            key={lead.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover:bg-zinc-50/80 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-100">
                                                        {lead.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-zinc-900">{lead.name}</p>
                                                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                            New Lead
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                                        {lead.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                                        {lead.phone || 'N/A'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                    AI Captured
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                                    {new Date(lead.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-indigo-600">
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
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
                        Showing <span className="text-zinc-900">{leads.length}</span> of <span className="text-zinc-900">{pagination.total}</span> leads
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
                            {page} / {pagination.totalPages}
                        </span>
                        <button
                            disabled={page === pagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </GlassCard>
            )}

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
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
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
                                                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                                    {new Date(call.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleConvertToLead(call.id, call.callerPhone)}
                                                        disabled={convertingId === call.id}
                                                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-zinc-400 hover:text-blue-600 disabled:opacity-50"
                                                        title="Convert to lead"
                                                    >
                                                        {convertingId === call.id ? (
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
        </div>
    );
}
