'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const plans = [
    {
        name: "Startup",
        price: "99.99",
        features: ["Voice Agent Access", "50 Client Bookings/mo", "Basic Analytics"],
        popular: false
    },
    {
        name: "Growth",
        price: "149.99",
        features: ["Everything in Startup", "Unlimited Bookings", "Advanced Analytics", "Priority Support"],
        popular: true
    },
    {
        name: "Enterprise",
        price: "249.99",
        features: ["Dedicated Account Manager", "SOC2 Compliance", "White Labeling"],
        popular: false
    }
];

export const Pricing = () => {
    return (
        <section id="pricing" className="py-16 md:py-24 relative overflow-hidden bg-slate-50">
            <div className="container mx-auto px-4 relative z-10">

                {/* Header (Hidden in this specific view but good for semantics, or can be kept visible) */}
                {/* The user specifically asked to restore "Choose The Plans..." section */}
                <div className="text-center mb-10 md:mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Choose The Plans That Suits You!</h2>
                    <p className="text-slate-600">Choose the plan that fits your business scale.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
                    {plans.map((plan, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "relative flex flex-col h-full rounded-[30px] p-8 transition-all duration-300 bg-white",
                                plan.popular
                                    ? "border-2 border-primary-start shadow-2xl scale-105 z-10 pt-12"
                                    : "border border-slate-100 shadow-xl"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary-start text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-lg uppercase tracking-wider">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-8 text-center pt-4">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">{plan.name}</h3>
                                <div className={cn("text-5xl font-extrabold mb-2", plan.popular ? "text-primary-start" : "text-slate-900")}>
                                    ${plan.price}
                                </div>
                                <div className="text-sm text-slate-400 font-medium">per month</div>
                            </div>

                            <ul className="space-y-4 mb-10 flex-1 px-4">
                                {plan.features.map((feat, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <Check className="w-3 h-3 text-slate-400" />
                                        </div>
                                        <span className={cn("text-sm text-slate-600 font-medium", plan.popular ? "text-primary-start" : "")}>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <a href={`/register?plan=${plan.name.toLowerCase()}`} className="block w-full">
                                <Button
                                    variant={plan.popular ? "primary" : "secondary"}
                                    className={cn(
                                        "w-full rounded-2xl py-6 font-bold shadow-none",
                                        plan.popular
                                            ? "bg-primary-start hover:bg-primary-end text-white shadow-lg shadow-primary-start/25"
                                            : "bg-slate-50 hover:bg-slate-100 text-slate-900"
                                    )}
                                >
                                    Select Plan
                                </Button>
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
