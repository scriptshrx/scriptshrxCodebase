'use client';

import { useState, useEffect } from 'react';
import { Check, CreditCard, Loader2, Shield, Zap, AlertCircle, X, Mail, Phone } from 'lucide-react';

function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transform transition-all animate-in slide-in-from-right-5 fade-in duration-300 ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
            {type === 'success' ? <Check className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <span className="font-medium text-sm">{message}</span>
        </div>
    );
}

function ContactSalesModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 transform transition-all animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-400" />
                </button>

                <div className="text-center mb-8 mt-2">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Contact Sales</h3>
                    <p className="text-gray-500 text-sm">Get a tailored solution for your enterprise.</p>
                </div>

                <div className="space-y-4">
                    <a href="mailto:info@scriptishrx.com" className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-gray-900">Email Us</p>
                            <p className="text-sm text-blue-600 font-medium">info@scriptishrx.com</p>
                        </div>
                    </a>
                </div>

                <div className="mt-8">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SubscriptionPage() {
    const [currentPlan, setCurrentPlan] = useState('Basic');
    const [loading, setLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    useEffect(() => {
        // Fetch current subscription from settings API for accuracy
        const fetchPlan = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch('/api/settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.tenant?.plan) {
                        setCurrentPlan(data.tenant.plan);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch plan", error);
            }
        };
        fetchPlan();
    }, []);

    const handleSubscribe = async (plan: string) => {
        setLoading(plan);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setToast({ message: "You must be logged in.", type: 'error' });
                return;
            }

            // Note: In a real app we'd likely POST to /api/create-checkout-session
            const res = await fetch('/api/payments/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan })
            });

            if (!res.ok) {
                const errData = await res.text(); // Read text in case it's not JSON
                throw new Error(errData || "Subscription failed");
            }

            const data = await res.json();

            if (data.url) {
                window.location.href = data.url; // Redirect to Paystack
            } else if (data.success) {
                setToast({ message: `Successfully subscribed to ${plan}!`, type: 'success' });
                setCurrentPlan(plan);
            }
        } catch (error) {
            console.error('Subscription error:', error);
            setToast({ message: "Failed to process subscription. check your connection.", type: 'error' });
        } finally {
            setLoading(null);
        }
    };

    const plans = [
        {
            name: 'Basic',
            price: '99.99',
            description: "Essential tools for small businesses.",
            features: ['Public Chatbot', 'Basic CRM', 'Email Support'],
            color: 'bg-slate-900',
            buttonColor: 'bg-slate-900 text-white hover:bg-slate-800'
        },
        {
            name: 'Intermediate',
            price: '149.99',
            description: "Advanced features for growing companies.",
            features: ['Everything in Basic', 'Voice Agent', 'Advanced Analytics', 'Priority Support'],
            popular: true,
            color: 'bg-indigo-600',
            buttonColor: 'bg-indigo-600 text-white hover:bg-indigo-700'
        },
        {
            name: 'Advanced',
            price: '249.99',
            description: "Full enterprise power & customization.",
            features: ['Everything in Intermediate', 'Custom AI Training', 'Dedicated Account Manager', 'API Access'],
            color: 'bg-black',
            buttonColor: 'bg-black text-white hover:bg-gray-800'
        }
    ];

    return (
        <div className="max-w-6xl mx-auto pb-20 relative px-4 md:px-8">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <ContactSalesModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />

            <div className="mb-10 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Choose Your Plan</h1>
                <p className="text-lg text-gray-500">Unlock the full potential of your AI Business Concierge with our flexible pricing plans.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {plans.map((plan) => {
                    const isCurrent = currentPlan.toLowerCase() === plan.name.toLowerCase(); // Case insensitive check
                    const isLoading = loading === plan.name;

                    return (
                        <div
                            key={plan.name}
                            className={`p-8 rounded-3xl border transition-all duration-300 relative flex flex-col h-full bg-white
                            ${plan.popular ? 'border-2 border-indigo-500 shadow-2xl shadow-indigo-100 scale-105 z-10' : 'border-gray-200 shadow-xl shadow-slate-200/50 hover:border-gray-300'}
                            `}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                <p className="text-sm text-gray-500 mt-2 min-h-[40px]">{plan.description}</p>
                            </div>

                            <div className="flex items-baseline mb-8">
                                <span className="text-4xl font-extrabold text-gray-900 tracking-tight">${plan.price}</span>
                                <span className="text-gray-500 ml-1 font-medium">/month</span>
                            </div>

                            <div className="flex-1">
                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start">
                                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${plan.popular ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                                                <Check className="w-3 h-3" />
                                            </div>
                                            <span className="ml-3 text-sm text-gray-600 font-medium">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => handleSubscribe(plan.name)}
                                disabled={isLoading || isCurrent}
                                className={`w-full py-4 px-6 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center
                                    ${isCurrent
                                        ? 'bg-gray-100 text-gray-400 cursor-default shadow-none border border-gray-200'
                                        : plan.buttonColor
                                    } ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isCurrent ? (
                                    <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Current Plan</span>
                                ) : (
                                    'Subscribe Now'
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-16 bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Need a Custom Enterprise Solution?</h3>
                    <p className="text-slate-500 text-sm max-w-md">Contact our sales team for tailored pricing, dedicated infrastructure, and SLA guarantees.</p>
                </div>
                <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-white hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
                >
                    Contact Sales
                </button>
            </div>
        </div>
    );
}
