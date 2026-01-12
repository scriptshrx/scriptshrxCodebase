import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useRecentBookings } from '@/hooks/useDashboardData';
import { cn } from '@/lib/utils';

export function RecentBookings({ clean = false }: { clean?: boolean }) {
    const { data: bookings, isLoading } = useRecentBookings();

    const Content = (
        <div className={cn("w-full", clean ? "" : "p-6")}>
            <div className="flex items-center justify-between mb-6 px-4 pt-4">
                <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 font-bold text-xs">View All</Button>
            </div>

            <div className="overflow-x-auto min-h-[200px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-slate-400">Loading activity...</div>
                ) : (
                    <table className="w-full">
                        <tbody className="divide-y divide-slate-100">
                            {bookings && bookings.length > 0 ? (
                                bookings.map((booking: any, idx: number) => (
                                    <tr key={booking.id || idx} className="group hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200">
                                                    {booking.client?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                        {booking.client?.name || 'Unknown User'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-medium">
                                                        {new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right pr-6">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-sm font-bold text-slate-900">$49.99</span>
                                                <StatusBadge status={booking.status} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={2} className="py-8 text-center text-slate-400 text-sm">No recent activity.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    if (clean) return Content;

    return <GlassCard className="p-0 overflow-hidden">{Content}</GlassCard>;
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        Confirmed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
        Scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/20",
        Cancelled: "bg-rose-500/20 text-rose-400 border-rose-500/20",
        Pending: "bg-orange-500/20 text-orange-400 border-orange-500/20",
    }
    const safeStatus = status || 'Pending';
    // @ts-ignore
    const style = styles[safeStatus] || styles.Pending;

    return (
        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", style)}>
            {safeStatus}
        </span>
    )
}
