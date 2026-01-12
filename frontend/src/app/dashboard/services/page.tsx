'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users, Clock, ShoppingBag, DollarSign, Search, Filter,
    ArrowUpRight, ArrowDownRight, MoreHorizontal, Briefcase,
    Stethoscope, Coffee, Wifi, Settings
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useDashboardStats } from '@/hooks/useDashboardData';
import { cn } from '@/lib/utils';

export default function ServicesPage() {
    const { data: stats, isLoading } = useDashboardStats();
    const [searchTerm, setSearchTerm] = useState('');
    const [services, setServices] = useState<any[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(true);

    // Fetch services from API
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await fetch('/api/services');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.services)) {
                        setServices(data.services);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch services", error);
            } finally {
                setIsLoadingServices(false);
            }
        };
        fetchServices();
    }, []);

    const enrichedServices = services.map(svc => {
        const foundStat = stats?.topServices?.find((s: any) => s.name === svc.name);
        return {
            ...svc,
            bookings: foundStat?.count || 0,
            trend: foundStat ? "+12%" : "stable",
            // Provide default icon if missing/string (assumes Icon component or mapping needed in real app)
            // For now, mapping name to icon loosely or defaulting
            icon: svc.icon || Briefcase,
            bg: svc.bg || 'bg-slate-100',
            color: svc.color || 'text-slate-600'
        };
    }).filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Service Directory</h1>
                    <p className="text-slate-500 mt-1">Manage service offerings, pricing, and availability.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 bg-white hover:bg-slate-50">
                        <Filter className="w-4 h-4" /> Filter
                    </Button>
                    <Button className="gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200">
                        <Settings className="w-4 h-4" /> Configure
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Services</p>
                        <p className="text-3xl font-extrabold text-slate-900 mt-1">{services.length}</p>
                    </div>
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <Briefcase className="w-6 h-6" />
                    </div>
                </GlassCard>
                <GlassCard className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Offerings</p>
                        <p className="text-3xl font-extrabold text-slate-900 mt-1">
                            {services.filter(s => s.status === 'Active').length}
                        </p>
                    </div>
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Clock className="w-6 h-6" />
                    </div>
                </GlassCard>
                <GlassCard className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Avg. Price</p>
                        <p className="text-3xl font-extrabold text-slate-900 mt-1">$45.00</p>
                    </div>
                    <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </GlassCard>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 shadow-sm"
                />
            </div>

            {/* Services List Table */}
            <GlassCard className="p-0 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Service Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Price / Duration</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Usage Trend</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading || isLoadingServices ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading directory...</td></tr>
                        ) : enrichedServices.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">No services found.</td></tr>
                        ) : (
                            enrichedServices.map((service) => (
                                <tr key={service.id} className="group hover:bg-slate-50/80 transition-colors cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("p-3 rounded-xl", service.bg)}>
                                                <service.icon className={cn("w-5 h-5", service.color)} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{service.name}</p>
                                                <p className="text-xs text-slate-500">ID: SVC-{service.id.padStart(3, '0')}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                            {service.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900">{service.price}</p>
                                        <p className="text-xs text-slate-500">{service.duration}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-bold text-slate-900">{service.bookings} uses</span>
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    service.trend.includes('+') ? "text-emerald-600" : "text-slate-500"
                                                )}>
                                                    {service.trend}
                                                </span>
                                            </div>
                                            {service.trend.includes('+') ? (
                                                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <ArrowDownRight className="w-4 h-4 text-slate-400" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                                            service.status === 'Active' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-200"
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", service.status === 'Active' ? "bg-emerald-500" : "bg-slate-400")} />
                                            {service.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="icon" className="hover:bg-slate-200">
                                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </GlassCard>
        </div>
    );
}
