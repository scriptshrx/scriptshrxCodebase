import { GlassCard } from '@/components/ui/GlassCard';
import { Users, Clock, ShoppingBag, DollarSign, MoreHorizontal, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStats } from '@/hooks/useDashboardData';
import Link from 'next/link';

export function ServiceList() {
    const { data: stats, isLoading } = useDashboardStats();

    // Map icons cyclically for visual variety
    const icons = [Users, Clock, ShoppingBag, DollarSign];
    const colors = [
        { t: "text-purple-600", b: "bg-purple-100" },
        { t: "text-blue-600", b: "bg-blue-100" },
        { t: "text-orange-600", b: "bg-orange-100" },
        { t: "text-emerald-600", b: "bg-emerald-100" }
    ];

    const services = stats?.topServices?.map((s: any, idx: number) => {
        // Calculate trend based on count
        let trend = "stable";
        if (s.count > 20) trend = "High Demand";
        else if (s.count < 5) trend = "-2%";
        else if (s.count > 10) trend = "+5%";

        return {
            name: s.name,
            count: s.count,
            trend: trend,
            icon: icons[idx % icons.length],
            color: colors[idx % colors.length].t,
            bg: colors[idx % colors.length].b
        };
    }) || [];

    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-zinc-900">Top Services</h3>
                <Link href="/dashboard/services" className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
                    View All <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-slate-400">Loading services...</div>
                ) : services.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">No services data available</div>
                ) : (
                    services.map((service: ServiceItemProps, idx: number) => (
                        <ServiceItem key={idx} {...service} />
                    ))
                )}
            </div>
        </GlassCard>
    );
}

interface ServiceItemProps {
    name: string;
    count: number;
    trend: string;
    icon: any;
    color: string;
    bg: string;
}

function ServiceItem({ name, count, trend, icon: Icon, color, bg }: ServiceItemProps) {
    // Dynamic trend styling
    const isPositive = trend.includes('+') || trend === 'High Demand';
    const isNegative = trend.includes('-');

    let trendColor = "text-slate-600 bg-slate-100";
    if (isPositive) trendColor = "text-emerald-600 bg-emerald-50";
    if (isNegative) trendColor = "text-rose-600 bg-rose-50";

    return (
        <div className="flex items-center justify-between group cursor-pointer p-2 rounded-xl hover:bg-zinc-50 transition-colors">
            <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", bg)}>
                    <Icon className={cn("w-5 h-5", color)} />
                </div>
                <div>
                    <h4 className="text-sm font-medium text-zinc-900">{name}</h4>
                    <p className="text-xs text-zinc-500">{count} bookings this week</p>
                </div>
            </div>
            <span className={cn("text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider", trendColor)}>
                {trend}
            </span>
        </div>
    )
}
