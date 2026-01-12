"use client";

import { useState } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { GlassCard } from '@/components/ui/GlassCard';
import { Search, UserPlus, Mail, Phone, Calendar, ArrowRight, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LeadsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const { data, isLoading } = useLeads(page, 10, search);

    const leads = data?.leads || [];
    const pagination = data?.pagination || { total: 0, totalPages: 1 };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">AI Captured Leads</h1>
                    <p className="text-zinc-500 mt-1">Real-time leads automatically qualified by your AI agents.</p>
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

            {/* Table Container */}
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
        </div>
    );
}
