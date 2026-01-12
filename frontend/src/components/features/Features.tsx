'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Calendar, Shield, Activity, Phone, Zap, Globe } from 'lucide-react';

const features = [
    {
        icon: Calendar,
        title: "Smart Booking",
        description: "Book appointments instantly with your voice. The AI manages conflicts and rescheduling."
    },
    {
        icon: Phone,
        title: "Voice First",
        description: "Talk to ScriptishRx just like a human. Natural Language Processing understands context and intent."
    },
    {
        icon: Shield,
        title: "Secure & Private",
        description: "Enterprise-grade encryption and HIPAA-compliant logic ensures your data is safe."
    },
    {
        icon: Activity,
        title: "Health Monitoring",
        description: "Track your wellness journey. The AI notices trends and suggests health breaks."
    },
    {
        icon: Globe,
        title: "Global Access",
        description: "Find wellness lounges and services anywhere in the world."
    },
    {
        icon: Zap,
        title: "Lightning Fast",
        description: "Real-time responses powered by advanced edge computing."
    }
];

export const Features = () => {
    return (
        <section className="py-24 container mx-auto px-4 relative z-10">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-4xl font-bold text-white">Advanced Capabilities</h2>
                <p className="text-white/60 max-w-2xl mx-auto">
                    ScriptishRx isn't just a chatbot. It's an intelligent agent designed to streamline your wellness operations.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {features.map((feature, idx) => (
                    <GlassCard key={idx} variant="interactive" className="group">
                        <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:bg-primary-start/20 transition-colors">
                            <feature.icon className="w-6 h-6 text-white group-hover:text-secondary transition-colors" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                        <p className="text-white/50 group-hover:text-white/70 transition-colors">{feature.description}</p>
                    </GlassCard>
                ))}
            </div>
        </section>
    );
};
