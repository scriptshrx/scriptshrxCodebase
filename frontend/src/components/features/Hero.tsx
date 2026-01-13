'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Star, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

export const Hero = () => {
    const [showVideo, setShowVideo] = useState(false);

    return (
        <section className="relative pt-24 md:pt-32 pb-16 md:pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-purple-200/40 rounded-full blur-3xl" />
                <div className="absolute top-[10%] right-[0%] w-[50%] h-[60%] bg-indigo-200/40 rounded-full blur-3xl" />
                <div className="absolute bottom-[0%] left-[20%] w-[40%] h-[40%] bg-pink-200/30 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16">

                    {/* Left Content */}
                    <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-medium text-primary-start"
                        >
                            <Star className="w-4 h-4 fill-primary-start" />
                            <span>Best AI Business Operations Platform • 99% Satisfaction</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="text-4xl md:text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] md:leading-[1.1]"
                        >
                            Make The Best <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-start to-primary-end">
                                Business Decisions
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-xl text-slate-600 max-w-lg mx-auto lg:mx-0 leading-relaxed"
                        >
                            Streamline your business operations with our AI-powered concierge.
                            Booking, CRM, and client management—all in one place.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                        >
                            <Link href="/register">
                                <Button size="lg" className="rounded-full px-8 bg-primary-start hover:bg-primary-end shadow-lg shadow-primary-start/25 text-white">
                                    Get Started
                                </Button>
                            </Link>
                            <Button
                                onClick={() => setShowVideo(true)}
                                variant="outline"
                                size="lg"
                                className="rounded-full px-8 border-slate-200 text-slate-700 hover:bg-slate-50 bg-white"
                            >
                                <Play className="w-4 h-4 mr-2 fill-slate-700" /> Watch Demo
                            </Button>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            className="pt-8 flex items-center justify-center lg:justify-start gap-8 grayscale opacity-60"
                        >
                            {/* Trusted by Logos (Text for now) */}
                            <span className="font-bold text-slate-400 text-lg">TechFlow</span>
                            <span className="font-bold text-slate-400 text-lg">GlobalScale</span>
                            <span className="font-bold text-slate-400 text-lg">NexusCorp</span>
                        </motion.div>
                    </div>

                    {/* Right Visual (Phones) */}
                    <div className="lg:w-1/2 relative h-[600px] w-full flex items-center justify-center">
                        {/* Circle Background */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-100 to-indigo-100 rounded-full blur-3xl opacity-60 scale-75" />

                        {/* Phone 1 (Left, Behind) */}
                        <motion.div
                            initial={{ opacity: 0, x: -50, rotate: -15 }}
                            animate={{ opacity: 1, x: -120, y: 40, rotate: -12 }}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="absolute w-[260px] h-[520px] bg-white rounded-[40px] border-8 border-slate-900 shadow-2xl overflow-hidden z-10 hidden md:block"
                        >
                            <div className="absolute top-0 w-full h-8 bg-slate-100 border-b border-slate-200" />
                            <div className="p-6 mt-8 space-y-4">
                                <div className="h-8 w-1/2 bg-slate-100 rounded-lg animate-pulse" />
                                <div className="h-32 w-full bg-slate-50 rounded-xl border border-slate-100" />
                                <div className="space-y-2">
                                    <div className="h-4 w-full bg-slate-100 rounded" />
                                    <div className="h-4 w-3/4 bg-slate-100 rounded" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Phone 2 (Right, Behind) */}
                        <motion.div
                            initial={{ opacity: 0, x: 50, rotate: 15 }}
                            animate={{ opacity: 1, x: 120, y: 40, rotate: 12 }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="absolute w-[260px] h-[520px] bg-white rounded-[40px] border-8 border-slate-900 shadow-2xl overflow-hidden z-10 hidden md:block"
                        >
                            <div className="absolute top-0 w-full h-8 bg-slate-100 border-b border-slate-200" />
                            <div className="p-6 mt-8 space-y-4">
                                <div className="h-40 w-full bg-indigo-50 rounded-xl mb-4" />
                                <div className="h-8 w-2/3 bg-slate-100 rounded-lg animate-pulse" />
                                <div className="h-4 w-full bg-slate-100 rounded" />
                            </div>
                        </motion.div>

                        {/* Phone 3 (Center, Front) */}
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="relative w-[280px] h-[560px] bg-slate-900 rounded-[45px] shadow-2xl overflow-hidden z-20 ring-8 ring-slate-900/5"
                        >
                            {/* Screen */}
                            <div className="w-full h-full bg-white relative overflow-hidden flex flex-col">
                                {/* Status Bar */}
                                <div className="h-12 w-full bg-white flex items-end justify-center pb-2 px-6">
                                    <div className="w-20 h-6 bg-slate-900 rounded-full" />
                                </div>

                                {/* App Header */}
                                <div className="px-6 pt-4 pb-6 bg-white">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="w-8 h-8 rounded-full bg-slate-100" />
                                        <div className="w-8 h-8 rounded-full bg-slate-100" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-2xl font-bold text-slate-900">Hello, Alex</div>
                                        <div className="text-sm text-slate-500">You have 5 new leads today</div>
                                    </div>
                                </div>

                                {/* App Body */}
                                <div className="flex-1 bg-slate-50 p-6 space-y-4">
                                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">JD</div>
                                            <div>
                                                <div className="font-bold text-slate-900">John Doe</div>
                                                <div className="text-xs text-slate-500">10:00 AM • Consult</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-primary-start rounded-2xl shadow-lg shadow-primary-start/20 text-white">
                                        <div className="text-sm opacity-80 mb-1">Total Revenue</div>
                                        <div className="text-3xl font-bold">$12,450</div>
                                        <div className="text-xs mt-2 flex items-center gap-1">
                                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">+15%</span>
                                            <span className="opacity-60">vs last month</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 h-24" />
                                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 h-24" />
                                    </div>
                                </div>

                                {/* Bottom Nav */}
                                <div className="h-20 bg-white border-t border-slate-100 flex items-center justify-around px-6 pb-4">
                                    <div className="w-6 h-6 bg-indigo-500 rounded-full" />
                                    <div className="w-6 h-6 bg-slate-200 rounded-full" />
                                    <div className="w-6 h-6 bg-slate-200 rounded-full" />
                                    <div className="w-6 h-6 bg-slate-200 rounded-full" />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Video Modal */}
            {showVideo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowVideo(false)}
                            className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <video
                            src="/upload/intro.mp4"
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>
            )}
        </section>
    );
};
