'use client';
import Link from 'next/link';

export default function InvitePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-100 to-blue-100 p-8">
            <h1 className="text-4xl font-bold mb-4 text-gray-800">Invite a Team Member</h1>
            <p className="text-lg text-gray-600 mb-6 max-w-xl text-center">
                This is a placeholder page where you can invite colleagues to join your organization.
                In the full application this would include a form to send invitation emails and assign roles.
            </p>
            <Link href="/dashboard" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                Back to Dashboard
            </Link>
        </div>
    );
}
