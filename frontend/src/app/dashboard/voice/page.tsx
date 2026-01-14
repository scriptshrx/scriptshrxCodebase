'use client';

import { useState, useEffect } from 'react';
import {
    Phone, Mic, Activity, Save, Play, PhoneOutgoing, Settings, MessageSquare,
    Bot, PhoneIncoming, Globe, Copy, Clock, FileText, RefreshCw, X,
    ChevronRight, User, Calendar, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const API_URL = 'https://scriptshrxcodebase.onrender.com'

interface AIConfig {
    aiName: string;
    welcomeMessage: string;
    customSystemPrompt: string;
    model?: string;
}

interface CallSession {
    id: string;
    callSid: string;
    callerPhone: string;
    status: string;
    direction: string;
    startedAt: string;
    endedAt?: string;
    duration?: number;
    summary?: string;
    actionItems?: any[];
    transcript?: string;
    client?: { id: string; name: string; phone: string };
}

export default function VoicePage() {
    const [activeTab, setActiveTab] = useState<'config' | 'history'>('config');
    const [logs, setLogs] = useState<any[]>([]);
    const [callSessions, setCallSessions] = useState<CallSession[]>([]);
    const [selectedCall, setSelectedCall] = useState<CallSession | null>(null);
    const [showCallDetail, setShowCallDetail] = useState(false);
    const [loading, setLoading] = useState(true);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [inboundPhone, setInboundPhone] = useState('');
    const [webhookUrl, setWebhookUrl] = useState(`https://scriptshrxcodebase.onrender.com/api/twilio/webhook/voice`);
    const [isCalling, setIsCalling] = useState(false);
    const [callStatus, setCallStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isCreatingMinute, setIsCreatingMinute] = useState(false);

    const [aiConfig, setAiConfig] = useState<AIConfig>({
        aiName: '',
        welcomeMessage: '',
        customSystemPrompt: '',
        model: 'gpt-4'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [inboundSaving, setInboundSaving] = useState(false);

    const getToken = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    };

    const getHeaders = () => {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        const token = getToken();
        console.log('[Voice Config] Token present:', !!token);
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('[Voice Config] Authorization header set');
        } else {
            console.warn('[Voice Config] No token found - request will fail');
        }
        return headers;
    };

    useEffect(() => {
        console.log('Voice Page Debug: API_URL is set to successfully'); // Debug for User
        fetchData();
        // Set webhook URL - Prefer production URL strictly unless dev
        if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            if (origin.includes('localhost')) {
                setWebhookUrl('https://scriptishrx.net/api/twilio/webhook/voice');
            } else {
                setWebhookUrl(`${origin}/api/twilio/webhook/voice`);
            }
        }

        // Setup WebSocket for real-time call updates
        let socket: any = null;
        const setupSocket = async () => {
            try {
                const { io } = await import('socket.io-client');
                const token = getToken();
                if (!token) return;

                socket = io(API_URL, {
                    auth: { token },
                    transports: ['websocket', 'polling']
                });

                socket.on('connect', () => {
                    console.log('[Voice] Socket connected for real-time updates');
                });

                socket.on('call:started', (data: any) => {
                    console.log('[Voice] Call started:', data);
                    // Refresh call list immediately
                    fetchCallSessions();
                });

                socket.on('call:ended', (data: any) => {
                    console.log('[Voice] Call ended:', data);
                    // Refresh call list after a small delay to allow DB write
                    setTimeout(() => fetchCallSessions(), 1000);
                });

                socket.on('disconnect', () => {
                    console.log('[Voice] Socket disconnected');
                });

            } catch (error) {
                console.error('[Voice] Socket setup error:', error);
            }
        };

        setupSocket();

        // Cleanup
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    const fetchData = async () => {
        await Promise.all([fetchOrgInfo(), fetchLogs(), fetchCallSessions()]);
        setLoading(false);
    };

    const fetchOrgInfo = async () => {
        try {
            const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/organization/info`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.organization) {
                    const org = data.organization;
                    setAiConfig({
                        aiName: org.aiConfig?.aiName || org.aiName || 'ScriptishRx Assistant',
                        welcomeMessage: org.aiConfig?.welcomeMessage || org.aiWelcomeMessage || 'Hello, how can I help you today?',
                        customSystemPrompt: org.aiConfig?.systemPrompt || org.customSystemPrompt || 'You are a helpful assistant.',
                        model: org.aiConfig?.model || 'gpt-4'
                    });
                    if (org.twilioConfig?.phoneNumber) {
                        setInboundPhone(org.twilioConfig.phoneNumber);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching org info:', error);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/voice/logs`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setLogs(Array.isArray(data) ? data : data.logs || []);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    };

    const fetchCallSessions = async () => {
        try {
            const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/voice/calls`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setCallSessions(data.calls || []);
            }
        } catch (error) {
            console.error('Error fetching call sessions:', error);
        }
    };

    const fetchCallDetail = async (callId: string) => {
        try {
            const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/voice/calls/${callId}`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setSelectedCall(data.call);
                setShowCallDetail(true);
            }
        } catch (error) {
            console.error('Error fetching call detail:', error);
        }
    };

    const regenerateSummary = async (callId: string) => {
        setIsRegenerating(true);
        try {
            const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/voice/calls/${callId}/summarize`, {
                method: 'POST',
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (selectedCall) {
                    setSelectedCall({ ...selectedCall, summary: data.summary?.summary });
                }
                await fetchCallSessions();
                alert('Summary regenerated successfully!');
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to regenerate summary');
            }
        } catch (error) {
            console.error('Error regenerating summary:', error);
            alert('Error regenerating summary');
        } finally {
            setIsRegenerating(false);
        }
    };

    const createMeetingMinute = async (callId: string) => {
        setIsCreatingMinute(true);
        try {
            const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/voice/calls/${callId}/meeting-minute`, {
                method: 'POST',
                headers: getHeaders()
            });
            if (res.ok) {
                alert('Meeting minute created successfully! View it in Meeting Minutes.');
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create meeting minute');
            }
        } catch (error) {
            console.error('Error creating meeting minute:', error);
            alert('Error creating meeting minute');
        } finally {
            setIsCreatingMinute(false);
        }
    };

    const handleSaveConfig = async () => {
        // Validation: Ensure all required fields are filled
        if (!aiConfig.aiName || !aiConfig.aiName.trim()) {
            alert('Agent Name is required');
            return;
        }
        if (!aiConfig.welcomeMessage || !aiConfig.welcomeMessage.trim()) {
            alert('Welcome Message is required');
            return;
        }
        if (!aiConfig.customSystemPrompt || !aiConfig.customSystemPrompt.trim()) {
            alert('System Instructions are required');
            return;
        }

        setIsSaving(true);
        try {
            console.log('[Voice Config] Sending PATCH request to /api/organization/info');
            console.log('[Voice Config] Payload:', { aiName: aiConfig.aiName, welcomeMessage: aiConfig.welcomeMessage, systemPrompt: aiConfig.customSystemPrompt });
            
            const res = await fetch('https://scriptshrxcodebase.onrender.com/api/organization/info', {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({
                    aiName: aiConfig.aiName,
                    aiWelcomeMessage: aiConfig.welcomeMessage,
                    customSystemPrompt: aiConfig.customSystemPrompt,
                    aiConfig: {
                        aiName: aiConfig.aiName,
                        welcomeMessage: aiConfig.welcomeMessage,
                        systemPrompt: aiConfig.customSystemPrompt,
                        model: aiConfig.model
                    }
                })
            });
            
            console.log('[Voice Config] Response status:', res.status);
            
            let data;
            try {
                data = await res.json();
                console.log('[Voice Config] Response data:', data);
            } catch (parseError) {
                console.error('[Voice Config] Failed to parse response:', parseError);
                alert(`Server error (${res.status}): Unable to parse response`);
                return;
            }
            
            if (res.ok) {
                alert('AI Agent configuration saved successfully!');
            } else {
                alert(data.error || `Failed to save configuration (${res.status})`);
            }
        } catch (error: any) {
            console.error('[Voice Config] Error saving config:', error);
            console.error('[Voice Config] Error type:', error.name);
            console.error('[Voice Config] Error message:', error.message);
            alert(error.message || 'Error saving configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveInbound = async () => {
        if (!inboundPhone) return;
        setInboundSaving(true);
        try {
            const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/organization/info`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ twilioConfig: { phoneNumber: inboundPhone } })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Inbound number updated! Please ensure your Twilio webhook is set.');
            } else {
                alert(data.error || 'Failed to save inbound number');
            }
        } catch (error) {
            console.error('Error saving inbound:', error);
            alert('An unexpected error occurred.');
        } finally {
            setInboundSaving(false);
        }
    };

    const handleCall = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanPhone = phoneNumber.trim();
        if (!cleanPhone) return;

        setIsCalling(true);
        setCallStatus('idle');

        try {
            const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/voice/outbound`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ to: cleanPhone }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || data.error || 'Call failed');
            setCallStatus('success');
            setFeedbackMessage('Call initiated! Your AI agent will answer.');
            setPhoneNumber('');
            setTimeout(() => { fetchLogs(); fetchCallSessions(); }, 2000);
        } catch (error: any) {
            console.error('Call error:', error);
            setCallStatus('error');
            setFeedbackMessage(error.message);
        } finally {
            setIsCalling(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'completed': 'bg-green-50 text-green-700 border-green-100',
            'in_progress': 'bg-blue-50 text-blue-700 border-blue-100',
            'failed': 'bg-red-50 text-red-600 border-red-100'
        };
        return styles[status] || 'bg-gray-50 text-gray-600 border-gray-100';
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Voice Agent Studio</h1>
                    <p className="text-gray-500 mt-2">Design, train, and manage your AI voice concierge.</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('config')}
                    className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'config'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Settings className="w-4 h-4 inline-block mr-2" />
                    Configuration
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'history'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Clock className="w-4 h-4 inline-block mr-2" />
                    Call History
                    {callSessions.length > 0 && (
                        <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                            {callSessions.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Configuration Tab */}
            {activeTab === 'config' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: AI Logic Configuration */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">AI Personality & Logic</h2>
                                    <p className="text-gray-500 text-xs mt-0.5">Customize how the AI thinks and speaks.</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-800">Agent Name</label>
                                        <Input
                                            value={aiConfig.aiName}
                                            onChange={(e) => setAiConfig({ ...aiConfig, aiName: e.target.value })}
                                            placeholder="e.g. Sarah from Front Desk"
                                            className="bg-white border border-gray-300 text-gray-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-800">AI Model</label>
                                        <select
                                            value={aiConfig.model}
                                            onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                                        >
                                            <option value="gpt-4">GPT-4 (Recommended)</option>
                                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fastest)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Welcome Message</label>
                                    <Input
                                        value={aiConfig.welcomeMessage}
                                        onChange={(e) => setAiConfig({ ...aiConfig, welcomeMessage: e.target.value })}
                                        placeholder="e.g. Thanks for calling ScriptishRx. How can I help?"
                                        className="bg-white border border-gray-300 text-gray-900"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">System Instructions</label>
                                    <textarea
                                        value={aiConfig.customSystemPrompt}
                                        onChange={(e) => setAiConfig({ ...aiConfig, customSystemPrompt: e.target.value })}
                                        placeholder="Describe your business, hours, and how to handle scenarios..."
                                        className="w-full min-h-[200px] p-4 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm resize-y"
                                    />
                                </div>

                                <Button
                                    onClick={handleSaveConfig}
                                    disabled={isSaving}
                                    className="w-full h-12 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold"
                                >
                                    {isSaving ? <Activity className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                    {isSaving ? 'Saving...' : 'Save AI Configuration'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Inbound & Outbound */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Inbound Configuration */}
                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                                <div className="p-2 bg-purple-600 text-white rounded-lg shadow-sm">
                                    <PhoneIncoming className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Inbound Configuration</h2>
                                    <p className="text-gray-500 text-xs mt-0.5">Set up your business phone line.</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Twilio Phone Number</label>
                                    <Input
                                        value={inboundPhone}
                                        onChange={(e) => setInboundPhone(e.target.value)}
                                        placeholder="+1 234 567 8900"
                                        className="bg-white border-gray-300 text-gray-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Webhook URL</label>
                                    <div className="flex gap-2">
                                        <Input readOnly value={webhookUrl} className="bg-gray-50 text-gray-500 text-xs font-mono" />
                                        <Button variant="outline" onClick={() => copyToClipboard(webhookUrl)} className="px-3">
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSaveInbound}
                                    disabled={inboundSaving || !inboundPhone}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                                >
                                    {inboundSaving ? 'Saving...' : 'Link Inbound Number'}
                                </Button>
                            </div>
                        </div>
                        {/* Live Agent Preview (Outbound) */}
                        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                                <div className="p-2 bg-green-600 text-white rounded-lg shadow-sm">
                                    <PhoneOutgoing className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Live Agent Preview</h2>
                                    <p className="text-gray-500 text-xs mt-0.5">Receive a call to verify your AI configuration.</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-5">
                                <form onSubmit={handleCall} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-800">Your Phone Number</label>
                                        <Input
                                            placeholder="+1 234 567 8900"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            className="h-11 bg-gray-50 border border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-green-500 rounded-xl px-4"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold"
                                        disabled={isCalling || !phoneNumber}
                                    >
                                        {isCalling ? <><Activity className="w-4 h-4 animate-spin mr-2" /> Calling...</> : 'Call Me'}
                                    </Button>
                                    {callStatus === 'success' && (
                                        <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm text-center border border-green-100">
                                            {feedbackMessage}
                                        </div>
                                    )}
                                    {callStatus === 'error' && (
                                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center border border-red-100">
                                            {feedbackMessage}
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
                                <div className="text-3xl font-bold text-gray-900 mb-1">{callSessions.length}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Calls</div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
                                <div className="text-3xl font-bold text-green-600 mb-1">Active</div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Status</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Call History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {/* Refresh Button */}
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={fetchCallSessions} className="gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>
                    </div>

                    {/* Call Sessions Table */}
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Caller</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Duration</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Summary</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {callSessions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                        <Phone className="w-6 h-6 text-gray-400" />
                                                    </div>
                                                    <p className="font-medium">No calls recorded yet.</p>
                                                    <p className="text-sm text-gray-400">Inbound calls will appear here with transcripts and summaries.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        callSessions.map((call) => (
                                            <tr key={call.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => fetchCallDetail(call.id)}>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getStatusBadge(call.status)}`}>
                                                        {call.status === 'in_progress' ? 'Live' : call.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-semibold text-gray-900 group-hover:text-blue-600">
                                                            {call.client?.name || call.callerPhone || 'Unknown'}
                                                        </p>
                                                        {call.client && <p className="text-xs text-gray-500">{call.callerPhone}</p>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 font-mono">
                                                    {formatDuration(call.duration)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                                                    {call.summary || <span className="text-gray-400 italic">No summary</span>}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-sm">
                                                    {formatDate(call.startedAt)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                                                        View <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Call Detail Modal */}
            {showCallDetail && selectedCall && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-xl">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Call Details</h2>
                                    <p className="text-sm text-gray-500">
                                        {selectedCall.client?.name || selectedCall.callerPhone} • {formatDate(selectedCall.startedAt)}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowCallDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Call Info */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Duration</p>
                                    <p className="text-xl font-bold text-gray-900">{formatDuration(selectedCall.duration)}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</p>
                                    <p className={`text-xl font-bold ${selectedCall.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                                        {selectedCall.status === 'completed' ? 'Completed' : 'In Progress'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Direction</p>
                                    <p className="text-xl font-bold text-gray-900 capitalize">{selectedCall.direction}</p>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-gray-900">AI Summary</h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => regenerateSummary(selectedCall.id)}
                                        disabled={isRegenerating}
                                        className="text-blue-600 hover:text-blue-700"
                                    >
                                        {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                                        Regenerate
                                    </Button>
                                </div>
                                <p className="text-gray-700">
                                    {selectedCall.summary || 'No summary available. Click Regenerate to create one.'}
                                </p>
                            </div>

                            {/* Action Items */}
                            {selectedCall.actionItems && selectedCall.actionItems.length > 0 && (
                                <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
                                    <h3 className="font-bold text-gray-900 mb-3">Action Items</h3>
                                    <ul className="space-y-2">
                                        {selectedCall.actionItems.map((item: any, i: number) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                                                <span className="text-gray-700">{item.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Transcript */}
                            {selectedCall.transcript && (
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-3">Full Transcript</h3>
                                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 max-h-64 overflow-y-auto">
                                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                                            {selectedCall.transcript}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between">
                            <Button variant="outline" onClick={() => setShowCallDetail(false)}>
                                Close
                            </Button>
                            <Button
                                onClick={() => createMeetingMinute(selectedCall.id)}
                                disabled={isCreatingMinute || !selectedCall.transcript}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isCreatingMinute ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                                Create Meeting Minute
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}