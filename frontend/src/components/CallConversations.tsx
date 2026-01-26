'use client';

import { useState } from 'react';
import { ChevronDown, Phone, Volume2, Clock } from 'lucide-react';

interface CallSession {
    id: string;
    callSid: string;
    transcript?: string;
    summary?: string;
    duration?: number;
    direction: string;
    startedAt: string;
    endedAt?: string;
    status: string;
}

interface CallConversationsProps {
    callSessions?: CallSession[];
    clientName: string;
}

export default function CallConversations({ callSessions = [], clientName }: CallConversationsProps) {
    const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

    if (!callSessions || callSessions.length === 0) {
        return (
            <div className="text-sm text-gray-400 py-2">
                No call conversations yet
            </div>
        );
    }

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Call History ({callSessions.length})
            </div>
            {callSessions.map((call) => (
                <div
                    key={call.id}
                    className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden hover:border-gray-200 transition-colors"
                >
                    <button
                        onClick={() => setExpandedCallId(expandedCallId === call.id ? null : call.id)}
                        className="w-full p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-3 text-left flex-1">
                            <div className={`p-2 rounded-lg ${call.direction === 'inbound' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                <Phone className={`w-4 h-4 ${call.direction === 'inbound' ? 'text-blue-600' : 'text-green-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900">
                                        {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        call.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {call.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDate(call.startedAt)}</span>
                                    <span className="mx-1">•</span>
                                    <Volume2 className="w-3 h-3" />
                                    <span>{formatDuration(call.duration)}</span>
                                </div>
                            </div>
                        </div>
                        <ChevronDown
                            className={`w-4 h-4 text-gray-400 transition-transform ${expandedCallId === call.id ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {expandedCallId === call.id && (
                        <div className="border-t border-gray-100 bg-white p-3 space-y-3">
                            {call.summary && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-700 mb-1">Summary</h4>
                                    <p className="text-sm text-gray-600 leading-relaxed">{call.summary}</p>
                                </div>
                            )}

                            {call.transcript && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Transcript</h4>
                                    <div className="bg-gray-50 rounded p-2 max-h-60 overflow-y-auto text-xs text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                                        {call.transcript}
                                    </div>
                                </div>
                            )}

                            {!call.transcript && !call.summary && (
                                <p className="text-sm text-gray-400 italic">No transcript or summary available for this call.</p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
