'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export const Navbar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 px-4 md:px-6 py-4 transition-all duration-300 backdrop-blur-xl bg-white/70 border-b border-white/50 shadow-sm supports-[backdrop-filter]:bg-white/60">
            <div className="container mx-auto flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2 relative z-50">
                    <Link href="/">
                        <img src="/logo.jpg" alt="ScriptishRx Logo" className="h-16 w-auto object-contain cursor-pointer" />
                    </Link>
                </div>

                {/* Desktop Nav */}
                <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
                    <Link href="/#features" className="hover:text-primary-start transition-colors">Platform</Link>
                    <Link href="/#solutions" className="hover:text-primary-start transition-colors">Solutions</Link>
                    <Link href="/#pricing" className="hover:text-primary-start transition-colors">Pricing</Link>
                    <Link href="/legal" className="hover:text-primary-start transition-colors">Legal</Link>
                </div>

                <div className="hidden md:flex gap-4">
                    <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2">
                        Log in
                    </Link>
                    <Link href="/register" className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-shadow shadow-lg shadow-slate-900/20">
                        Get Started
                    </Link>
                </div>

                {/* Mobile Hamburger */}
                <button
                    className="md:hidden relative z-50 p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay & Drawer */}
            <div className={cn(
                "fixed inset-0 z-[9999] md:hidden transition-all duration-300",
                mobileMenuOpen ? "visible" : "invisible delay-300"
            )}>
                {/* Backdrop */}
                <div
                    className={cn(
                        "absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300",
                        mobileMenuOpen ? "opacity-100" : "opacity-0"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                />

                {/* Drawer */}
                <div className={cn(
                    "absolute right-0 top-0 h-[100dvh] w-[85vw] max-w-xs bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col",
                    mobileMenuOpen ? "translate-x-0" : "translate-x-full"
                )}>
                    {/* Drawer Header (User Profile Placeholder) */}
                    <div className="flex-none flex flex-col gap-4 p-6 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                    <span className="font-bold text-lg">?</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Welcome</p>
                                    <p className="text-xs text-slate-500">Guest User</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {/* Auth CTA Section */}
                        <div className="p-6 border-b border-slate-100 space-y-3">
                            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                                <Button className="w-full text-base font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md">
                                    Join for Free
                                </Button>
                            </Link>
                            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="outline" className="w-full text-base font-bold border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900">
                                    Log in
                                </Button>
                            </Link>
                        </div>

                        {/* Navigation Links */}
                        <div className="py-2">
                            <p className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Explore</p>
                            <div className="flex flex-col">
                                {[
                                    { label: 'Platform Features', href: '/#features' },
                                    { label: 'Solutions', href: '/#solutions' },
                                    { label: 'Pricing Plans', href: '/#pricing' },
                                    { label: 'Legal Center', href: '/legal' },
                                    { label: 'Contact Support', href: '/#contact' }
                                ].map((item) => (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center justify-between px-6 py-4 text-slate-700 hover:bg-slate-50 hover:text-purple-600 transition-colors group border-l-4 border-transparent hover:border-purple-600"
                                    >
                                        <span className="font-medium">{item.label}</span>
                                        <span className="text-slate-300 group-hover:text-purple-600 transition-colors">›</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Drawer Footer */}
                    <div className="flex-none p-6 border-t border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium cursor-pointer hover:text-slate-900">
                            <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">🌐</span>
                            <span>English</span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};
