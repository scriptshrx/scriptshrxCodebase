'use client';
import Link from 'next/link';

export default function ProfilePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-8">
            <h1 className="text-4xl font-bold mb-4 text-gray-800">Complete Your Profile</h1>
            <p className="text-lg text-gray-600 mb-6 max-w-xl text-center">
                This is a placeholder page where users can update their personal information, preferences, and settings.
                In the full application this would include a form bound to the /api/settings endpoint.
            </p>
            <Link href="/dashboard" className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                Back to Dashboard
            </Link>
        </div>
    );
}
