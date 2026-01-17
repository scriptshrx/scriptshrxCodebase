'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

interface FieldsConfig {
    name: boolean;
    email: boolean;
    phone: boolean;
    country: boolean;
    role: boolean;
}

export default function RegisterContent() {
    const [accountType, setAccountType] = useState<'ORGANIZATION' | 'INDIVIDUAL'>('ORGANIZATION');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInviteRegistration, setIsInviteRegistration] = useState(false);
    const [fieldsConfig, setFieldsConfig] = useState<FieldsConfig>({
        name: true,
        email: true,
        phone: false,
        country: false,
        role: false
    });
    const [configuredRole, setConfiguredRole] = useState('MEMBER');
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Extract field configuration from URL params
        const fieldsParam = searchParams?.get('fields');
        const inviteToken = searchParams?.get('invite');
        const roleParam = searchParams?.get('role');

        if (fieldsParam && inviteToken) {
            try {
                // Decode the base64 encoded fields config
                const decodedFields = JSON.parse(atob(fieldsParam)) as FieldsConfig;
                setFieldsConfig(decodedFields);
                setIsInviteRegistration(true);
            } catch (err) {
                console.error('Failed to decode fields config:', err);
                // Use default config if decoding fails
                setIsInviteRegistration(true);
            }
        } else if (inviteToken) {
            // Fallback for invite without fields config
            setIsInviteRegistration(true);
        }

        // Extract configured role from URL
        if (roleParam) {
            setConfiguredRole(roleParam);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const apiUrl = process.env.NODE_ENV === 'development'
                ? 'http://localhost:5000'
                : (typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'));

            const inviteToken = searchParams?.get('invite');

            const payload = {
                name,
                email,
                password,
                phone: fieldsConfig.phone ? phone : undefined,
                country: fieldsConfig.country ? country : undefined,
                role: isInviteRegistration ? configuredRole : undefined,
                accountType: isInviteRegistration ? 'ORGANIZATION' : accountType,
                companyName: !isInviteRegistration && accountType === 'ORGANIZATION' ? companyName : undefined,
                inviteToken: inviteToken || undefined
            };

            const response = await axios.post('https://scriptshrxcodebase.onrender.com/api/auth/register', payload);

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            console.log('Registration successful :', response.data);

            router.push('/dashboard');
        } catch (err: any) {
            console.error('Registration error:', err);
            const message = err.response?.data?.error || err.message || 'Registration failed';
            setError(Array.isArray(message) ? message.map((m: any) => m.message || JSON.stringify(m)).join(', ') : message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/50">
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        <img src="/logo.jpg" alt="ScriptishRx" className="h-20 w-auto" />
                    </div>
                    <p className="text-blue-600 font-medium">Create your account to get started.</p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Account Type Selector - Hidden for Invite Registration */}
                    {!isInviteRegistration && (
                        <div className="flex p-1 bg-gray-100 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setAccountType('ORGANIZATION')}
                                className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${accountType === 'ORGANIZATION' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Organization
                            </button>
                            <button
                                type="button"
                                onClick={() => setAccountType('INDIVIDUAL')}
                                className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${accountType === 'INDIVIDUAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Individual
                            </button>
                        </div>
                    )}

                    {/* Full Name - Shown based on field config */}
                    {(isInviteRegistration ? fieldsConfig.name : true) && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-gray-800 placeholder-gray-400"
                                placeholder="John Doe"
                                required={isInviteRegistration ? fieldsConfig.name : true}
                            />
                        </div>
                    )}

                    {/* Email Address - Shown based on field config */}
                    {(isInviteRegistration ? fieldsConfig.email : true) && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-gray-800 placeholder-gray-400"
                                placeholder="you@example.com"
                                required={isInviteRegistration ? fieldsConfig.email : true}
                            />
                        </div>
                    )}

                    {/* Phone Number - Show based on field config for invite, never for regular signup */}
                    {isInviteRegistration && fieldsConfig.phone && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-gray-800 placeholder-gray-400"
                                placeholder="+1 (555) 123-4567"
                            />
                        </div>
                    )}

                    {/* Country - Show based on field config for invite, never for regular signup */}
                    {isInviteRegistration && fieldsConfig.country && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                            <input
                                type="text"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-gray-800 placeholder-gray-400"
                                placeholder="United States"
                            />
                        </div>
                    )}

                    {/* Role Display (Read-only for invite registration) */}
                    {isInviteRegistration && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Role</label>
                            <div className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 font-medium cursor-not-allowed flex items-center justify-between">
                                <span>{configuredRole}</span>
                                <span className="text-xs text-gray-500">(read-only)</span>
                            </div>
                        </div>
                    )}

                    {!isInviteRegistration && accountType === 'ORGANIZATION' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-gray-800 placeholder-gray-400"
                                placeholder="My Business"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-gray-800 placeholder-gray-400"
                            placeholder="•••••••• (Min 8 characters)"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating Account...
                            </span>
                        ) : (
                            'Sign Up'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
