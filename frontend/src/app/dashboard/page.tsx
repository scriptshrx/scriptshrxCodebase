'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    Users, DollarSign, Clock, Activity, RefreshCw, Calendar, Zap,
    ArrowUpRight, ArrowDownRight, Phone, Shield, Search, Bell, Menu,
    Globe, Server, Cpu, Radio, ChevronRight, X, User, Play, Pause, Volume2, VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useDashboardStats, useVoiceStats } from '@/hooks/useDashboardData';
import { RecentBookings } from '@/components/dashboard/RecentBookings';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ServiceList } from '@/components/dashboard/ServiceList';

import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import Link from 'next/link';

// --- Variants for Animations ---
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 120 }
    }
};

export default function DashboardPage() {
    // Poll data every 5s for that "live" feel
    const { data: stats, isLoading, refetch, isRefetching } = useDashboardStats();
    // New Dedicated Voice Stats
    const { data: voiceStats, isLoading: voiceLoading } = useVoiceStats();

    // UI States
    const [liveUsers, setLiveUsers] = useState(1); // Default to 1 (You)
    const [systemLoad, setSystemLoad] = useState(10); // Low load default
    const [greetingMessage, setGreetingMessage] = useState('');
    const [isVideoPlaying, setIsVideoPlaying] = useState(true); // Video starts playing
    const [isVideoMuted, setIsVideoMuted] = useState(true); // Video starts muted
    const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

    // Poll System Status
    useEffect(() => {
        const fetchSystemStatus = async () => {
            try {
                // Fetch real server metrics if available
                const { data } = await import('@/lib/api').then(m => m.default.get('/insights'));
                if (data.system) {
                    setLiveUsers(data.system.activeUsers || 1);
                    setSystemLoad(data.system.cpuLoad || Math.floor(Math.random() * 20) + 10);
                } else {
                    // Simulate subtle fluctuations for "alive" feel if backend endpoint missing
                    setSystemLoad(prev => Math.min(100, Math.max(5, prev + (Math.random() > 0.5 ? 2 : -2))));
                }
            } catch (e) {
                // Fallback
            }
        };

        const interval = setInterval(fetchSystemStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // Set Greeting with First Name
    useEffect(() => {
        const hour = new Date().getHours();
        let baseGreeting = '';
        if (hour < 12) baseGreeting = 'Good Morning';
        else if (hour < 18) baseGreeting = 'Good Afternoon';
        else baseGreeting = 'Good Evening';

        const fetchUser = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                // Get user from API or LocalStorage cache
                const userStr = localStorage.getItem('user');
                let firstName = 'User';

                if (userStr) {
                    const user = JSON.parse(userStr);
                    if (user.name) firstName = user.name.split(' ')[0];
                } else {
                    const { data } = await import('@/lib/api').then(m => m.default.get('/auth/me')); // Ensure fetching 'me'
                    if (data.user?.name) firstName = data.user.name.split(' ')[0];
                }

                setGreetingMessage(`${baseGreeting}, ${firstName}`);
            } catch (e) {
                setGreetingMessage(`${baseGreeting}, User`);
            }
        };
        fetchUser();
    }, []);

    const handleRefresh = async () => {
        await refetch();
    };

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
    });

    const formatDuration = (val: number) => {
        const mins = Math.floor(val / 60);
        const secs = Math.floor(val % 60);
        return `${mins}m ${secs}s`;
    };

    return (
        <motion.div
            className="min-h-screen text-slate-800 p-4 md:p-8 space-y-8 relative overflow-x-hidden"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-500/10 rounded-full blur-[120px] opacity-60 animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-violet-500/10 rounded-full blur-[120px] opacity-60 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* --- HEADER SECTION --- */}
            <motion.div variants={itemVariants} className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        {greetingMessage}
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 tracking-wide uppercase">
                            Live
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        ScriptishRx Command Center
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-slate-400">{currentDate}</span>
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* System Status Indicators */}
                    <div className="hidden md:flex items-center gap-6 px-6 py-3 bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm mr-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Users className="w-5 h-5 text-blue-600" />
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Users</p>
                                <p className="text-sm font-bold text-slate-800">{liveUsers}</p>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="flex items-center gap-3">
                            <Cpu className="w-5 h-5 text-violet-600" />
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Load</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-violet-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${systemLoad}%` }}
                                            transition={{ type: "spring", bounce: 0 }}
                                        />
                                    </div>
                                    <p className="text-xs font-bold text-slate-800">{systemLoad}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        onClick={handleRefresh}
                        className={cn(
                            "h-12 px-6 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 hover:shadow-xl transition-all duration-300 font-bold",
                            isRefetching && "opacity-90"
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
                        {isRefetching ? 'Syncing...' : 'Sync Data'}
                    </Button>
                </div>
            </motion.div>

            {/* --- PROMOTIONAL VIDEO SECTION --- */}
            <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl border border-white/50 shadow-2xl shadow-slate-200/50 bg-white/70 backdrop-blur-xl">
                {/* Gradient Overlay Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {/* Video Container with Aspect Ratio */}
                <div className="relative w-full aspect-video overflow-hidden bg-gray-200">
                    <video
                        ref={setVideoRef}
                        autoPlay
                        muted={isVideoMuted}
                        loop
                        playsInline
                        className="w-full h-full object-contain"
                        onPlay={() => setIsVideoPlaying(true)}
                        onPause={() => setIsVideoPlaying(false)}
                    >
                        <source
                            src="https://res.cloudinary.com/dadvxxgl1/video/upload/v1769997501/adforScriptihrx_lvyn7l.mp4"
                            type="video/mp4"
                        />
                        Your browser does not support the video tag.
                    </video>
                    
                    {/* Subtle Vignette Effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent pointer-events-none" />

                    {/* Custom Video Controls */}
                    <div className="absolute bottom-4 right-4 flex gap-3 z-10">
                        {/* Play/Pause Button */}
                        <button
                            onClick={() => {
                                if (videoRef) {
                                    if (isVideoPlaying) {
                                        videoRef.pause();
                                        setIsVideoPlaying(false);
                                    } else {
                                        videoRef.play();
                                        setIsVideoPlaying(true);
                                    }
                                }
                            }}
                            className="p-3 bg-white/80 hover:bg-white rounded-full backdrop-blur-md transition-all duration-200 shadow-lg hover:shadow-xl"
                            title={isVideoPlaying ? "Pause" : "Play"}
                        >
                            {isVideoPlaying ? (
                                <Pause className="w-5 h-5 text-slate-900 fill-slate-900" />
                            ) : (
                                <Play className="w-5 h-5 text-slate-900 fill-slate-900" />
                            )}
                        </button>

                        {/* Mute/Unmute Button */}
                        <button
                            onClick={() => {
                                if (videoRef) {
                                    videoRef.muted = !isVideoMuted;
                                    setIsVideoMuted(!isVideoMuted);
                                }
                            }}
                            className="p-3 bg-white/80 hover:bg-white rounded-full backdrop-blur-md transition-all duration-200 shadow-lg hover:shadow-xl"
                            title={isVideoMuted ? "Unmute" : "Mute"}
                        >
                            {isVideoMuted ? (
                                <VolumeX className="w-5 h-5 text-slate-900" />
                            ) : (
                                <Volume2 className="w-5 h-5 text-slate-900" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Info Bar Below Video */}
                <div className="relative p-6 md:p-8 border-t border-white/30">
                    <h3 className="text-lg font-bold text-slate-900">ScriptishRx in Action</h3>
                    <p className="text-sm text-slate-500 mt-1">Discover how our AI-powered platform transforms your workflow</p>
                </div>
            </motion.div>

            {/* --- HERO STATS GRID --- */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <PremiumStatCard
                    title="Voice Interactions"
                    value={voiceStats?.callsToday?.toLocaleString() || '0'}
                    trend="+12%"
                    trendUp={true}
                    icon={Radio}
                    color="blue"
                    index={0}
                />
                <PremiumStatCard
                    title="Total Revenue"
                    value={`$${stats?.revenue?.toLocaleString() || '0'}`}
                    trend="+8.2%"
                    trendUp={true}
                    icon={DollarSign}
                    color="emerald"
                    index={1}
                />
                <PremiumStatCard
                    title="Active Clients"
                    value={stats?.totalClients?.toLocaleString() || '0'}
                    trend="+24%"
                    trendUp={true}
                    icon={Users}
                    color="violet"
                    index={2}
                />
                <PremiumStatCard
                    title="Pending Bookings"
                    value={stats?.bookingsCount?.toLocaleString() || '0'}
                    trend="-2%"
                    trendUp={false}
                    icon={Clock}
                    color="amber"
                    index={3}
                />
            </motion.div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Left Col: Analytics & Revenue */}
                <motion.div variants={itemVariants} className="xl:col-span-2 space-y-8">
                    {/* Charts Card */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Revenue Analytics</h3>
                                <p className="text-slate-500 text-sm">Financial performance over the last 30 days</p>
                            </div>
                            <div className="flex gap-2">
                                {['1D', '1W', '1M', '1Y'].map(range => (
                                    <button
                                        key={range}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${range === '1M' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <RevenueChart />
                    </div>

                    {/* Quick Services List */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 border border-white/50 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Top Services</h3>
                            <button className="text-sm font-bold text-blue-600 hover:text-blue-700">View All</button>
                        </div>
                        <ServiceList />
                    </div>
                </motion.div>

                {/* Right Col: AI Agent & Recent Activity */}
                <motion.div variants={itemVariants} className="space-y-8">

                    {/* AI Agent Status Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-200">
                        {/* Animated Background Mesh */}
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[80px]" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[80px]" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-8">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                    <Zap className="w-8 h-8 text-yellow-400" />
                                </div>
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                                    Twilio Agent Active
                                </span>
                            </div>

                            <h3 className="text-2xl font-bold mb-2">Twilio Agent</h3>
                            <p className="text-slate-400 text-sm mb-6">Handling inbound inquiries and scheduling via Twilio.</p>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Calls Today</span>
                                    <span className="font-bold text-xl">{voiceStats?.callsToday || 0}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Avg Duration</span>
                                    <span className="font-mono text-slate-200">{formatDuration(voiceStats?.averageDuration || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Sentiment</span>
                                    <span className="text-emerald-400 font-bold">{voiceStats?.Sentiment || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10">
                                <Link
                                    href="/dashboard/voice"
                                    className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Activity className="w-4 h-4" /> View Live Logs
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Recent Bookings Feed - REMOVED h-full to prevent layout issues */}
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-1 border border-white/50 shadow-sm">
                        <RecentBookings />
                    </div>

                    {/* Professional Calendar Widget */}
                    <CalendarWidget />
                </motion.div>
            </div>
        </motion.div>
    );
}

// --- Premium Stat Card Component ---
function PremiumStatCard({ title, value, trend, trendUp, icon: Icon, color, index }: any) {
    const colors = {
        blue: 'from-blue-500 to-indigo-600 shadow-blue-200 text-blue-600 bg-blue-50',
        emerald: 'from-emerald-500 to-teal-600 shadow-emerald-200 text-emerald-600 bg-emerald-50',
        violet: 'from-violet-500 to-purple-600 shadow-violet-200 text-violet-600 bg-violet-50',
        amber: 'from-amber-400 to-orange-500 shadow-amber-200 text-amber-600 bg-amber-50',
    };

    // @ts-ignore
    const theme = colors[color] || colors.blue;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-lg shadow-slate-100/50 group overflow-hidden"
        >
            <div className={`absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300 transform group-hover:scale-110`}>
                <Icon className="w-32 h-32 text-slate-900" />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-6">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${theme.split(' ').slice(0, 2).join(' ')} text-white shadow-lg`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>

                <div>
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">{title}</h3>
                    <div className="flex items-end gap-3">
                        <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
                        {trend && (
                            <div className={cn(
                                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg mb-1",
                                trendUp ? "text-emerald-700 bg-emerald-100" : "text-rose-700 bg-rose-100"
                            )}>
                                {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {trend}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
