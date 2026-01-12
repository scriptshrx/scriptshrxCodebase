'use client';

import { useState, useEffect } from 'react';
import { Check, Shield, Zap, Sparkles, Loader2, AlertCircle, X } from 'lucide-react';

// Simple Toast Component (Reused logic for consistency)
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transform transition-all animate-in slide-in-from-right-5 fade-in duration-300 ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
            {type === 'success' ? <Check className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <span className="font-medium text-sm">{message}</span>
            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-4 h-4 opacity-50" />
            </button>
        </div>
    );
}

export default function UpgradePage() {
    const [currentPlan, setCurrentPlan] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchCurrentPlan();
    }, []);

    const fetchCurrentPlan = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentPlan(data.plan || 'Basic');
            }
        } catch (error) {
            console.error('Failed to fetch plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (plan: string) => {
        setUpgrading(plan);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/settings/subscription', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan })
            });

            if (res.ok) {
                setCurrentPlan(plan);
                setToast({ message: `Successfully switched to ${plan} plan!`, type: 'success' });
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to update plan.', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Network error occurred.', type: 'error' });
        } finally {
            setUpgrading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-10 relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">Upgrade your Plan</h1>
                <p className="mt-4 text-xl text-gray-500">
                    Unlock the full potential of ScriptishRx with advanced AI and CRM features.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Basic Plan */}
                <PricingCard
                    title="Basic"
                    price="$99.99"
                    description="Essential CRM features for small businesses and startups."
                    features={[
                        "Basic CRM (Client Management)",
                        "Standard Chatbot Customization",
                        "Basic Reporting",
                        "Email Support"
                    ]}
                    icon={<Shield className="w-6 h-6 text-gray-500" />}
                    currentPlan={currentPlan}
                    onUpgrade={() => handleUpgrade('Basic')}
                    isUpgrading={upgrading === 'Basic'}
                />

                {/* Intermediate Plan */}
                <PricingCard
                    title="Intermediate"
                    price="$149.99"
                    description="Advanced tools for growing teams needing more flexibility."
                    isPopular={true}
                    features={[
                        "Advanced CRM & Segmentation",
                        "Flexible Chatbot Customization",
                        "Appointment Scheduling Flow",
                        "Voice Agent (Standard)",
                        "Priority Email Support"
                    ]}
                    icon={<Zap className="w-6 h-6 text-blue-500" />}
                    currentPlan={currentPlan}
                    onUpgrade={() => handleUpgrade('Intermediate')}
                    isUpgrading={upgrading === 'Intermediate'}
                />

                {/* Advanced Plan */}
                <PricingCard
                    title="Advanced"
                    price="$249.99"
                    description="Full enterprise power with deep AI customization and insights."
                    features={[
                        "Full CRM with Predictive Insights",
                        "Custom AI Training (Voice & Chat)",
                        "Custom Workflows & Integrations",
                        "Calendar & Email Integration",
                        "Dedicated Account Manager"
                    ]}
                    icon={<Sparkles className="w-6 h-6 text-purple-500" />}
                    currentPlan={currentPlan}
                    onUpgrade={() => handleUpgrade('Advanced')}
                    isUpgrading={upgrading === 'Advanced'}
                />
            </div>
        </div>
    );
}

function PricingCard({ title, price, description, features, isPopular, icon, currentPlan, onUpgrade, isUpgrading }: any) {
    const isCurrent = currentPlan === title;

    return (
        <div className={`relative flex flex-col p-8 bg-white rounded-3xl border transition-all hover:shadow-xl ${isPopular ? 'border-blue-500 shadow-lg scale-105 z-10' : 'border-gray-100 shadow-sm hover:-translate-y-1'
            }`}>
            {isPopular && (
                <div className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                        More Popular
                    </span>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                <div className={`p-2 rounded-xl ${isPopular ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    {icon}
                </div>
            </div>

            <div className="flex items-baseline mb-6">
                <span className="text-4xl font-extrabold text-gray-900">{price}</span>
                <span className="ml-1 text-gray-500 font-medium">/month</span>
            </div>

            <p className="text-gray-500 text-sm mb-6 min-h-[40px]">{description}</p>

            <ul className="space-y-4 mb-8 flex-1">
                {features.map((feature: string) => (
                    <li key={feature} className="flex items-start">
                        <Check className={`w-5 h-5 mr-3 shrink-0 ${isPopular ? 'text-blue-600' : 'text-green-500'}`} />
                        <span className="text-sm text-gray-600 font-medium">{feature}</span>
                    </li>
                ))}
            </ul>

            <button
                onClick={onUpgrade}
                disabled={isCurrent || isUpgrading}
                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center ${isCurrent
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } ${isUpgrading ? 'opacity-70 cursor-wait' : ''}`}
            >
                {isUpgrading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : isCurrent ? (
                    'Current Plan'
                ) : (
                    'Choose ' + title
                )}
            </button>
        </div>
    );
}
