'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, AlertCircle, Loader2, Check, Eye, EyeOff, ArrowLeft } from 'lucide-react';

// Generate static params for static export (required for dynamic routes)
export async function generateStaticParams() {
    // Return empty array since token params are dynamic/unknown at build time
    // Page will be rendered on-demand (ISR)
    return [];
}

export default function ResetPasswordPage() {
    const router = useRouter();
    const params = useParams();
    const token = params?.token as string;

    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Validate token on mount
    useEffect(() => {
        validateToken();
    }, [token]);

    // Calculate password strength
    useEffect(() => {
        if (!newPassword) {
            setPasswordStrength(0);
            return;
        }

        let strength = 0;
        if (newPassword.length >= 8) strength++;
        if (newPassword.length >= 12) strength++;
        if (/[a-z]/.test(newPassword)) strength++;
        if (/[A-Z]/.test(newPassword)) strength++;
        if (/[0-9]/.test(newPassword)) strength++;
        if (/[^a-zA-Z0-9]/.test(newPassword)) strength++;

        setPasswordStrength(Math.min(strength, 4));
    }, [newPassword]);

    const validateToken = async () => {
        try {
            const response = await fetch(`/api/auth/verify-reset-token/${token}`);
            const data = await response.json();

            if (data.success && data.valid) {
                setTokenValid(true);
                setEmail(data.email);
            } else {
                setError(data.error || 'Invalid or expired token');
                setTokenValid(false);
            }
        } catch (err) {
            setError('Failed to validate reset token');
            setTokenValid(false);
            console.error(err);
        } finally {
            setValidating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        // Validation
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            setError('Password must contain uppercase, lowercase, and numbers');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to reset password');
                setLoading(false);
                return;
            }

            setSuccess(true);
            setNewPassword('');
            setConfirmPassword('');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err) {
            setError('An error occurred. Please try again.');
            setLoading(false);
            console.error(err);
        }
    };

    // Loading state
    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-700 font-semibold">Validating your reset link...</p>
                </div>
            </div>
        );
    }

    // Invalid token state
    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="w-full max-w-md">
                    <button
                        onClick={() => router.push('/login')}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </button>

                    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full border border-white/50 text-center">
                        <div className="flex justify-center mb-6">
                            <div className="bg-red-100 p-4 rounded-full">
                                <AlertCircle className="w-12 h-12 text-red-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">Invalid or Expired Link</h2>
                        <p className="text-gray-600 mb-8">
                            {error || 'This password reset link has expired or is invalid.'}
                        </p>
                        <button
                            onClick={() => router.push('/forgot-password')}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg transition-all duration-200 mb-3"
                        >
                            Request New Link
                        </button>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-all duration-200"
                        >
                            Back to Login
                        </button>
                    </div>

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

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full border border-white/50 text-center">
                        <div className="flex justify-center mb-6">
                            <div className="bg-green-100 p-4 rounded-full">
                                <Check className="w-12 h-12 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">Password Reset Successful!</h2>
                        <p className="text-gray-600 mb-8">
                            Your password has been successfully reset. You can now sign in with your new password.
                        </p>
                        <p className="text-gray-500 text-sm mb-4">
                            Redirecting to login in a few seconds...
                        </p>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg transition-all duration-200"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Reset form state
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
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <img src="/logo.jpg" alt="ScriptishRx" className="h-20 w-auto" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
                        <p className="text-gray-600 text-sm">
                            Enter a strong new password for{' '}
                            <span className="font-semibold text-gray-700">{email}</span>
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
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-12 pr-12 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-gray-800 placeholder-gray-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {newPassword && (
                                <div className="mt-3">
                                    <div className="flex gap-1 mb-1">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-2 flex-1 rounded-full transition-colors ${
                                                    i < passwordStrength
                                                        ? passwordStrength === 1
                                                            ? 'bg-red-500'
                                                            : passwordStrength === 2
                                                            ? 'bg-yellow-500'
                                                            : 'bg-green-500'
                                                        : 'bg-gray-200'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {passwordStrength === 0
                                            ? 'Very weak'
                                            : passwordStrength === 1
                                            ? 'Weak'
                                            : passwordStrength === 2
                                            ? 'Fair'
                                            : 'Strong'}
                                    </p>
                                </div>
                            )}

                            <p className="text-xs text-gray-500 mt-2">
                                At least 8 characters with uppercase, lowercase, and numbers
                            </p>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-12 pr-12 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-gray-800 placeholder-gray-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Password Match Indicator */}
                            {confirmPassword && (
                                <p className={`text-xs mt-2 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    Reset Password
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
                            Changed your mind?{' '}
                            <button
                                onClick={() => router.push('/login')}
                                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                            >
                                Sign In
                            </button>
                        </p>
                    </div>
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
