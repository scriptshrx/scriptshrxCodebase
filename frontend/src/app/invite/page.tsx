'use client';

import { useState, useEffect } from 'react';
import { Mail, Copy, Trash2, Send, Eye, EyeOff, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';

interface Invite {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    expiresAt: string;
    isExpired: boolean;
}

export default function InvitePage() {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER');
    const [loading, setLoading] = useState(false);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fetching, setFetching] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [resendingId, setResendingId] = useState<string | null>(null);
    const [showInviteLink, setShowInviteLink] = useState<{ [key: string]: boolean }>({});

    // Get auth token
    const getToken = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    };

    // Fetch invites on mount
    useEffect(() => {
        fetchInvites();
    }, []);

    const fetchInvites = async () => {
        try {
            setFetching(true);
            const token = getToken();
            const response = await axios.get('https://scriptshrxcodebase.onrender.com/api/organization/invites', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setInvites(response.data.invites || []);
            }
        } catch (err: any) {
            console.error('Failed to fetch invites:', err);
            setError('Failed to load invites');
        } finally {
            setFetching(false);
        }
    };

    const handleCreateInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const token = getToken();
            const response = await axios.post(
                'https://scriptshrxcodebase.onrender.com/api/organization/invite',
                { email, role },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setSuccess(`Invitation sent to ${email}!`);
                setEmail('');
                setRole('MEMBER');
                await fetchInvites();
            }
        } catch (err: any) {
            const message = err.response?.data?.error || 'Failed to create invite';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendInvite = async (inviteId: string) => {
        setError('');
        setSuccess('');
        setResendingId(inviteId);

        try {
            const token = getToken();
            const response = await axios.post(
                `https://scriptshrxcodebase.onrender.com/api/organization/invite/${inviteId}/resend`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setSuccess('Invitation resent successfully!');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (err: any) {
            const message = err.response?.data?.error || 'Failed to resend invite';
            setError(message);
        } finally {
            setResendingId(null);
        }
    };

    const handleCopyLink = (inviteId: string, email: string) => {
        const link = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/register?invite=${inviteId}`;
        navigator.clipboard.writeText(link);
        setCopiedId(inviteId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDeleteInvite = async (inviteId: string) => {
        if (!confirm('Are you sure you want to cancel this invite?')) return;

        try {
            const token = getToken();
            await axios.delete(
                `https://scriptshrxcodebase.onrender.com/api/organization/invite/${inviteId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Invite cancelled');
            await fetchInvites();
        } catch (err: any) {
            setError('Failed to cancel invite');
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'MANAGER':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-300';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-bold text-slate-900">Team Invitations</h1>
                    <p className="text-slate-600 mt-2">Invite team members to join your organization</p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r text-red-700">
                        <p className="font-semibold">Error</p>
                        <p>{error}</p>
                    </div>
                )}

                {/* Success Alert */}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r text-green-700">
                        <p className="font-semibold">Success</p>
                        <p>{success}</p>
                    </div>
                )}

                {/* Create Invite Form */}
                <div className="bg-white rounded-xl shadow-md p-8 mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Invite a Team Member</h2>
                    <form onSubmit={handleCreateInvite} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="colleague@company.com"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Role
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as any)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    <option value="MEMBER">Member</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    {loading ? 'Sending...' : 'Send Invite'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Invites List */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-8 border-b border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-900">
                            Pending Invitations ({invites.length})
                        </h2>
                    </div>

                    {fetching ? (
                        <div className="p-12 text-center">
                            <div className="inline-block animate-spin">
                                <Clock className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 mt-4">Loading invitations...</p>
                        </div>
                    ) : invites.length === 0 ? (
                        <div className="p-12 text-center">
                            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No pending invitations</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left px-6 py-4 font-semibold text-slate-700">Email</th>
                                        <th className="text-left px-6 py-4 font-semibold text-slate-700">Role</th>
                                        <th className="text-left px-6 py-4 font-semibold text-slate-700">Sent</th>
                                        <th className="text-left px-6 py-4 font-semibold text-slate-700">Expires</th>
                                        <th className="text-left px-6 py-4 font-semibold text-slate-700">Status</th>
                                        <th className="text-right px-6 py-4 font-semibold text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {invites.map((invite) => (
                                        <tr key={invite.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-slate-900 font-medium">{invite.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(invite.role)}`}>
                                                    {invite.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(invite.createdAt)}
                                                </div>
                                                <p className="text-xs text-slate-500">{formatTime(invite.createdAt)}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-sm">
                                                <div className={`flex items-center gap-1 ${invite.isExpired ? 'text-red-600' : 'text-green-600'}`}>
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(invite.expiresAt)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {invite.isExpired ? (
                                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                                                        Expired
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setShowInviteLink({
                                                            ...showInviteLink,
                                                            [invite.id]: !showInviteLink[invite.id]
                                                        })}
                                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Show/hide invite link"
                                                    >
                                                        {showInviteLink[invite.id] ? (
                                                            <EyeOff className="w-4 h-4 text-slate-600" />
                                                        ) : (
                                                            <Eye className="w-4 h-4 text-slate-600" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleCopyLink(invite.id, invite.email)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Copy invite link"
                                                    >
                                                        <Copy className="w-4 h-4 text-slate-600" />
                                                    </button>
                                                    {copiedId === invite.id && (
                                                        <span className="text-xs text-green-600 font-semibold">Copied!</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleResendInvite(invite.id)}
                                                        disabled={resendingId === invite.id || invite.isExpired}
                                                        className="p-2 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition-colors"
                                                        title="Resend invite email"
                                                    >
                                                        <Send className="w-4 h-4 text-blue-600" />
                                                    </button>
                                                    {resendingId === invite.id && (
                                                        <span className="text-xs text-blue-600 font-semibold">Sending...</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteInvite(invite.id)}
                                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Cancel invite"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Invite Link Display (Hidden by default) */}
                    {invites.length > 0 && (
                        <div className="px-6 pb-6">
                            {invites.map((invite) => (
                                showInviteLink[invite.id] && (
                                    <div key={invite.id} className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <p className="text-sm font-semibold text-slate-700 mb-2">Invite Link for {invite.email}:</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/register?invite=${invite.id}`}
                                                readOnly
                                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600"
                                            />
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-bold text-slate-900 mb-2">📋 How Invitations Work</h3>
                    <ul className="text-slate-700 space-y-2 text-sm">
                        <li>✓ Invitations expire after 7 days</li>
                        <li>✓ Each team member can only have one active invitation</li>
                        <li>✓ You can resend an invitation if needed</li>
                        <li>✓ The invite link can be shared manually if email fails</li>
                        <li>✓ Cancel unwanted invitations anytime</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
