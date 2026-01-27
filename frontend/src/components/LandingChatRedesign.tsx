'use client';

import { useState, useRef, useEffect } from 'react';
import { Home, MessageSquare, HelpCircle, Send, X, ChevronRight, Phone, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const BRAND_COLOR = "bg-blue-600";
const BRAND_TEXT = "ScriptishRx";
const WELCOME_MSG = "AI-Powered Business Automation";

const FAQ_ITEMS = [
    { q: "What is the pricing?", a: "Startup: $99.99 (50 bookings), Growth: $149.99 (Unlimited), Enterprise: $249.99 (White label)." },
    { q: "How long is the free trial?", a: "The free trial lasts for 14 days with full access to premium features." },
    { q: "Is it mobile-friendly?", a: "Yes, ScriptishRx is fully optimized for mobile devices." },
    { q: "How secure is my data?", a: "We are SOC2 Type II compliant with enterprise-grade encryption." },
    { q: "Do you offer refunds?", a: "Yes, we offer a 30-day money-back guarantee." }
];

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    error?: boolean;
}

// Fix: Default to port 5001 for local dev as per server.js
const API_URL = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000'
    : 'https://scriptshrxcodebase.onrender.com';

export default function LandingChatRedesign({ onClose }: { onClose?: () => void }) {
    const [activeTab, setActiveTab] = useState<'home' | 'conversation' | 'faqs'>('home');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init_1',
            role: 'assistant',
            content: 'Hello! I am the ScriptishRx AI assistant. I can help with free trials, pricing, or setting up your automation. How can I help you today?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Persistence: Load from Session Storage on Mount
    useEffect(() => {
        const saved = sessionStorage.getItem('scriptishrx_chat_history');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const rehydrated = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
                setMessages(rehydrated);
            } catch (e) {
                console.error("Failed to load chat history", e);
            }
        }
    }, []);

    // Persistence: Save to Session Storage on Change
    useEffect(() => {
        if (messages.length > 1) {
            sessionStorage.setItem('scriptishrx_chat_history', JSON.stringify(messages));
        }
    }, [messages]);

    useEffect(() => {
        if (activeTab === 'conversation') {
            scrollToBottom();
        }
    }, [activeTab, messages]);

    const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
        e?.preventDefault();
        const textToSend = overrideInput || input;

        if (!textToSend.trim() || loading) return;

        const newUserMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: textToSend,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setLoading(true);
        setActiveTab('conversation');

        try {
            const res = await fetch(`${API_URL}/api/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    tenantId: process.env.NEXT_PUBLIC_LANDING_TENANT_ID || 'landing_guest'
                })
            });

            const data = await res.json();

            if (data.success && data.response) {
                const newAiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, newAiMsg]);
            } else {
                throw new Error(data.error || 'Failed to get response');
            }

        } catch (error) {
            console.error("Chat Error:", error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm having trouble connecting to the server. Please check your internet or try again later.",
                timestamp: new Date(),
                error: true
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickQuestion = (question: string) => {
        setActiveTab('conversation');
        handleSend(undefined, question);
    };

    const handleScheduleDemo = () => {
        window.location.href = '/register?src=chat_demo';
    };

    return (
        <div className="flex flex-col w-full h-full bg-slate-50 font-sans relative">
            {/* Header */}
            <div className={cn(
                "relative transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
                activeTab === 'home' ? "h-[320px]" : "h-[85px]",
                BRAND_COLOR
            )}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none sticky top-0" />

                <div className="relative z-10 p-5 flex flex-col h-full text-white">
                    <div className="flex items-start justify-between mb-2">
                        <div className={cn(
                            "transition-all duration-300",
                            activeTab === 'home' ? "opacity-100 scale-100" : "opacity-0 scale-50"
                        )}>
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                                <MessageSquare className="w-5 h-5 text-blue-600 fill-current" />
                            </div>
                        </div>

                        {onClose && (
                            <button onClick={onClose} aria-label="Close Chat" className="text-white/80 hover:text-white transition-colors p-1 bg-white/10 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className={cn(
                        "mt-auto mb-2 transition-all duration-300",
                        activeTab === 'home' ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none absolute bottom-0"
                    )}>
                        <h2 className="text-3xl font-bold leading-tight mb-1 tracking-tight">{BRAND_TEXT}</h2>
                        <p className="text-blue-50 font-medium text-lg leading-snug opacity-95">{WELCOME_MSG}</p>
                    </div>

                    <div className={cn(
                        "absolute bottom-0 left-0 right-0 p-4 flex items-center gap-3 transition-opacity duration-300",
                        activeTab !== 'home' ? "opacity-100 visible" : "opacity-0 invisible"
                    )}>
                        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <MessageSquare className="w-5 h-5 text-blue-600 fill-current" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-lg leading-none truncate">{BRAND_TEXT}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shrink-0"></span>
                                <span className="text-xs text-blue-100 opacity-90 truncate">AI Agent Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative bg-slate-50 flex flex-col">

                {/* HOME TAB CONTENT */}
                {activeTab === 'home' && (
                    <div className="flex-1 p-4 overflow-y-auto z-20">
                        {/* Visual Fix: Added negative margin -mt-8 to overlap gently from BELOW, relying on flex layout instead of absolute inset */}
                        <div
                            onClick={() => setActiveTab('conversation')}
                            className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 group mb-4 mt-2"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                                    <MessageSquare className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-slate-800">Support Team</h4>
                                        <span className="text-xs text-slate-400">Just now</span>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
                                        Hello! I can help you automate your business. How can I assist you today?
                                    </p>
                                </div>
                                <div className="self-center">
                                    <MessageCircle className="w-5 h-5 text-blue-500 fill-current opacity-80" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 px-1 mt-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Start Conversation</h3>
                            <button
                                onClick={() => setActiveTab('conversation')}
                                className="w-full bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
                            >
                                <Send className="w-4 h-4 ml-1" />
                                Chat with AI
                            </button>
                            <button
                                onClick={handleScheduleDemo}
                                className="w-full bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
                            >
                                <Phone className="w-4 h-4 ml-1" />
                                Schedule Demo
                            </button>
                        </div>
                    </div>
                )}

                {/* CONVERSATION TAB CONTENT */}
                {activeTab === 'conversation' && (
                    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm break-words whitespace-pre-wrap",
                                        msg.role === 'user'
                                            ? "bg-slate-900 text-white rounded-br-none"
                                            : "bg-white text-slate-700 border border-slate-200 rounded-bl-none",
                                        msg.error && "bg-red-50 text-red-600 border-red-200"
                                    )}>
                                        <p>{msg.content}</p>
                                        <span className={cn("text-[10px] block mt-1", msg.role === 'user' ? "text-slate-400" : "text-slate-300")}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {msg.error && (
                                            <button
                                                onClick={() => handleSend(undefined, messages[messages.length - 2]?.content)}
                                                className="mt-2 text-xs font-semibold underline text-red-700 hover:text-red-800"
                                            >
                                                Retry
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 bg-white border-t border-slate-100/50 shrink-0">
                            <form onSubmit={(e) => handleSend(e)} className="flex items-center gap-2">
                                <Input
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-full pl-4 py-6 text-base placeholder:text-slate-400 text-slate-900"
                                    autoFocus
                                    disabled={loading}
                                />
                                <Button type="submit" size="icon" aria-label="Send Message" className="w-12 h-12 rounded-full bg-slate-900 hover:bg-black text-white shrink-0 shadow-md transition-transform active:scale-95" disabled={loading}>
                                    <Send className="w-5 h-5" />
                                </Button>
                            </form>
                        </div>
                    </div>
                )}

                {/* FAQs TAB CONTENT */}
                {activeTab === 'faqs' && (
                    <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 px-2">Common Questions</h3>
                        {FAQ_ITEMS.map((item, i) => (
                            <div
                                key={i}
                                onClick={() => handleQuickQuestion(item.q)}
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer transition-all hover:bg-blue-50/30 group"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-slate-700 text-sm group-hover:text-blue-700">{item.q}</span>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* Bottom Navigation */}
            <div className="h-[70px] bg-white border-t border-slate-100 flex items-center justify-around px-2 pb-2 shrink-0 z-30">
                <button
                    onClick={() => setActiveTab('home')}
                    aria-label="Home"
                    className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 active:scale-95",
                        activeTab === 'home' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <Home className={cn("w-6 h-6", activeTab === 'home' && "fill-current")} />
                    <span className="text-[10px] font-bold">Home</span>
                </button>

                <button
                    onClick={() => setActiveTab('conversation')}
                    aria-label="Conversation"
                    className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 active:scale-95",
                        activeTab === 'conversation' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <MessageSquare className={cn("w-6 h-6", activeTab === 'conversation' && "fill-current")} />
                    <span className="text-[10px] font-bold">Chat</span>
                </button>

                <button
                    onClick={() => setActiveTab('faqs')}
                    aria-label="FAQs"
                    className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 active:scale-95",
                        activeTab === 'faqs' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <HelpCircle className={cn("w-6 h-6", activeTab === 'faqs' && "fill-current")} />
                    <span className="text-[10px] font-bold">FAQs</span>
                </button>
            </div>
        </div>
    );
}
