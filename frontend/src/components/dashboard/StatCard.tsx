import { GlassCard } from '@/components/ui/GlassCard';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string;
    trend: string;
    icon: any;
    color: string;
    trendUp: boolean;
}

export function StatCard({ title, value, trend, icon: Icon, color, trendUp }: StatCardProps) {
    return (
        <GlassCard className="relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-sm font-medium text-zinc-500 mb-1">{title}</h4>
                    <span className="text-3xl font-bold text-zinc-900 tracking-tight">{value}</span>
                </div>
                <div className={cn("p-2 rounded-lg bg-zinc-100", color)}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
                <span className={cn("flex items-center gap-1", trendUp ? "text-emerald-500" : "text-rose-500")}>
                    {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowRight className="w-3 h-3 rotate-45" />}
                    {trend}
                </span>
                <span className="text-zinc-400">vs last month</span>
            </div>
        </GlassCard>
    );
}
