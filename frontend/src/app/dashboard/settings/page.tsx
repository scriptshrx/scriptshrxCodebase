'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Palette, Bot, Shield, Loader2, Camera, User, Building, Lock, Mail, Phone, Activity, X, Check, AlertCircle, Plus, Key, Calendar, CreditCard, Bell, Zap, Trash2, FileText, ExternalLink, Clock, RotateCw } from 'lucide-react';

// --- Toast Notification ---
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
            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-4 h-4 opacity-50" />
            </button>
        </div>
    );
}

// --- Audit Logs Modal ---
function AuditLogsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/audit-logs', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 h-[600px] flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg"><Shield className="w-5 h-5 text-slate-700" /></div>
                        <h3 className="text-xl font-bold text-gray-900">System Audit Logs</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {loading ? (
                        <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
                    ) : logs.length === 0 ? (
                        <p className="text-center text-gray-400 py-10">No activity recorded yet.</p>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex items-start justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{log.action}</p>
                                    <p className="text-xs text-slate-500 mt-1">{log.details || 'No details'}</p>
                                    <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">{log.id}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                        {new Date(log.createdAt).toLocaleDateString()}
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(log.createdAt).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Integration Item ---
function IntegrationItem({ name, description, connectedKey, integrations, onConnectClick, onDisconnectClick, loading, icon: Icon }: any) {
    const config = (integrations && integrations[connectedKey]) || {};
    const isConnected = !!config && (config === true || config.connected === true);
    const isLoading = loading === connectedKey;

    return (
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl transition-all hover:border-gray-300 bg-white">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {Icon ? <Icon className="w-6 h-6" /> : <div className="w-6 h-6" />}
                </div>
                <div>
                    <h3 className="font-bold text-sm text-gray-900">{name}</h3>
                    <p className="text-xs text-gray-500">{description}</p>
                </div>
            </div>
            <button
                onClick={() => isConnected ? onDisconnectClick(connectedKey) : onConnectClick(connectedKey)}
                disabled={isLoading}
                className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 min-w-[100px] justify-center
                    ${isConnected
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-black text-white hover:bg-gray-800 shadow-md hover:shadow-lg'
                    } ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
            >
                {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : isConnected ? (
                    <>Disconnect</>
                ) : (
                    <>Connect</>
                )}
            </button>
        </div>
    );
}

// --- Calendar Settings Component ---
function CalendarSettings({ integrations, onConnectClick, onDisconnectClick, loading }: any) {
    const [status, setStatus] = React.useState<any>(null);
    const [statusLoading, setStatusLoading] = React.useState(false);

    React.useEffect(() => {
        fetchCalendarStatus();
    }, [integrations?.googleCalendar?.connected]);

    const fetchCalendarStatus = async () => {
        try {
            setStatusLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/tenant-calendar/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setStatus(data);
        } catch (e) {
            console.error('Failed to fetch calendar status:', e);
        } finally {
            setStatusLoading(false);
        }
    };

    const config = (integrations && integrations.googleCalendar) || {};
    const isConnected = !!config && (config === true || config.connected === true);
    const isLoading = loading === 'googleCalendar';

    return (
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl mt-1 ${isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">Google Calendar</h3>
                        <p className="text-sm text-gray-500 mt-1">Two-way sync for bookings. AI will check your calendar availability before booking.</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                {statusLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                        <p className="text-sm text-gray-500">Loading status...</p>
                    </div>
                ) : isConnected && status?.connected ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-gray-900">Connected</span>
                        </div>
                        {status?.calendarEmail && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail className="w-4 h-4 text-gray-400" />
                                {status.calendarEmail}
                            </div>
                        )}
                        {status?.timezone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4 text-gray-400" />
                                Timezone: {status.timezone}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <p className="text-sm text-gray-600">Not connected. Connect to enable calendar syncing.</p>
                    </div>
                )}
            </div>

            <div className="mt-6 flex gap-3">
                <button
                    onClick={() => isConnected ? onDisconnectClick('googleCalendar') : onConnectClick('googleCalendar')}
                    disabled={isLoading}
                    className={`flex items-center justify-center px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200
                        ${isConnected
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                            : 'bg-black text-white hover:bg-gray-800 shadow-md hover:shadow-lg'
                        } ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            {isConnected ? 'Disconnecting...' : 'Connecting...'}
                        </>
                    ) : isConnected ? (
                        <>Disconnect Calendar</>
                    ) : (
                        <>Connect Google Calendar</>
                    )}
                </button>
                {isConnected && (
                    <button
                        onClick={fetchCalendarStatus}
                        disabled={statusLoading}
                        className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {statusLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RotateCw className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

// --- Workflow Modal (Create) ---
function WorkflowModal({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (data: any) => void }) {
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        onSave({
            name: formData.get('name'),
            trigger: formData.get('trigger'),
            action: formData.get('action')
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 transform transition-all animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Create Workflow</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Workflow Name</label>
                        <input name="name" type="text" required placeholder="e.g. New Client Welcome" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black/5 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Trigger Event</label>
                        <select name="trigger" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black/5 outline-none">
                            <option value="new_client">New Lead Captured</option>
                            <option value="booking_confirmed">Booking Scheduled</option>
                            <option value="payment_failed">Payment Failed</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Action</label>
                        <select name="action" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-black/5 outline-none">
                            <option value="send_email">Send Email</option>
                            <option value="send_sms">Send SMS</option>
                            <option value="notify_team">Notify Team (Slack)</option>
                        </select>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl transition-all shadow-lg hover:shadow-xl">Save Workflow</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Subscription Settings (Real) ---
function SubscriptionSettings({ plan, showToast }: any) {
    const handleManageBilling = async () => {
        try {
            const res = await fetch('/api/payments/portal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (res.ok) {
                const { url } = await res.json();
                window.location.href = url; // Redirect to Paystack or Management Page
            } else {
                showToast("Failed to initiate billing portal.", 'error');
            }
        } catch (error) {
            console.error(error);
            showToast("Network error.", 'error');
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Subscription & Billing</h2>
                    <p className="text-sm text-gray-500">Manage your plan and payment methods.</p>
                </div>
            </div>

            <div className="flex justify-between items-center p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Current Plan</p>
                    <h3 className="text-2xl font-extrabold text-slate-900">{plan}</h3>
                    <p className="text-xs text-slate-500 mt-2">Next billing date: Jan 1, 2026</p>
                </div>
                <button
                    onClick={handleManageBilling}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 shadow-sm text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all"
                >
                    Manage Subscription <ExternalLink className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

// --- Voice Agent Settings (Twilio) ---
function VoiceAgentSettings({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) {
    const [loading, setLoading] = useState(true);
    const [inboundPhone, setInboundPhone] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [calling, setCalling] = useState(false);

    useEffect(() => {
        fetchData();
        // Set webhook URL based on current window location
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        setWebhookUrl(`${baseUrl}/api/twilio/webhook/voice`);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch('/api/organization/info', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.organization?.twilioConfig?.phoneNumber) {
                    setInboundPhone(data.organization.twilioConfig.phoneNumber);
                }
            }
        } catch (error) {
            console.error('Failed to fetch voice data:', error);
            showToast('Failed to load voice configuration.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInbound = async () => {
        if (!inboundPhone) return showToast('Please enter a phone number.', 'error');
        setIsSaving(true);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch('/api/organization/info', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    twilioConfig: {
                        phoneNumber: inboundPhone
                    }
                })
            });

            const data = await res.json();
            if (res.ok) {
                showToast('Inbound number saved successfully!', 'success');
            } else {
                showToast(data.error || 'Failed to save configuration.', 'error');
            }
        } catch (error) {
            showToast('Network error while saving.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestCall = async () => {
        if (!testPhone) return showToast('Please enter a phone number.', 'error');
        setCalling(true);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch('/api/voice/outbound', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ phoneNumber: testPhone })
            });

            const data = await res.json();
            if (res.ok) {
                showToast('Test call initiated!', 'success');
            } else {
                showToast(data.error || 'Failed to start call.', 'error');
            }
        } catch (error) {
            showToast('Call failed.', 'error');
        } finally {
            setCalling(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    };

    if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>;

    return (
        <div className="space-y-8">
            {/* Status Card */}
            <div className={`p-4 rounded-xl border ${inboundPhone ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'} transition-all`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${inboundPhone ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">{inboundPhone ? 'Voice System Active' : 'Setup Required'}</h3>
                            <p className="text-xs text-gray-500">{inboundPhone ? `Calls authorized for: ${inboundPhone}` : 'Connect a Twilio number to start.'}</p>
                        </div>
                    </div>
                    {inboundPhone && <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full uppercase tracking-wider">Online</span>}
                </div>
            </div>

            {/* Inbound Configuration */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Inbound Configuration</h3>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">Your Twilio Phone Number</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inboundPhone}
                            onChange={(e) => setInboundPhone(e.target.value)}
                            placeholder="+1 234 567 8900"
                            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                        />
                        <button
                            onClick={handleSaveInbound}
                            disabled={isSaving}
                            className="px-6 py-2 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">Enter the number you purchased in Twilio.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">Twilio Webhook URL</label>
                    <div className="flex gap-2">
                        <input
                            readOnly
                            value={webhookUrl}
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-mono text-xs"
                        />
                        <button
                            onClick={() => copyToClipboard(webhookUrl)}
                            className="px-4 py-2 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-200 transition-all border border-gray-200"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">Paste this URL into the "Voice & Fax" Webhook field in your Twilio Console.</p>
                </div>
            </div>

            {/* Test Call */}
            <div className="pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Connection Verification</h3>
                <div className="flex gap-3">
                    <input
                        type="tel"
                        placeholder="Enter your cell phone number..."
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-sm font-medium"
                    />
                    <button
                        onClick={handleTestCall}
                        disabled={calling || !testPhone}
                        className="px-5 py-2 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm shadow-green-100"
                    >
                        {calling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                        Call Me
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">We will call this number to verify your AI agent is active.</p>
            </div>
        </div>
    );
}

// --- Main Page Component ---

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    // Modal States
    const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [configModal, setConfigModal] = useState<{ isOpen: boolean, type: string | null }>({ isOpen: false, type: null });

    // Data State
    const [integrationLoading, setIntegrationLoading] = useState<string | null>(null);
    const [integrations, setIntegrations] = useState<any>({});
    const [workflows, setWorkflows] = useState<any[]>([]);

    const [settings, setSettings] = useState({
        brandColor: '#000000',
        aiName: '',
        logoUrl: '',
        customSystemPrompt: '',
        plan: 'Basic'
    });

    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        avatarUrl: ''
    });

    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Validation Logic
    const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
    const isValidPhone = (phone: string) => !phone || /^\+?[0-9\s-()]+$/.test(phone);
    const isValidUrl = (url: string) => !url || /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(url);


    useEffect(() => {
        fetchSettings();
        fetchWorkflows(); // Load workflows on mount
    }, []);

    const fetchSettings = async () => {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        try {
            const res = await fetch(`${apiUrl}/api/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const user = data.user || {};

                // Backend returns the User object directly, which contains tenant info
                setSettings({
                    brandColor: user.tenant?.brandColor || '#000000',
                    aiName: user.tenant?.aiName || '',
                    logoUrl: user.tenant?.logoUrl || '',
                    customSystemPrompt: user.tenant?.customSystemPrompt || '',
                    plan: user.tenant?.plan || 'Basic'
                });

                if (user.tenant?.integrations) {
                    try { setIntegrations(JSON.parse(user.tenant.integrations) || {}); } catch (e) { setIntegrations({}); }
                }

                setProfile({
                    name: user.name || '',
                    email: user.email,
                    phoneNumber: user.phoneNumber || '',
                    avatarUrl: user.avatarUrl || ''
                });
            } else {
                const errorData = await res.json();
                console.error('Settings fetch error:', errorData);
                showToast(errorData.error || 'Failed to load settings.', 'error');
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            showToast('Failed to load settings.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkflows = async () => {
        try {
            const res = await fetch('/api/workflows', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            console.log('Workflows fetched:', data);

            if (res.ok) {
                setWorkflows(data.workflows || []); // Ensure we access the .workflows property
            } else {
                console.error('Failed to fetch workflows:', data);
            }
        } catch (error) {
            console.error("Failed to fetch workflows", error);
        }
    };

    const handleSave = async () => {
        // Validation Checks
        if (!isValidEmail(profile.email)) return showToast('Please enter a valid email address.', 'error');
        if (!isValidPhone(profile.phoneNumber)) return showToast('Please enter a valid phone number.', 'error');
        if (settings.logoUrl && !isValidUrl(settings.logoUrl)) return showToast('Please enter a valid Logo URL.', 'error');

        setSaving(true);
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

        if (!token) {
            showToast('Authentication required. Please log in again.', 'error');
            setSaving(false);
            return;
        }

        try {
            // Update tenant settings
            const tenantRes = await fetch(`${apiUrl}/api/settings/tenant`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(settings)
            });

            if (!tenantRes.ok) {
                const tenantError = await tenantRes.json();
                throw new Error(tenantError.error || 'Failed to update organization settings');
            }

            // Update user profile
            const profileRes = await fetch(`${apiUrl}/api/settings/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: profile.name,
                    email: profile.email,
                    phoneNumber: profile.phoneNumber
                })
            });

            if (!profileRes.ok) {
                const profileError = await profileRes.json();
                throw new Error(profileError.error || 'Failed to update profile');
            }

            showToast('Settings saved successfully!', 'success');
        } catch (error: any) {
            console.error('Settings save error:', error);
            showToast(error.message || 'Failed to save settings.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (passwords.newPassword !== passwords.confirmPassword) return showToast("New passwords do not match.", 'error');
        if (passwords.newPassword.length < 6) return showToast("Password must be at least 6 characters.", 'error');

        setSaving(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/settings/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword
                })
            });
            if (res.ok) {
                showToast("Password changed successfully.", 'success');
                setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const err = await res.json();
                showToast(err.error || "Failed to change password.", 'error');
            }
        } catch (e) {
            console.error(e);
            showToast("An unexpected error occurred.", 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleWorkflowCreate = async (data: any) => {
        setIsWorkflowModalOpen(false);
        try {
            const res = await fetch('/api/workflows', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast("Workflow created successfully!", 'success');
                fetchWorkflows(); // Refresh list
            } else {
                showToast("Failed to create workflow.", 'error');
            }
        } catch (error) {
            showToast("Network error.", 'error');
        }
    };

    const handleWorkflowDelete = async (id: string) => {
        if (!confirm("Delete this workflow?")) return;
        try {
            const res = await fetch(`/api/workflows/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                showToast("Workflow deleted.", 'success');
                fetchWorkflows();
            }
        } catch (error) {
            showToast("Failed to delete.", 'error');
        }
    };

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        const formData = new FormData();
        formData.append('avatar', file);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/upload/avatar', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setProfile(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
                showToast("Profile picture updated!", 'success');
            }
        } catch (error) {
            console.error('Avatar upload failed:', error);
            showToast("Failed to upload image.", 'error');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // --- Integration Logic ---

    const handleConnectClick = async (key: string) => {
        // Plan check removed to allow access
        // if (settings.plan !== 'Advanced' && settings.plan !== 'Trial' && settings.plan !== 'Basic') return showToast("Upgrade to Advanced to use integrations.", 'error');

        if (key === 'googleCalendar') {
            setIntegrationLoading(key);
            try {
                // Use new tenant-specific calendar endpoint
                const res = await fetch('/api/tenant-calendar/auth-url', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await res.json();
                if (data.success && data.authUrl) {
                    window.location.href = data.authUrl;
                    return;
                } else {
                    throw new Error('No auth URL returned');
                }
            } catch (e) {
                console.error(e);
                showToast('Failed to initiate Google Calendar connection', 'error');
                setIntegrationLoading(null);
                return;
            }
        }

        // setConfigModal({ isOpen: true, type: key });
        // Simulating immediate connect attempt for others
        handleConfigSave(key, {});
    };

    const handleConfigSave = async (key: string, data: any) => {
        setConfigModal(prev => ({ ...prev, isOpen: false }));
        const token = localStorage.getItem('token');

        setIntegrationLoading(key);
        await new Promise(r => setTimeout(r, 1500));

        const newState = {
            ...integrations,
            [key]: {
                connected: true,
                connectedAt: new Date().toISOString(),
                ...data
            }
        };

        try {
            const res = await fetch('/api/settings/integrations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ integrations: JSON.stringify(newState) }) // Note JSON stringify wrapper
            });

            if (res.ok) {
                setIntegrations(newState);
                showToast(`${key} connected successfully!`, 'success');
            } else {
                showToast('Failed to update integration status.', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Network error.', 'error');
        } finally {
            setIntegrationLoading(null);
            setConfigModal({ isOpen: false, type: null });
        }
    };

    const handleDisconnect = async (key: string) => {
        const token = localStorage.getItem('token');
        setIntegrationLoading(key);

        try {
            if (key === 'googleCalendar') {
                const res = await fetch('/api/tenant-calendar/disconnect', {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setIntegrations({ ...integrations, [key]: { connected: false } });
                    showToast('Google Calendar disconnected successfully.', 'success');
                } else {
                    throw new Error(data.message || 'Failed to disconnect');
                }
            } else {
                const newState = { ...integrations, [key]: { connected: false } };
                const res = await fetch('/api/settings/integrations', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ integrations: JSON.stringify(newState) })
                });

                if (res.ok) {
                    setIntegrations(newState);
                    showToast(`Disconnected successfully.`, 'success');
                }
            }
        } catch (e) {
            console.error(e);
            showToast('Failed to disconnect.', 'error');
        } finally {
            setIntegrationLoading(null);
        }
    };

    const Tabs = ['Profile', 'Branding', 'AI', 'Voice Agent', 'Integrations', 'Security', 'Billing'];

    const [activeTab, setActiveTab] = useState('Profile');

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#F3F4F6]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-gray-500 font-medium animate-pulse">Loading settings...</p>
                </div>
            </div>
        );
    }

    const isAdvanced = settings.plan === 'Advanced' || settings.plan === 'Enterprise' || settings.plan === 'Trial';

    return (
        <div className="max-w-6xl mx-auto pb-20 relative px-4 md:px-8">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <WorkflowModal isOpen={isWorkflowModalOpen} onClose={() => setIsWorkflowModalOpen(false)} onSave={handleWorkflowCreate} />
            <AuditLogsModal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-gray-500 mt-1">Manage your account preferences and configurations.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                    Save Changes
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-100 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
                    {Tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                                ${activeTab === tab
                                    ? 'bg-white text-blue-600 shadow-md shadow-blue-50 border border-blue-50'
                                    : 'text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm'
                                }`}
                        >
                            {tab === 'Profile' && <User className="w-4 h-4" />}
                            {tab === 'Branding' && <Palette className="w-4 h-4" />}
                            {tab === 'AI' && <Bot className="w-4 h-4" />}
                            {tab === 'Voice Agent' && <Phone className="w-4 h-4" />}
                            {tab === 'Integrations' && <Building className="w-4 h-4" />}
                            {tab === 'Security' && <Shield className="w-4 h-4" />}
                            {tab === 'Billing' && <CreditCard className="w-4 h-4" />}
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 md:p-10 overflow-y-auto">

                    {/* PROFILE TAB */}
                    {activeTab === 'Profile' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Personal Profile</h2>
                                <p className="text-gray-500 text-sm">Update your photo and personal details.</p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <div className="flex flex-col items-center gap-3">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg cursor-pointer group hover:border-blue-50 transition-all"
                                    >
                                        <img
                                            src={profile.avatarUrl ? (profile.avatarUrl.startsWith('data:') || profile.avatarUrl.startsWith('http') || profile.avatarUrl.startsWith('/') ? profile.avatarUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${profile.avatarUrl}`) : `https://ui-avatars.com/api/?name=${profile.name || 'User'}&background=0D8ABC&color=fff`}
                                            alt="Avatar"
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera className="w-8 h-8 text-white drop-shadow-md" />
                                        </div>
                                        {uploadingAvatar && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                                    <button onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Change Photo</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                                                value={profile.name}
                                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                                placeholder="e.g. John Doe"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="email"
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                                                value={profile.email}
                                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                                placeholder="e.g. john@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="tel"
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                                                value={profile.phoneNumber}
                                                onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                                                placeholder="+1 234 567 8900"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BRANDING TAB */}
                    {activeTab === 'Branding' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Company Branding</h2>
                                <p className="text-gray-500 text-sm">Customize the look and feel of your client portal.</p>
                            </div>

                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Brand Color</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative group">
                                            <input
                                                type="color"
                                                className="w-14 h-14 rounded-xl cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                                                value={settings.brandColor}
                                                onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })}
                                            />
                                            <div className="absolute inset-0 ring-1 ring-black/10 rounded-xl pointer-events-none" />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono text-sm uppercase"
                                                value={settings.brandColor}
                                                onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Logo URL</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-medium text-gray-900"
                                            placeholder="https://example.com/logo.png"
                                            value={settings.logoUrl}
                                            onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                                        />
                                        {settings.logoUrl && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-white border border-gray-100 rounded-lg shadow-sm">
                                                <img src={settings.logoUrl} alt="Preview" className="h-6 w-6 object-contain" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI TAB */}
                    {activeTab === 'AI' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">AI Configuration</h2>
                                <p className="text-gray-500 text-sm">Tailor your AI assistant's persona and instructions.</p>
                            </div>

                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assistant Name</label>
                                    <div className="relative">
                                        <Bot className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-medium text-gray-900"
                                            value={settings.aiName}
                                            onChange={(e) => setSettings({ ...settings, aiName: e.target.value })}
                                            placeholder="e.g. BizBot 9000"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Custom System Prompt</label>
                                        {!isAdvanced && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                                <Lock className="w-3 h-3" /> Growth/Enterprise Feature
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            className={`w-full p-4 bg-white border border-gray-200 rounded-xl text-sm h-40 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none leading-relaxed ${!isAdvanced ? 'blur-[2px] select-none pointer-events-none opacity-50' : 'text-gray-900'}`}
                                            placeholder="Enter detailed instructions for your AI agent..."
                                            value={settings.customSystemPrompt}
                                            onChange={(e) => setSettings({ ...settings, customSystemPrompt: e.target.value })}
                                        />
                                        {!isAdvanced && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <button className="bg-white shadow-xl px-4 py-2 rounded-xl text-xs font-bold text-gray-800 flex items-center gap-2 border border-gray-100 hover:scale-105 transition-transform">
                                                    Upgrade to Edit
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VOICE AGENT TAB */}
                    {activeTab === 'Voice Agent' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Voice Agent Configuration</h2>
                                <p className="text-gray-500 text-sm">Connect your Twilio voice agent to handle inbound and outbound calls.</p>
                            </div>

                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-6">
                                <VoiceAgentSettings showToast={showToast} />
                            </div>
                        </div>
                    )}

                    {/* INTEGRATIONS TAB */}
                    {activeTab === 'Integrations' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Integrations & Workflows</h2>
                                    <p className="text-gray-500 text-sm">Connect your tools and automate tasks.</p>
                                </div>
                                <button
                                    onClick={() => setIsWorkflowModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors shadow-lg shadow-gray-200"
                                >
                                    <Plus className="w-3.5 h-3.5" /> New Workflow
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <CalendarSettings
                                    integrations={integrations}
                                    onConnectClick={handleConnectClick}
                                    onDisconnectClick={handleDisconnect}
                                    loading={integrationLoading}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <IntegrationItem
                                    name="Stripe Payments"
                                    description="Accept payments in USD."
                                    connectedKey="stripe"
                                    integrations={integrations}
                                    onConnectClick={handleConnectClick}
                                    onDisconnectClick={handleDisconnect}
                                    loading={integrationLoading}
                                    icon={CreditCard}
                                />
                                <IntegrationItem
                                    name="Mailchimp"
                                    description="Sync client emails automatically."
                                    connectedKey="mailchimp"
                                    integrations={integrations}
                                    onConnectClick={handleConnectClick}
                                    onDisconnectClick={handleDisconnect}
                                    loading={integrationLoading}
                                    icon={Mail}
                                />
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Active Workflows</h3>
                                {(!Array.isArray(workflows) || workflows.length === 0) ? (
                                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm">No custom workflows yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {workflows.map((wf) => (
                                            <div key={wf?.id || Math.random()} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between group hover:border-blue-200 hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                        <Zap className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{wf?.name || 'Untitled'}</p>
                                                        <p className="text-xs text-gray-500 capitalize">
                                                            {(wf?.trigger || '').replace(/_/g, ' ')} → {(wf?.action || '').replace(/_/g, ' ')}
                                                        </p>
                                                    </div>
                                                </div>
                                                {wf?.id && (
                                                    <button onClick={() => handleWorkflowDelete(wf.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'Security' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Security Settings</h2>
                                    <p className="text-gray-500 text-sm">Manage password and access logs.</p>
                                </div>
                                <button
                                    onClick={() => setIsAuditModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    <FileText className="w-3.5 h-3.5" /> View Audit Logs
                                </button>
                            </div>

                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="password"
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                                                value={passwords.currentPassword}
                                                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                                            <input
                                                type="password"
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                                                value={passwords.newPassword}
                                                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                                            <input
                                                type="password"
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                                                value={passwords.confirmPassword}
                                                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <button
                                            onClick={handlePasswordChange}
                                            disabled={!passwords.currentPassword || !passwords.newPassword}
                                            className="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Update Password
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BILLING TAB */}
                    {activeTab === 'Billing' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Billing & Subscription</h2>
                                <p className="text-gray-500 text-sm">Manage your plan and payment methods.</p>
                            </div>
                            <SubscriptionSettings plan={settings.plan} showToast={showToast} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
