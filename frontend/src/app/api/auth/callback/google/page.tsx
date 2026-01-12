'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

function GoogleCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Connecting to Google Calendar...');

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            setStatus('error');
            setMessage('Google authorization failed or was cancelled.');
            return;
        }

        if (!code) {
            setStatus('error');
            setMessage('No authorization code found.');
            return;
        }

        const exchangeToken = async () => {
            try {
                // Timeout promise to prevent hanging forever
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timed out')), 15000)
                );

                // Send code to backend to exchange for tokens
                const apiCall = api.post('/auth/google/callback', { code });

                await Promise.race([apiCall, timeoutPromise]);

                setStatus('success');
                setMessage('Successfully connected! Redirecting...');

                // Slight delay so user sees success message
                setTimeout(() => {
                    router.push('/dashboard/settings'); // Redirect specifically to settings
                }, 1500);
            } catch (err: any) {
                console.error('Exchange failed:', err);
                setStatus('error');
                // Extract meaningful error
                const errorDetail = err.response?.data?.error || err.response?.data?.details || err.message || 'Unknown error';
                setMessage(`Failed to connect. (${errorDetail})`);
            }
        };

        exchangeToken();
    }, [searchParams, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-100">
                {status === 'processing' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Connecting...</h2>
                        <p className="text-slate-500">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Success!</h2>
                        <p className="text-emerald-600 font-medium">{message}</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
                                <XCircle className="w-8 h-8 text-rose-600" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Connection Failed</h2>
                        <p className="text-slate-500 mb-6">{message}</p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            Return to Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function GoogleCallbackPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <GoogleCallbackContent />
        </Suspense>
    );
}
