'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, RefreshCw, CalendarCheck, Loader2, ArrowRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink: string;
}

export function GoogleCalendarWidget() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchEvents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/calendar/events');
            if (data.connected) {
                setIsConnected(true);
                setEvents(data.events || []);
            } else {
                setIsConnected(false);
            }
        } catch (err: any) {
            console.error('Failed to fetch calendar:', err);
            if (err.response?.status === 401) {
                setIsConnected(false);
            } else {
                setError('Could not load calendar data');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 300000); // 5 min poll
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        try {
            const { data } = await api.get('/auth/google');
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (e) {
            console.error('Failed to start auth:', e);
            setError('Failed to initiate connection');
        }
    };

    // --- Calendar Logic ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const hasEventOnDay = (day: number) => {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return events.some(event => {
            const eventDateStr = event.start.dateTime || event.start.date;
            if (!eventDateStr) return false;
            const eventDate = new Date(eventDateStr);
            return isSameDay(targetDate, eventDate);
        });
    };

    const getEventsForSelectedDay = () => {
        return events.filter(event => {
            const eventDateStr = event.start.dateTime || event.start.date;
            if (!eventDateStr) return false;
            const eventDate = new Date(eventDateStr);
            return isSameDay(selectedDate, eventDate);
        });
    };

    const formatTime = (dateObj: { dateTime?: string; date?: string }) => {
        if (dateObj.dateTime) {
            return new Date(dateObj.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
        return 'All Day';
    };

    // Render Logic
    const daysInMonth = getDaysInMonth(currentDate);
    const startDay = getFirstDayOfMonth(currentDate);
    const days = Array.from({ length: 42 }, (_, i) => {
        const dayNumber = i - startDay + 1;
        return (dayNumber > 0 && dayNumber <= daysInMonth) ? dayNumber : null;
    });

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    if (!isConnected) {
        return (
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-sm flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <CalendarCheck className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="text-slate-900 font-bold mb-2 text-lg">Connect Google Calendar</h4>
                <p className="text-slate-500 text-sm mb-8 max-w-[240px]">
                    Sync your schedule to see your monthly overview and upcoming events directly here.
                </p>
                <Button onClick={handleConnect} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Connect Now
                </Button>
            </div>
        );
    }

    const displayedEvents = getEventsForSelectedDay();

    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-sm relative overflow-hidden flex flex-col gap-6">

            {/* Header: Month & Navigation */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                        {monthNames[currentDate.getMonth()]} <span className="text-slate-400 font-medium">{currentDate.getFullYear()}</span>
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div>
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-xs font-bold text-slate-400 py-1 uppercase tracking-wider">{day}</div>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                    {days.map((day, idx) => {
                        if (day === null) return <div key={idx} className="h-10" />; // Empty slot

                        const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const isToday = isSameDay(new Date(), currentDayDate);
                        const isSelected = isSameDay(selectedDate, currentDayDate);
                        const hasEvents = hasEventOnDay(day);

                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(currentDayDate)}
                                className={cn(
                                    "h-10 w-full rounded-xl flex flex-col items-center justify-center relative transition-all duration-200",
                                    isSelected ? "bg-slate-900 text-white shadow-md shadow-slate-300 scale-105" : "hover:bg-slate-100 text-slate-700",
                                    isToday && !isSelected ? "bg-blue-50 text-blue-600 font-bold" : ""
                                )}
                            >
                                <span className={cn("text-sm", isSelected || isToday ? "font-bold" : "font-medium")}>
                                    {day}
                                </span>
                                {hasEvents && (
                                    <div className={cn(
                                        "w-1 h-1 rounded-full mt-0.5",
                                        isSelected ? "bg-white/70" : "bg-blue-500"
                                    )} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Agenda */}
            <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-900">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h4>
                    {/* Sync Button */}
                    <button
                        onClick={fetchEvents}
                        className="text-slate-300 hover:text-slate-500 transition-colors"
                        title="Sync Calendar"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                    </button>
                </div>

                <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {displayedEvents.length === 0 ? (
                        <div className="text-center py-6">
                            <p className="text-xs text-slate-400 font-medium italic">No events scheduled.</p>
                        </div>
                    ) : (
                        displayedEvents.map(event => (
                            <a
                                key={event.id}
                                href={event.htmlLink}
                                target="_blank"
                                rel="noreferrer"
                                className="block bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 p-3 rounded-xl transition-all group"
                            >
                                <div className="flex gap-3 items-start">
                                    <div className="w-1 h-full min-h-[32px] bg-blue-500 rounded-full" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                            {event.summary || '(No Title)'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                            {formatTime(event.start)} - {formatTime(event.end)}
                                        </p>
                                    </div>
                                </div>
                            </a>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Link */}
            <div className="absolute bottom-4 right-4 opacity-50 hover:opacity-100 transition-opacity">
                <a href="https://calendar.google.com" target="_blank" rel="noreferrer">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                </a>
            </div>
        </div>
    );
}
