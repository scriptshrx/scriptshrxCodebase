'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    Bell,
    Shield,
    Users,
    Smartphone,
    Zap,
    Check,
    ChevronDown,
    ArrowRight,
    Mail,
    Twitter,
    Facebook,
    Instagram,
    Linkedin,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// --- Trusted By ---
export const TrustedBy = () => (
    <section className="py-16 bg-white border-b border-slate-100/50">
        <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-medium text-slate-400 mb-12 uppercase tracking-[0.2em]">Trusted by verified business leaders</p>

            <div className="relative w-full overflow-hidden">
                {/* Gradient Masks for fade effect */}
                <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-white to-transparent z-10" />
                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white to-transparent z-10" />

                {/* Marquee Container */}
                <div className="flex gap-16 md:gap-32 animate-scroll whitespace-nowrap opacity-60 grayscale hover:grayscale-0 transition-all duration-700 items-center">
                    {/* Double the list for infinite scroll illusion */}
                    {[...Array(2)].map((_, i) => (
                        <React.Fragment key={i}>
                            {['TechFlow', 'GlobalScale', 'NexusCorp', 'InnovateX', 'PrimeSystems', 'Vertex Solutions'].map((brand, idx) => (
                                <span key={`${i}-${idx}`} className="text-2xl font-bold text-slate-800 tracking-tight hover:text-primary-start transition-colors cursor-default">
                                    {brand}
                                </span>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>

        <style jsx global>{`
            @keyframes scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
            }
            .animate-scroll {
                animation: scroll 30s linear infinite;
            }
        `}</style>
    </section>
);

// --- Feature Steps ---
export const FeatureSteps = () => (
    <section id="features" className="py-24 bg-white relative overflow-hidden">
        {/* Background Decorative Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent hidden md:block -translate-y-12" />

        <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Make Your Device Manage <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-start to-primary-end">Everything For You!</span>
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto mb-20 text-lg">
                Seamlessly integrate business management into your daily workflow with our three-step process.
            </p>

            <div className="grid md:grid-cols-3 gap-12 relative">
                {[
                    {
                        title: "Sign Up",
                        desc: "Get started instantly by creating your business profile.",
                        icon: Users,
                        color: "bg-pink-100 text-pink-600",
                        step: "01"
                    },
                    {
                        title: "Setup Workflow",
                        desc: "Customize your AI agents and automation rules.",
                        icon: Zap,
                        color: "bg-purple-100 text-purple-600",
                        step: "02"
                    },
                    {
                        title: "Scale Business",
                        desc: "Let AI handle operations while you focus on growth.",
                        icon: BarChart3,
                        color: "bg-indigo-100 text-indigo-600",
                        step: "03"
                    }
                ].map((step, i) => (
                    <div key={i} className="flex flex-col items-center group relative">
                        {/* Connecting Line Segment for Mobile (Vertical) */}
                        {i !== 2 && (
                            <div className="absolute top-24 bottom-[-48px] w-0.5 bg-slate-100 md:hidden" />
                        )}

                        <div className="relative">
                            <div className={cn(
                                "w-24 h-24 rounded-3xl flex items-center justify-center mb-8 transition-all duration-300 shadow-lg group-hover:scale-110 group-hover:rotate-3",
                                step.color,
                                "bg-opacity-80 backdrop-blur-sm border-4 border-white ring-1 ring-slate-100"
                            )}>
                                <step.icon className="w-10 h-10" />
                            </div>

                            {/* Step Number Badge */}
                            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-4 ring-white shadow-md">
                                {step.step}
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-primary-start transition-colors">{step.title}</h3>
                        <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">{step.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// --- Feature Showcase 1 & 2 ---
export const FeatureShowcase = () => (
    <section id="solutions" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-4 space-y-24 md:space-y-32">

            {/* Feature 1 */}
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
                <div className="md:w-1/2 relative flex justify-center w-full">
                    <div className="w-[280px] h-[560px] md:w-[300px] md:h-[600px] bg-white rounded-[40px] shadow-2xl border-8 border-slate-900 p-4 relative z-10 transition-transform hover:scale-105 duration-500">
                        {/* Analytics Visualization */}
                        <div className="w-full h-full bg-slate-50 rounded-[32px] overflow-hidden flex flex-col p-4 space-y-4">
                            <div className="h-40 bg-purple-100 rounded-xl w-full flex items-center justify-center">
                                <BarChart3 className="w-12 h-12 text-purple-600" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-3/4" />
                                <div className="h-4 bg-slate-200 rounded w-1/2" />
                            </div>
                            <div className="flex-1 bg-white rounded-xl border border-slate-100 p-3">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="font-bold text-slate-700">Analytics</div>
                                    <div className="text-xs text-slate-400">Weekly</div>
                                </div>
                                <div className="flex items-end gap-2 h-32 justify-center pb-2">
                                    {[40, 70, 50, 90, 60].map((h, i) => (
                                        <div key={i} className="w-8 bg-indigo-500 rounded-t" style={{ height: `${h}%` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Decor elements */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[100%] bg-purple-200/50 blur-3xl rounded-full -z-0" />
                </div>
                <div className="w-full md:w-1/2 space-y-6 text-center md:text-left">
                    <span className="text-primary-start font-bold tracking-wider text-sm">ANALYTICS</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">Insightful Business Metrics <br /> At A Glance</h2>
                    <p className="text-slate-600 text-lg">Analyze your company's performance with intuitive dashboards. Track client growth, revenue, and satisfaction in real-time.</p>
                    <ul className="space-y-3 inline-block md:block text-left">
                        {['Real-time Data Updates', 'Exportable Reports (PDF/CSV)', 'Custom Visualizations'].map((item, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                                <span className="text-slate-700 font-medium">{item}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="pt-2">
                        <Button className="bg-primary-start text-white w-full md:w-auto">View Analytics</Button>
                    </div>
                </div>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 md:gap-16">
                <div className="md:w-1/2 relative flex justify-center w-full">
                    <div className="w-[280px] h-[560px] md:w-[300px] md:h-[600px] bg-white rounded-[40px] shadow-2xl border-8 border-slate-900 p-4 relative z-10 transition-transform hover:scale-105 duration-500">
                        {/* Notification Visualization */}
                        <div className="w-full h-full bg-slate-50 rounded-[32px] overflow-hidden flex flex-col relative">
                            <div className="absolute top-10 left-4 right-4 bg-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-bounce">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <Bell className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">New Appointment</div>
                                    <div className="text-xs text-slate-500">John Doe • 2 mins ago</div>
                                </div>
                            </div>
                            {/* Dummy Content */}
                            <div className="mt-32 px-4 space-y-3">
                                {[1, 2, 3].map((_, i) => (
                                    <div key={i} className="h-20 bg-white rounded-xl border border-slate-100 p-3 flex gap-3">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full" />
                                        <div className="space-y-2 w-full">
                                            <div className="h-3 bg-slate-100 w-2/3 rounded" />
                                            <div className="h-3 bg-slate-100 w-1/2 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Decor elements */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[100%] bg-indigo-200/50 blur-3xl rounded-full -z-0" />
                </div>
                <div className="w-full md:w-1/2 space-y-6 text-center md:text-left">
                    <span className="text-purple-600 font-bold tracking-wider text-sm">NOTIFICATIONS</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">Never Miss A <br /> Client Opportunity</h2>
                    <p className="text-slate-600 text-lg">Stay updated with critical business alerts. Smart notifications ensure you are always in the loop with what matters most to your company.</p>
                    <ul className="space-y-3 inline-block md:block text-left">
                        {['Instant Push Alerts', 'Customizable Channels', 'Urgency Filters'].map((item, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                                <span className="text-slate-700 font-medium">{item}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="pt-2">
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full md:w-auto">Learn More</Button>
                    </div>
                </div>
            </div>

        </div>
    </section>
);

// --- Stats Banner ---
export const StatsBanner = () => {


    return (
        <section className="bg-primary-start py-12 md:py-16">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:divide-x divide-white/20">
                    {[
                        { label: "trusted business", value: "200" },
                        { label: "transaction", value: "20k dollars" },
                        { label: "bookings", value: "100" },
                        { label: "customer satisfaction", value: "99%" }
                    ].map((stat, i) => (
                        <div key={i} className="text-white p-2">
                            <div className="text-3xl md:text-5xl font-bold mb-2">
                                {stat.value}
                            </div>
                            <div className="text-white/70 font-medium text-sm md:text-base">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// --- AppBenefits ---
export const AppBenefits = () => (
    <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 md:mb-16">The Ultimate Platform For <br className="hidden md:block" /> Scaling Your Business</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "User Friendly", desc: "Designed for simplicity and ease of use.", bg: "bg-purple-50", icon: Users, iconColor: "text-purple-600" },
                    { title: "Enterprise Security", desc: "SOC2 Type II compliant & encrypted data storage.", bg: "bg-orange-50", icon: Shield, iconColor: "text-orange-600" },
                    { title: "24/7 Support", desc: "Dedicated support team always ready to help.", bg: "bg-green-50", icon: Zap, iconColor: "text-green-600" },
                    { title: "Mobile Optimized", desc: "Manage your business from anywhere, on any device.", bg: "bg-pink-50", icon: Smartphone, iconColor: "text-pink-600" }
                ].map((item, i) => (
                    <div key={i} className={cn("p-8 rounded-3xl transition-all hover:scale-105 cursor-pointer", item.bg)}>
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-6">
                            <item.icon className={cn("w-7 h-7", item.iconColor)} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                        <p className="text-slate-500 text-sm">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// --- FAQ ---
export const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [showSupport, setShowSupport] = useState(false);
    const faqs = [
        { q: "How long does the free trial last?", a: "Unless you cancel, the free trial lasts for 14 days. You can access all premium business features during this period." },
        { q: "Is the platform mobile friendly?", a: "Yes, ScriptishRx is fully optimized for all devices, so you can manage your business from anywhere." },
        { q: "Is my business data secure?", a: "Absolutely. We are SOC2 Type II compliant and use enterprise-grade encryption to ensure your data is always safe." },
        { q: "Do you offer priority support?", a: "Yes, our enterprise plans include a dedicated account manager and 24/7 priority support." }
    ];

    return (
        <section className="py-16 md:py-24 bg-slate-50">
            {showSupport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSupport(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowSupport(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Contact Support</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">General Inquiries</p>
                                <a href="mailto:info@scriptishrx.com" className="text-lg font-medium text-primary-start hover:underline">info@scriptishrx.com</a>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Technical Support</p>
                                <a href="mailto:support@scriptishrx.com" className="text-lg font-medium text-primary-start hover:underline">support@scriptishrx.com</a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start lg:items-center">
                    <div className="w-full lg:w-1/2 space-y-8">
                        <div className="text-center lg:text-left">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
                            <p className="text-slate-600">Got questions? We've got answers.</p>
                        </div>

                        <div className="space-y-4">
                            {faqs.map((faq, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                        className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                                    >
                                        <span className="font-bold text-slate-900 pr-8">{faq.q}</span>
                                        <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform flex-shrink-0", openIndex === i ? "rotate-180" : "")} />
                                    </button>
                                    <div className={cn("px-6 text-slate-600 transition-all overflow-hidden", openIndex === i ? "pb-6 max-h-40 opacity-100" : "max-h-0 opacity-0")}>
                                        {faq.a}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Visual Placeholder for FAQ - Hidden on small mobile for space */}
                    <div className="w-full lg:w-1/2 flex justify-center hidden md:flex">
                        <div className="w-[320px] h-[400px] bg-white rounded-3xl shadow-xl border border-slate-100 p-8 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-start/5 to-purple-500/5" />
                            <div className="w-20 h-20 bg-primary-start/10 rounded-full flex items-center justify-center relative z-10">
                                <span className="text-4xl text-primary-start font-bold">?</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 relative z-10">Still have questions?</h3>
                            <p className="text-slate-500 relative z-10">Contact our support team for specialized assistance.</p>
                            <Button variant="outline" className="relative z-10" onClick={() => setShowSupport(true)}>Contact Support</Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// --- Testimonials ---
export const Testimonials = () => (
    <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-12 md:mb-16">What Our Clients Say?</h2>
            <div className="bg-slate-50 p-8 md:p-12 rounded-[2.5rem] max-w-4xl mx-auto relative mx-4 md:mx-auto">
                <div className="text-4xl text-primary-start absolute top-6 left-6 md:top-8 md:left-8 opacity-50 md:opacity-100">"</div>
                <p className="text-lg md:text-2xl text-slate-700 italic font-medium leading-relaxed mb-8 relative z-10 px-2">
                    "ScriptishRx has completely transformed how we manage our business. The AI capabilities are unmatched, and client feedback has been incredible. Highly recommended!"
                </p>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-slate-300 rounded-full overflow-hidden shadow-md">
                        {/* Placeholder Avatar */}
                        <img src="https://i.pravatar.cc/150?u=alex" alt="Client" className="w-full h-full object-cover" />
                    </div>
                    <div className="font-bold text-slate-900 text-lg">Alex Hernandez</div>
                    <div className="text-sm text-slate-500 font-medium">CEO, TechStart Inc.</div>
                </div>
            </div>
        </div>
    </section>
);

// --- CTA ---
export const CTA = () => (
    <section className="py-16 md:py-24 container mx-auto px-4">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-24 text-center relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-primary-start/20 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-purple-500/20 rounded-full blur-3xl opacity-50" />
            </div>

            <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">Start Scaling Your Business Today!</h2>
                <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto">Join thousands of companies optimizing their workflow with ScriptishRx.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                    <Button className="h-14 px-8 rounded-full bg-white text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-2 w-full sm:w-auto text-lg transition-transform hover:scale-105">
                        <Smartphone className="w-5 h-5" /> App Store
                    </Button>
                    <Button variant="outline" className="h-14 px-8 rounded-full border-slate-700 text-white hover:bg-slate-800 flex items-center justify-center gap-2 w-full sm:w-auto text-lg bg-transparent transition-transform hover:scale-105">
                        <Smartphone className="w-5 h-5" /> Play Store
                    </Button>
                </div>
            </div>
        </div>
    </section>
);

// --- Newsletter ---
export const Newsletter = () => {
    // ... keep existing state login
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubscribe = async () => {
        if (!email) return;
        setStatus('loading');
        try {
            const res = await fetch('/api/marketing/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (data.success) {
                setStatus('success');
                setMessage(data.message);
                setEmail('');
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong');
            }
        } catch (e) {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    return (
        <section className="py-16 md:py-24 bg-slate-50 relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto bg-white rounded-[2rem] p-6 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden">
                    {/* Subtle Background Art */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-60" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                        <div className="w-16 h-16 bg-primary-start/10 rounded-2xl flex items-center justify-center mb-2">
                            <Mail className="w-8 h-8 text-primary-start" />
                        </div>

                        <div className="space-y-4 max-w-lg mx-auto">
                            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight">
                                Subscribe to our newsletter
                            </h2>
                            <p className="text-slate-500 text-base md:text-lg leading-relaxed">
                                Get exclusive insights on business automation, AI trends, and platform updates delivered to your inbox.
                            </p>
                        </div>

                        <div className="w-full max-w-md mx-auto">
                            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white border border-slate-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary-start/20 focus-within:border-primary-start transition-all">
                                <input
                                    type="email"
                                    placeholder="Enter your work email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-transparent border-none text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 w-full"
                                    disabled={status === 'loading' || status === 'success'}
                                />
                                <Button
                                    onClick={handleSubscribe}
                                    disabled={status === 'loading' || status === 'success'}
                                    className={cn(
                                        "rounded-xl px-8 py-3 font-medium shadow-lg transition-all w-full sm:w-auto",
                                        status === 'success' ? "bg-green-600 hover:bg-green-700" : "bg-slate-900 hover:bg-slate-800",
                                        "text-white shadow-slate-900/10"
                                    )}
                                >
                                    {status === 'loading' ? '...' : status === 'success' ? 'Subscribed' : 'Subscribe'}
                                </Button>
                            </div>
                            {message && (
                                <p className={cn("mt-4 text-sm", status === 'success' ? "text-green-600" : "text-red-500")}>
                                    {message}
                                </p>
                            )}
                            {!message && (
                                <p className="mt-4 text-xs text-slate-400">
                                    We care about your data in our <a href="#" className="underline hover:text-slate-600">privacy policy</a>.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// --- Footer ---
// --- Footer ---
export const Footer = () => {
    const [activeModal, setActiveModal] = useState<string | null>(null);

    const Modal = ({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                </button>
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
                    <div className="h-1 w-20 bg-primary-start mt-4 rounded-full" />
                </div>
                <div className="prose prose-slate max-w-none text-slate-600 space-y-4 leading-relaxed">
                    {children}
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                    <Button onClick={onClose} variant="outline">Close</Button>
                </div>
            </div>
        </div>
    );

    return (
        <footer id="contact" className="bg-slate-900 text-white py-12 md:py-20 border-t border-slate-800 relative">
            {activeModal === 'sitemap' && (
                <Modal title="Sitemap" onClose={() => setActiveModal(null)}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-bold text-slate-900 mb-2">Main Pages</h4>
                            <ul className="space-y-2">
                                <li><a href="/" className="text-primary-start hover:underline">Home</a></li>
                                <li><a href="#features" className="text-primary-start hover:underline">Features</a></li>
                                <li><a href="#solutions" className="text-primary-start hover:underline">Solutions</a></li>
                                <li><a href="#contact" className="text-primary-start hover:underline">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-2">Platform</h4>
                            <ul className="space-y-2">
                                <li><a href="/login" className="text-primary-start hover:underline">Login</a></li>
                                <li><a href="/register" className="text-primary-start hover:underline">Register</a></li>
                                <li><a href="/dashboard" className="text-primary-start hover:underline">Dashboard</a></li>
                            </ul>
                        </div>
                        <div className="col-span-2">
                            <h4 className="font-bold text-slate-900 mb-2">Legal</h4>
                            <ul className="space-y-2">
                                <li><a href="/legal#privacy" className="text-primary-start hover:underline">Privacy Policy</a></li>
                                <li><a href="/legal#ip-rights" className="text-primary-start hover:underline">Intellectual Property</a></li>
                            </ul>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 mb-12 md:mb-16">
                    <div className="col-span-2 lg:col-span-1 space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <img src="/logo.jpg" alt="ScriptishRx Logo" className="h-16 w-auto object-contain rounded-lg" />
                        </div>
                        <p className="text-slate-400 leading-relaxed max-w-sm">
                            The #1 AI-powered business concierge platform for modern enterprises.
                        </p>
                        <div className="flex gap-4">
                            {[Twitter, Facebook, Instagram, Linkedin].map((Icon, i) => (
                                <a key={i} href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary-start hover:text-white transition-colors">
                                    <Icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold mb-6 text-lg">Product</h4>
                        <ul className="space-y-4 text-slate-400">
                            <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                            <li><a href="#solutions" className="hover:text-white transition-colors">Solutions</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Reviews</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-6 text-lg">Company</h4>
                        <ul className="space-y-4 text-slate-400">
                            <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                            <li><a href="/legal#privacy" className="hover:text-white transition-colors text-left">Privacy Policy</a></li>
                            <li><a href="/legal#ip-rights" className="hover:text-white transition-colors text-left">IP Rights</a></li>
                        </ul>
                    </div>

                    <div className="col-span-2 lg:col-span-1">
                        <h4 className="font-bold mb-6 text-lg">Contact</h4>
                        <ul className="space-y-4 text-slate-400">
                            <li className="flex items-start gap-3">
                                <span className="opacity-50 text-sm uppercase tracking-wider w-16 pt-1">Email:</span>
                                <span className="text-white">info@scriptishrx.com</span>
                            </li>

                            <li className="flex items-start gap-3">
                                <span className="opacity-50 text-sm uppercase tracking-wider w-16 pt-1">Address:</span>
                                <span className="text-white leading-relaxed">111 N Wabash Ave Suite 1711<br />Chicago, Illinois 60602</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="pt-8 border-t border-slate-800 text-center text-slate-500 text-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <span>© {new Date().getFullYear()} ScriptishRx LLC. All rights reserved.</span>
                    <div className="flex gap-6">
                        <a href="/legal" className="hover:text-white transition-colors">Privacy & Terms</a>
                        <button onClick={() => setActiveModal('sitemap')} className="hover:text-white transition-colors">Sitemap</button>
                    </div>
                </div>
            </div>
        </footer>
    );
};
