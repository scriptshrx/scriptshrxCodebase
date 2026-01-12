'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, TrendingUp, Activity, Search, Filter,
    Download, AlertCircle, ChevronLeft, ChevronRight,
    Loader2, Shield, Calendar, CheckCircle, XCircle
} from 'lucide-react';
import api from '@/lib/api';

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');

    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        fetchSubscribers();
    }, [page, search, statusFilter, typeFilter]);

    async function fetchDashboardData() {
        try {
            const { data } = await api.get('/admin/subscribers/summary');
            if (data.success) {
                setStats(data.data);
            }
        } catch (err: any) {
            console.error('Failed to fetch stats:', err);
            if (err.response?.status === 403) {
                setError('You do not have permission to view this page.');
            }
        } finally {
            setLoading(false);
        }
    }

    async function fetchSubscribers() {
        setTableLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search,
                status: statusFilter,
                type: typeFilter
            });

            const { data } = await api.get(`/admin/subscribers?${query}`);
            if (data.success) {
                setSubscribers(data.data);
                setTotalPages(data.pagination.totalPages);
                setTotalItems(data.pagination.total);
            }
        } catch (err) {
            console.error('Failed to fetch list:', err);
        } finally {
            setTableLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <Shield className="w-16 h-16 text-red-200 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-500 mb-6">{error}</p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    // Modal State
    const [selectedSub, setSelectedSub] = useState<any>(null);

    const handleExport = () => {
        if (!subscribers.length) {
            alert("No subscribers to export.");
            return;
        }

        const headers = ["Name", "Email", "Plan", "Type", "Status", "Joined Date"];
        const rows = subscribers.map(sub => [
            `"${sub.user?.name || ''}"`,
            `"${sub.user?.email || ''}"`,
            `"${sub.plan}"`,
            `"${sub.type}"`,
            `"${sub.status}"`,
            `"${new Date(sub.createdAt).toLocaleDateString()}"`
        ]);

        const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `subscribers_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 relative">

            {/* Subscriber Details Modal */}
            {selectedSub && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedSub(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gray-50 border-b border-gray-100 p-6 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">Subscriber Details</h3>
                            <button onClick={() => setSelectedSub(null)} className="p-2 hover:bg-gray-200 rounded-full transition">
                                <XCircle className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl">
                                    {selectedSub.user?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900">{selectedSub.user?.name}</h4>
                                    <p className="text-gray-500">{selectedSub.user?.email}</p>
                                    <p className="text-xs text-gray-400 font-mono mt-1">{selectedSub.user?.id}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Plan</p>
                                    <p className="font-bold text-gray-900">{selectedSub.plan}</p>
                                    <StatusBadge status={selectedSub.status} />
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Billing Cycle</p>
                                    <p className="font-bold text-gray-900 capitalize">{selectedSub.billingCycle}</p>
                                    <p className="text-xs text-gray-500 mt-1">Next: {selectedSub.endDate ? new Date(selectedSub.endDate).toLocaleDateString() : 'N/A'}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h5 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Account Info</h5>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Account Type</span>
                                    <span className="font-medium">{selectedSub.type}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Joined Date</span>
                                    <span className="font-medium">{new Date(selectedSub.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Tenant ID</span>
                                    <span className="font-mono text-gray-400 text-xs">{selectedSub.tenantId}</span>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50">
                                    Reset Password
                                </button>
                                <button className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">
                                    Manage Subscription
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subscriber Management</h1>
                    <p className="text-gray-500">Overview and management of all platform subscribers</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black flex items-center gap-2 text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Subscribers"
                        value={stats.totalSubscribers}
                        icon={<Users className="w-5 h-5 text-blue-600" />}
                        trend="+12% this month"
                        color="bg-blue-50"
                    />
                    <StatCard
                        title="Active Subscriptions"
                        value={stats.status?.active || stats.status?.Active || 0}
                        icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                        subtext={`${((stats.status?.Active || 0) / stats.totalSubscribers * 100).toFixed(1)}% conversion`}
                        color="bg-green-50"
                    />
                    <StatCard
                        title="Trial Users"
                        value={stats.plans?.Trial || 0}
                        icon={<Activity className="w-5 h-5 text-amber-600" />}
                        subtext="High priority conversions"
                        color="bg-amber-50"
                    />
                    <StatCard
                        title="Revenue Estimate"
                        value="$ --"
                        icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                        subtext="Based on active plans"
                        color="bg-purple-50"
                    />
                </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center relative z-10">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    >
                        <option value="ALL">All Types</option>
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="ORGANIZATION">Organization</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                    >
                        <option value="ALL">All Status</option>
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="canceled">Canceled</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Subscriber</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plan Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tableLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                                        Loading list...
                                    </td>
                                </tr>
                            ) : subscribers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No subscribers found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                subscribers.map((sub: any) => (
                                    <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedSub(sub)}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                    {sub.user?.name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{sub.user?.name || 'Unknown User'}</p>
                                                    <p className="text-xs text-gray-500">{sub.user?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900 text-sm">{sub.plan}</span>
                                                <span className="text-xs text-gray-500 capitalize">{sub.type.toLowerCase()} • {sub.billingCycle}ly</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={sub.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(sub.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedSub(sub); }}
                                                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!tableLoading && totalItems > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                            Showing <span className="font-bold">{((page - 1) * limit) + 1}</span> to <span className="font-bold">{Math.min(page * limit, totalItems)}</span> of <span className="font-bold">{totalItems}</span> results
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1 px-3 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50 text-xs font-medium"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1 px-3 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50 text-xs font-medium"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

}

function StatCard({ title, value, icon, trend, subtext, color }: any) {
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${color}`}>
                    {icon}
                </div>
            </div>
            {(trend || subtext) && (
                <div className="flex items-center gap-2 text-xs">
                    {trend && <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">{trend}</span>}
                    {subtext && <span className="text-gray-400">{subtext}</span>}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        active: 'bg-green-100 text-green-700 border-green-200',
        trial: 'bg-blue-100 text-blue-700 border-blue-200',
        canceled: 'bg-gray-100 text-gray-600 border-gray-200',
        expired: 'bg-red-100 text-red-700 border-red-200',
    };
    const defaultStyle = 'bg-gray-100 text-gray-600 border-gray-200';

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${styles[status.toLowerCase()] || defaultStyle}`}>
            {status}
        </span>
    );
}
