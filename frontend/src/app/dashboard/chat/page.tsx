'use client';

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import { Bot, Save, Sparkles, MessageSquare, Plus, Trash2, HelpCircle, Book, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const API_URL = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000'
    : (typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'));

interface FAQ {
    question: string;
    answer: string;
}

interface AIConfig {
    aiName: string;
    welcomeMessage: string;
    customSystemPrompt: string;
    model?: string;
    faqs?: FAQ[];
}

export default function ChatPage() {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [aiConfig, setAiConfig] = useState<AIConfig>({
        aiName: '',
        welcomeMessage: '',
        customSystemPrompt: '',
        model: 'gpt-4',
        faqs: []
    });

    const getToken = () => {
        if (typeof window !== 'undefined') return localStorage.getItem('token');
        return null;
    };

    const getHeaders = () => {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    };

    useEffect(() => {
        fetchOrgInfo();
    }, []);

    const fetchOrgInfo = async () => {
        try {
            const res = await fetch(`${API_URL}/api/organization/info`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.organization) {
                    const org = data.organization;
                    setAiConfig({
                        aiName: org.aiConfig?.aiName || org.aiName || 'ScriptishRx Assistant',
                        welcomeMessage: org.aiConfig?.welcomeMessage || org.aiWelcomeMessage || 'Hello, how can I help you today?',
                        customSystemPrompt: org.aiConfig?.systemPrompt || org.customSystemPrompt || 'You are a helpful assistant.',
                        model: org.aiConfig?.model || 'gpt-4',
                        faqs: org.aiConfig?.faqs || []
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching org info:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/organization/info`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({
                    aiName: aiConfig.aiName, // Legacy
                    aiWelcomeMessage: aiConfig.welcomeMessage, // Legacy
                    customSystemPrompt: aiConfig.customSystemPrompt, // Legacy
                    aiConfig: {
                        aiName: aiConfig.aiName,
                        welcomeMessage: aiConfig.welcomeMessage,
                        systemPrompt: aiConfig.customSystemPrompt,
                        model: aiConfig.model,
                        faqs: aiConfig.faqs
                    }
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert('Chat Agent configuration saved successfully!');
            } else {
                alert(data.error || 'Failed to save configuration');
            }
        } catch (error: any) {
            console.error('Error saving config:', error);
            alert(error.message || 'Error saving configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const addFaq = () => {
        setAiConfig(prev => ({
            ...prev,
            faqs: [...(prev.faqs || []), { question: '', answer: '' }]
        }));
    };

    const removeFaq = (index: number) => {
        setAiConfig(prev => ({
            ...prev,
            faqs: (prev.faqs || []).filter((_, i) => i !== index)
        }));
    };

    const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
        setAiConfig(prev => {
            const newFaqs = [...(prev.faqs || [])];
            newFaqs[index] = { ...newFaqs[index], [field]: value };
            return { ...prev, faqs: newFaqs };
        });
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Chat Agent Studio</h1>
                    <p className="text-gray-500 mt-2">Design your AI chatbot's personality and knowledge base.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                <div className="lg:col-span-7 space-y-8">

                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Agent Persona</h2>
                                <p className="text-gray-500 text-xs mt-0.5">Customize the identity and brain of your bot.</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">Agent Name</label>
                                    <div className="relative">
                                        <Input
                                            value={aiConfig.aiName}
                                            onChange={(e) => setAiConfig({ ...aiConfig, aiName: e.target.value })}
                                            placeholder="e.g. ScriptishRx Support"
                                            className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-800">AI Model</label>
                                    <div className="relative">
                                        <select
                                            value={aiConfig.model}
                                            onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                                            className="w-full h-10 pl-3 pr-8 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                                        >
                                            <option value="gpt-4">GPT-4 (Recommended for accuracy)</option>
                                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster speed)</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                                            <Settings className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-800">Welcome Message</label>
                                <Input
                                    value={aiConfig.welcomeMessage}
                                    onChange={(e) => setAiConfig({ ...aiConfig, welcomeMessage: e.target.value })}
                                    placeholder="e.g. Hello! How can I assist you today?"
                                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500">The first message the user sees when opening the chat.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-800">System Instructions (Prompt)</label>
                                <div className="relative">
                                    <textarea
                                        value={aiConfig.customSystemPrompt}
                                        onChange={(e) => setAiConfig({ ...aiConfig, customSystemPrompt: e.target.value })}
                                        placeholder="You are a helpful customer support agent. Your goal is to answer questions about..."
                                        className="w-full min-h-[180px] p-4 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed shadow-sm"
                                    />
                                    <div className="absolute bottom-3 right-3 text-gray-300 pointer-events-none">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                                    <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-800 leading-relaxed">
                                        <strong>Tip:</strong> Be specific about your business rules. For example: "Always be polite," "If asked about pricing, say it depends on the insurance," or "Our office hours are 9 AM to 5 PM."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-600 text-white rounded-lg shadow-sm">
                                    <Book className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Knowledge Base</h2>
                                    <p className="text-gray-500 text-xs mt-0.5">Train the AI with specific Question & Answer pairs.</p>
                                </div>
                            </div>
                            <Button size="sm" onClick={addFaq} variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-colors">
                                <Plus className="w-4 h-4 mr-1" /> Add Q&A
                            </Button>
                        </div>

                        <div className="p-6 space-y-4">
                            {!aiConfig.faqs || aiConfig.faqs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                                    <Book className="w-10 h-10 mb-3 opacity-20" />
                                    <p className="font-medium text-gray-500">No FAQs added yet</p>
                                    <p className="text-sm mt-1">Add questions to help your bot answer accurately.</p>
                                    <Button variant="ghost" onClick={addFaq} className="mt-4 text-purple-600 hover:bg-purple-50">
                                        Add your first Q&A
                                    </Button>
                                </div>
                            ) : (
                                aiConfig.faqs.map((faq, index) => (
                                    <div key={index} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative group transition-all hover:border-purple-300 hover:shadow-md">
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Question</label>
                                                <Input
                                                    placeholder="e.g. What is your cancellation policy?"
                                                    value={faq.question}
                                                    onChange={(e) => updateFaq(index, 'question', e.target.value)}
                                                    className="bg-gray-50 border-gray-200 font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Answer</label>
                                                <textarea
                                                    placeholder="e.g. You can cancel up to 24 hours in advance for a full refund."
                                                    value={faq.answer}
                                                    onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                                                    className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white min-h-[80px] transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFaq(index)}
                                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Remove Q&A"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="w-full h-12 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-gray-200 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        {isSaving ? <Loader /> : <Save className="w-5 h-5 mr-2" />}
                        {isSaving ? 'Saving Configuration...' : 'Save All Changes'}
                    </Button>
                </div>

                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-12rem)] sticky top-6 flex flex-col">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-600 text-white rounded-lg shadow-sm">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Live Preview</h2>
                                    <p className="text-gray-500 text-xs mt-0.5">interact with your bot.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Online
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden bg-gray-50 p-4 relative">
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none" />
                            <div className="h-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white relative z-10">
                                <ChatInterface 
                                    isDashboard={true} 
                                    systemPrompt={aiConfig.customSystemPrompt}
                                    aiName={aiConfig.aiName}
                                    welcomeMessage={aiConfig.welcomeMessage}
                                    model={aiConfig.model}
                                    faqs={aiConfig.faqs}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Loader() {
    return (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );
}