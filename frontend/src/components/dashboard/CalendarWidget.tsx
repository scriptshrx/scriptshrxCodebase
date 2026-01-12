'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    RefreshCw,
    Video,
    Clock,
    Calendar as CalendarIcon,
    LayoutGrid,
    List,
    ExternalLink
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    link?: string;
}

type ViewMode = 'month' | 'week' | 'agenda';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function CalendarWidget() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('month');

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/calendar/events');
            if (data.connected) {
                setIsConnected(true);
                const mappedEvents = (data.events || []).map((e: any) => ({
                    id: e.id,
                    title: e.summary || '(No Title)',
                    start: new Date(e.start.dateTime || e.start.date),
                    end: new Date(e.end.dateTime || e.end.date),
                    allDay: !e.start.dateTime,
                    link: e.htmlLink
                }));
                setEvents(mappedEvents);
            } else {
                setIsConnected(false);
            }
        } catch (err) {
            console.error('Failed to fetch calendar:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 300000);
        return () => clearInterval(interval);
    }, [fetchEvents]);

    const handleConnect = async () => {
        try {
            const { data } = await api.get('/auth/google');
            if (data.url) window.location.href = data.url;
        } catch (e) {
            console.error('Failed to start auth:', e);
        }
    };

    // Calendar Logic
    const { year, month } = useMemo(() => ({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth()
    }), [currentDate]);

    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startOffset = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const days: { date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startOffset - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false,
                isToday: false,
                isSelected: false
            });
        }

        // Current month days
        const today = new Date();
        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(year, month, d);
            days.push({
                date,
                isCurrentMonth: true,
                isToday: date.toDateString() === today.toDateString(),
                isSelected: selectedDate ? date.toDateString() === selectedDate.toDateString() : false
            });
        }

        // Next month days to fill grid
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false,
                isToday: false,
                isSelected: false
            });
        }

        return days;
    }, [year, month, selectedDate]);

    const getEventsForDate = (date: Date) => {
        return events.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate.toDateString() === date.toDateString();
        });
    };

    const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    const weekDays = useMemo(() => {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - start.getDay());
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [currentDate]);

    const navigateMonth = (delta: number) => {
        setCurrentDate(new Date(year, month + delta, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    return (
        <div className="bg-gradient-to-br from-white/80 via-white/70 to-slate-50/80 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100/80 bg-gradient-to-r from-slate-50/50 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Navigation */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-100 p-1">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigateMonth(-1)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={goToToday}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Today
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigateMonth(1)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </motion.button>
                        </div>

                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                                {MONTHS[month]} <span className="text-slate-400">{year}</span>
                            </h2>
                        </div>
                    </div>

                    {/* View Switcher & Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* View Modes */}
                        <div className="flex bg-slate-100/80 rounded-xl p-1">
                            {[
                                { key: 'month', icon: LayoutGrid, label: 'Month' },
                                { key: 'agenda', icon: List, label: 'Agenda' }
                            ].map(({ key, icon: Icon, label }) => (
                                <motion.button
                                    key={key}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setViewMode(key as ViewMode)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                        viewMode === key
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{label}</span>
                                </motion.button>
                            ))}
                        </div>

                        {/* Sync/Connect */}
                        {!isConnected ? (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleConnect}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Connect Google</span>
                                <span className="sm:hidden">Sync</span>
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.05, rotate: 180 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={fetchEvents}
                                className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all"
                                title="Refresh"
                            >
                                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>

            {/* Calendar Body */}
            <div className="p-4 sm:p-6">
                <AnimatePresence mode="wait">
                    {viewMode === 'month' && (
                        <motion.div
                            key="month"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 mb-2">
                                {WEEKDAYS.map((day, i) => (
                                    <div
                                        key={day}
                                        className={cn(
                                            "text-center text-xs font-bold py-2",
                                            i === 0 || i === 6 ? "text-slate-400" : "text-slate-500"
                                        )}
                                    >
                                        <span className="hidden sm:inline">{day}</span>
                                        <span className="sm:hidden">{day.charAt(0)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                {calendarDays.map((day, i) => {
                                    const dayEvents = getEventsForDate(day.date);
                                    const hasEvents = dayEvents.length > 0;

                                    return (
                                        <motion.button
                                            key={i}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setSelectedDate(day.date)}
                                            className={cn(
                                                "relative aspect-square sm:aspect-[4/3] p-1 sm:p-2 rounded-xl transition-all text-left flex flex-col",
                                                day.isCurrentMonth
                                                    ? "bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 shadow-sm hover:shadow"
                                                    : "bg-slate-50/50 text-slate-400 hover:bg-slate-100/50",
                                                day.isToday && "ring-2 ring-blue-500 ring-offset-1",
                                                day.isSelected && "bg-blue-50 border-blue-200 hover:bg-blue-100"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-xs sm:text-sm font-semibold",
                                                day.isToday && "text-blue-600",
                                                day.isSelected && !day.isToday && "text-blue-700"
                                            )}>
                                                {day.date.getDate()}
                                            </span>

                                            {/* Event Indicators */}
                                            {hasEvents && (
                                                <div className="mt-auto flex flex-wrap gap-0.5">
                                                    {dayEvents.slice(0, 3).map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                                        />
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold ml-0.5">
                                                            +{dayEvents.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {viewMode === 'agenda' && (
                        <motion.div
                            key="agenda"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                        >
                            {events.length === 0 ? (
                                <div className="text-center py-12">
                                    <CalendarIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">No upcoming events</p>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {isConnected ? "Your calendar is empty" : "Connect Google Calendar to see events"}
                                    </p>
                                </div>
                            ) : (
                                events.slice(0, 10).map((event, i) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group"
                                    >
                                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                            <span className="text-lg font-bold">{event.start.getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                                {event.title}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>
                                                    {event.allDay ? 'All Day' : event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-slate-300">•</span>
                                                <span>{WEEKDAYS_FULL[event.start.getDay()]}</span>
                                            </div>
                                        </div>
                                        {event.link && (
                                            <a
                                                href={event.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-shrink-0 p-2 bg-slate-50 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Selected Date Events Panel */}
            <AnimatePresence>
                {selectedDate && viewMode === 'month' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white overflow-hidden"
                    >
                        <div className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-900">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </h3>
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                                >
                                    Close
                                </button>
                            </div>

                            {selectedDateEvents.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">No events scheduled</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedDateEvents.map(event => (
                                        <div
                                            key={event.id}
                                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm"
                                        >
                                            <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-slate-900 truncate">{event.title}</p>
                                                <p className="text-xs text-slate-500">
                                                    {event.allDay ? 'All Day' : event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {event.link && (
                                                <a
                                                    href={event.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                                >
                                                    <Video className="w-3 h-3" />
                                                    Open
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
