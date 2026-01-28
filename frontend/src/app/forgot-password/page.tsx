'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to process request');
                setLoading(false);
                return;
            }

            setSuccess(data.message || 'Password reset link sent to your email');
            setSubmitted(true);
            setEmail('');
            setLoading(false);

            // Redirect to login after 5 seconds
            setTimeout(() => {
                router.push('/login');
            }, 5000);
        } catch (err) {
            setError('An error occurred. Please try again.');
            setLoading(false);
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="w-full max-w-md">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/login')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                </button>

                {/* Main Card */}
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full border border-white/50">
                    {!submitted ? (
                        <>
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="flex justify-center mb-4">
                                    <img src="/logo.jpg" alt="ScriptishRx" className="h-20 w-auto" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
                                <p className="text-gray-600 text-sm">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-sm">Error</p>
                                        <p className="text-sm mt-1">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-gray-800 placeholder-gray-400"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        We'll send a password reset link to this address
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-5 h-5" />
                                            Send Reset Link
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-xs text-gray-500">OR</span>
                                <div className="flex-1 h-px bg-gray-200"></div>
                            </div>

                            {/* Alternative Actions */}
                            <div className="space-y-3 text-center text-sm">
                                <p className="text-gray-600">
                                    Remember your password?{' '}
                                    <button
                                        onClick={() => router.push('/login')}
                                        className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                                    >
                                        Sign In
                                    </button>
                                </p>
                                <p className="text-gray-600">
                                    Don't have an account?{' '}
                                    <button
                                        onClick={() => router.push('/register')}
                                        className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                                    >
                                        Create One
                                    </button>
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Success State */}
                            <div className="text-center">
                                <div className="flex justify-center mb-6">
                                    <div className="bg-green-100 p-4 rounded-full">
                                        <Check className="w-12 h-12 text-green-600" />
                                    </div>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h2>
                                <p className="text-gray-600 mb-6">
                                    We've sent a password reset link to <span className="font-semibold">{email}</span>. 
                                    The link will expire in 24 hours.
                                </p>

                                {/* Success Message Box */}
                                <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r">
                                    <p className="text-sm">{success}</p>
                                </div>

                                {/* Instructions */}
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-left">
                                    <p className="text-sm font-semibold text-blue-900 mb-2">Next steps:</p>
                                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                                        <li>Open the email from support@scriptishrx.net</li>
                                        <li>Click the "Reset Password" button</li>
                                        <li>Enter your new password</li>
                                        <li>Sign in with your new password</li>
                                    </ol>
                                </div>

                                {/* Redirecting Text */}
                                <p className="text-gray-500 text-sm mb-4">
                                    Redirecting to login in a few seconds...
                                </p>

                                {/* Manual Redirect Button */}
                                <button
                                    onClick={() => router.push('/login')}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg transition-all duration-200"
                                >
                                    Go Back to Login
                                </button>

                                {/* Resend Link Option */}
                                <p className="text-gray-500 text-sm mt-6">
                                    Didn't receive an email?{' '}
                                    <button
                                        onClick={() => {
                                            setSubmitted(false);
                                            setEmail('');
                                        }}
                                        className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </p>

                                {/* Copy Token Instruction */}
                                <p className="text-gray-500 text-xs mt-8 bg-blue-50 border border-blue-100 rounded-lg p-3">
                                    💡 <span className="font-semibold">Tip:</span> If you don't see the button in the email, copy the full link and paste it in your browser address bar.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Help Text */}
                <p className="text-center text-gray-600 text-xs mt-6">
                    Having trouble? Contact{' '}
                    <a
                        href="mailto:support@scriptishrx.net"
                        className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    >
                        support@scriptishrx.net
                    </a>
                </p>
            </div>
        </div>
    );
}
