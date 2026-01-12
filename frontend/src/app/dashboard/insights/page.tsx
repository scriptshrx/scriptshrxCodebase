'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, Sparkles, Loader2 } from 'lucide-react';

export default function InsightsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/insights', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }

            if (res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    setData(await res.json());
                } else {
                    console.warn('Received non-JSON response from /api/insights');
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!data) return <div>Failed to load insights.</div>;

    const { metrics, revenueChart, behaviorChart, aiRecommendation } = data;

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Predictive Insights</h1>
                <p className="text-gray-500 mt-2">Real-time Advanced reporting from live client data.</p>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Revenue (Est.)"
                    value={`$${metrics.totalRevenue}`}
                    trend="+14.5%"
                    icon={<DollarSign className="w-5 h-5 text-green-600" />}
                    bg="bg-green-50"
                />
                <MetricCard
                    title="Client Retention"
                    value={`${metrics.retentionRate}%`}
                    trend={metrics.retentionRate > 50 ? "+2.4%" : "-1.0%"}
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    bg="bg-blue-50"
                />
                <MetricCard
                    title="Outbound Campaigns"
                    value={metrics.outbound?.totalSent || 0}
                    trend={`Open Rate: ${metrics.outbound?.avgOpenRate || 0}%`}
                    icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                    bg="bg-purple-50"
                />
                <MetricCard
                    title="Booking Conv. Rate"
                    value={`${metrics.convRate}%`}
                    trend="-1.2%"
                    icon={<Activity className="w-5 h-5 text-orange-600" />}
                    bg="bg-orange-50"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Client Behavior Analysis</h2>
                        <div className="p-2 bg-gray-50 rounded-lg">
                            <Users className="w-4 h-4 text-gray-500" />
                        </div>
                    </div>
                    <div className="h-72">
                        {behaviorChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={behaviorChart}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: '#F3F4F6' }}
                                    />
                                    <Bar dataKey="Visits" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Interactions" />
                                    <Bar dataKey="Bookings" fill="#10B981" radius={[4, 4, 0, 0]} name="Bookings" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                No activity data yet.
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Revenue Forecast</h2>
                        <div className="p-2 bg-gray-50 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-gray-500" />
                        </div>
                    </div>
                    <div className="h-72">
                        {revenueChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueChart}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <defs>
                                        <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorPv)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                No revenue data yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Analysis Section */}
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <SparklesIcon className="w-6 h-6 text-yellow-300" />
                        <h2 className="text-xl font-bold">AI Strategic Recommendations</h2>
                    </div>
                    <p className="text-indigo-100 max-w-3xl mb-6 leading-relaxed text-lg">
                        {aiRecommendation}
                    </p>
                    <button className="px-6 py-2 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors">
                        Generate Full Report
                    </button>
                </div>
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, trend, icon, bg }: any) {
    const isPositive = trend.startsWith('+');
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bg}`}>
                    {icon}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {trend}
                </span>
            </div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
    )
}
