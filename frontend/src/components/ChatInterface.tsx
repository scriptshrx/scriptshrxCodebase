'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Sparkles, Mic, MicOff, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const API_URL = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000'
    : 'https://scriptshrxcodebase.onrender.com';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    error?: boolean;
}

interface ChatInterfaceProps {
    token?: string;
    tenantId?: string;
    isDashboard?: boolean;
    systemPrompt?: string;
    aiName?: string;
    welcomeMessage?: string;
    model?: string;
    faqs?: Array<{ question: string; answer: string }>;
}

export default function ChatInterface({ tenantId: propTenantId, token, isDashboard = false, systemPrompt, aiName, welcomeMessage, model = 'gpt-4', faqs }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        checkChatStatus();
        fetchChatHistory();
    }, []);

    const checkChatStatus = async () => {
        try {
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_URL}/api/chat/status`, { headers });
            const data = await res.json();

            if (data.success) {
                setIsOnline(data.status === 'online');
            }
        } catch (error) {
            console.error('Error checking chat status:', error);
            setIsOnline(false);
        }
    };

    const fetchChatHistory = async () => {
        try {
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_URL}/api/chat/history`, { headers });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.messages && Array.isArray(data.messages)) {
                    setMessages(data.messages);
                }
            }
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setLoading(true);

        const tempUserMsg: Message = {
            id: `temp_${Date.now()}`,
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            const apiUrl = API_URL;
            const tenantId = propTenantId || process.env.NEXT_PUBLIC_LANDING_TENANT_ID;

            const headers: any = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const requestBody = {
                message: userMessage,
                tenantId: tenantId || 'default',
                systemPrompt: systemPrompt,
                model: model
            };

            console.log('[ChatInterface] Sending to:', `${apiUrl}/api/chat/message`);
            console.log('[ChatInterface] Request body:', requestBody);

            const res = await fetch(`${apiUrl}/api/chat/message`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            console.log('[ChatInterface] Response status:', res.status);
            console.log('[ChatInterface] Response headers:', res.headers);

            const data = await res.json();

            console.log('[ChatInterface] Response:', data);

            if (data.success && data.response) {
                const assistantMsg: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, assistantMsg]);
            } else {
                const errorMessage = data.message || data.error || 'Failed to get response from AI';
                console.error('[ChatInterface] API returned error:', errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            const errorMsg: Message = {
                id: `error_${Date.now()}`,
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message || 'Unable to connect to the AI service. Please try again.'}`,
                timestamp: new Date().toISOString(),
                error: true
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        if (!confirm('Are you sure you want to clear the chat history?')) return;

        try {
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_URL}/api/chat/history`, {
                method: 'DELETE',
                headers
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setMessages([]);
            }
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    };

    const toggleVoiceRecording = () => {
        if (isRecording) {
            setIsRecording(false);
        } else {
            setIsRecording(true);
            setTimeout(() => {
                setIsRecording(false);
                alert('Voice recording feature coming soon!');
            }, 1000);
        }
    };

    return (
        <div className={cn(
            "flex flex-col w-full bg-white md:rounded-3xl shadow-sm border border-slate-100 overflow-hidden font-sans",
            isDashboard ? "h-full min-h-[500px]" : "h-[500px]"
        )}>
            <div className={cn(
                "p-4 border-b border-slate-100 flex items-center justify-between",
                isDashboard ? "bg-white/80 backdrop-blur-sm px-6 py-4" : "bg-slate-900 border-slate-800"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105",
                        isDashboard ? "w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-800 shadow-slate-900/20" : "w-10 h-10 bg-gradient-to-br from-primary-start to-primary-end shadow-primary-start/20"
                    )}>
                        <Sparkles className={cn("w-5 h-5", isDashboard ? "text-white" : "text-white")} />
                    </div>
                    <div>
                        <h3 className={cn("font-bold text-sm tracking-tight", isDashboard ? "text-slate-900 text-base" : "text-white")}>
                            {aiName || (isDashboard ? "AI Concierge" : "AI Assistant")}
                        </h3>
                        <div className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full animate-pulse", isOnline ? "bg-emerald-500" : "bg-rose-500")}></span>
                            <p className={cn("text-xs font-medium", isDashboard ? "text-slate-500" : "text-slate-400")}>
                                {isOnline ? (isDashboard ? 'Active & Ready' : 'Online Now') : 'Connecting...'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearHistory}
                        className={cn("rounded-full w-8 h-8", isDashboard ? "text-slate-400 hover:text-red-500 hover:bg-red-50" : "text-slate-400 hover:text-white hover:bg-white/10")}
                        title="Clear history"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
                {messages.length === 0 ? (
                    <div className={cn("flex flex-col items-center justify-center h-full text-center p-6 opacity-0 animate-in fade-in zoom-in duration-500 fill-mode-forwards", { "opacity-100": true })}>
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg shadow-blue-900/5 flex items-center justify-center mb-5 border border-slate-100/50">
                            <Bot className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
                            How can I help you?
                        </h3>
                        <p className="text-slate-500 text-sm max-w-[260px] mx-auto leading-relaxed mb-8">
                            {welcomeMessage || "I'm here to assist with bookings, answer questions, or help you navigate."}
                        </p>

                        <div className={cn("grid gap-2.5 w-full", isDashboard ? "grid-cols-1 sm:grid-cols-2 max-w-md" : "grid-cols-1")}>
                            {(faqs && faqs.length > 0 ? faqs.map(faq => faq.question) : ["Check pricing information", "How does the system work?", "Schedule a new demo"]).map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => {
                                        setInput(suggestion);
                                    }}
                                    className="px-4 py-3 bg-white border border-slate-200/60 rounded-xl text-sm font-medium text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:shadow-md hover:shadow-blue-500/5 transition-all text-left whitespace-normal h-auto leading-snug group"
                                >
                                    <span className="group-hover:translate-x-0.5 transition-transform inline-block">{suggestion}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                                msg.role === 'user' ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "flex max-w-[85%] gap-3",
                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-1",
                                    msg.role === 'user' ? "bg-slate-200" : "bg-white border border-slate-100 text-blue-600"
                                )}>
                                    {msg.role === 'user' ? <div className="w-full h-full rounded-full bg-slate-200/80" /> : <Bot className="w-5 h-5" />}
                                </div>

                                <div className={cn(
                                    "p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-slate-900 text-white rounded-tr-none shadow-slate-900/10"
                                        : "bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-slate-200/50",
                                    msg.error && "bg-red-50 text-red-600 border-red-200"
                                )}>
                                    {msg.content}
                                    <div className={cn(
                                        "text-[10px] mt-1.5 font-medium",
                                        msg.role === 'user' ? "text-slate-400/80" : "text-slate-400"
                                    )}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {loading && (
                    <div className="flex justify-start animate-in fade-in">
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm text-blue-600 mt-1">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className={cn("p-3 bg-white border-t border-slate-100", isDashboard ? "p-4" : "p-3")}>
                <form onSubmit={handleSend} className="flex items-end gap-2 p-1.5 bg-white border border-slate-200 rounded-[1.5rem] focus-within:ring-4 focus-within:ring-slate-100 focus-within:border-slate-300 transition-all shadow-sm hover:border-slate-300">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={toggleVoiceRecording}
                        className={cn(
                            "rounded-full w-9 h-9 flex-shrink-0 hover:bg-slate-100 text-slate-500 transition-colors",
                            isRecording && "bg-red-100 text-red-500 hover:bg-red-200 animate-pulse"
                        )}
                        title="Voice Input (Coming Soon)"
                    >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>

                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message to chat..."
                        disabled={loading}
                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2.5 h-auto max-h-32 min-h-[44px] text-sm text-slate-900 placeholder:text-slate-500 font-medium"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />

                    <Button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className={cn(
                            "rounded-full w-9 h-9 p-0 flex items-center justify-center transition-all flex-shrink-0 shadow-sm",
                            input.trim()
                                ? "bg-slate-900 hover:bg-black text-white scale-100 shadow-slate-900/20"
                                : "bg-slate-100 text-slate-400 scale-95"
                        )}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 ml-0.5" />}
                    </Button>
                </form>
                <div className="text-center mt-3">
                    <p className="text-[10px] font-medium text-slate-400/80 uppercase tracking-widest">Powered by ScriptishRx AI</p>
                </div>
            </div>
        </div>
    );
}
