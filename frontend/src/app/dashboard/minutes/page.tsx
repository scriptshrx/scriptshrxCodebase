'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Calendar, Pencil, Trash2, X, Loader2, Check, AlertCircle, Zap } from 'lucide-react';

// Toast Component
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transform transition-all animate-in slide-in-from-right-5 fade-in duration-300 ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
            {type === 'success' ? <Check className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <span className="font-medium text-sm">{message}</span>
            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-4 h-4 opacity-50" />
            </button>
        </div>
    );
}

export default function MinutesPage() {
    const [minutes, setMinutes] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);

    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });


    // Modals & State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMinute, setNewMinute] = useState({ clientId: '', content: '' });

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMinute, setEditingMinute] = useState<any>(null);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchMinutes();
        fetchClients();
    }, []);

    const fetchMinutes = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/minutes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setMinutes(data.minutes || []);
        }
    };

    const fetchClients = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/clients', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setClients(data.clients || []);
        }
    };

    const handleAddMinute = async () => {
        if (!newMinute.clientId || !newMinute.content) return showToast('Please select a client and enter content.', 'error');
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/minutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newMinute)
            });

            if (res.ok) {
                setShowAddModal(false);
                setNewMinute({ clientId: '', content: '' });
                fetchMinutes();
                showToast('Meeting minute saved!', 'success');
            } else {
                showToast('Failed to save minute.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Network error occurred.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditMinute = async () => {
        if (!editingMinute.content) return showToast('Content cannot be empty.', 'error');
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/minutes/${editingMinute.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: editingMinute.content })
            });

            if (res.ok) {
                setShowEditModal(false);
                setEditingMinute(null);
                fetchMinutes();
                showToast('Meeting minute updated!', 'success');
            } else {
                showToast('Failed to update minute.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Network error occurred.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMinute = async (id: string) => {
        if (!confirm('Are you sure you want to delete this minute?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/minutes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchMinutes();
                showToast('Minute deleted successfully.', 'success');
            } else {
                showToast('Failed to delete minute.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Network error occurred.', 'error');
        }
    };

    const openEditModal = (minute: any) => {
        setEditingMinute({ ...minute });
        setShowEditModal(true);
    };

    return (
        <div className="space-y-6 pb-10">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Meeting Minutes</h1>
                    <p className="text-gray-500 mt-1">Record and organize your client meeting notes.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center px-5 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-shadow hover:shadow-lg active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Minute
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {minutes.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No minutes yet</h3>
                        <p className="text-gray-500">Start recording your meetings to see them here.</p>
                    </div>
                ) : (
                    minutes.map((minute) => (
                        <div key={minute.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl mr-4 group-hover:bg-purple-100 transition-colors">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{minute.client?.name || 'Unknown Client'}</h3>
                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {new Date(minute.createdAt).toLocaleDateString('en-US', {
                                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            setLoading(true);
                                            try {
                                                const res = await fetch('/api/chat/analyze', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                                                    body: JSON.stringify({ text: minute.content })
                                                });
                                                const data = await res.json();
                                                if (res.ok) {
                                                    alert(`Action Items:\n${data.actionItems.join('\n- ')}\n\nDecisions:\n${data.decisions.join('\n- ')}`);
                                                } else {
                                                    showToast('Analysis failed', 'error');
                                                }
                                            } catch (e) { showToast('Error analyzing', 'error'); }
                                            setLoading(false);
                                        }}
                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="AI Analyze"
                                    >
                                        <Zap className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openEditModal(minute)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteMinute(minute.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="pl-[4.5rem]">
                                <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                                    {minute.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">New Meeting Minute</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Client</label>
                                <div className="relative">
                                    <select
                                        className="w-full p-4 bg-gray-50 border-none rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-black/5 outline-none appearance-none"
                                        value={newMinute.clientId}
                                        onChange={e => setNewMinute({ ...newMinute, clientId: e.target.value })}
                                    >
                                        <option value="">Choose a client...</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Plus className="w-4 h-4 text-gray-400 rotate-45" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Meeting Notes</label>
                                <div className="relative">
                                    <textarea
                                        placeholder="Type your rough notes here..."
                                        className="w-full p-4 bg-gray-50 border-none rounded-xl text-gray-900 h-48 resize-none focus:ring-2 focus:ring-black/5 outline-none pb-12"
                                        value={newMinute.content}
                                        onChange={e => setNewMinute({ ...newMinute, content: e.target.value })}
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!newMinute.content) return showToast('Enter some notes first.', 'error');
                                            setLoading(true);
                                            try {
                                                const res = await fetch('/api/chat/refine', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                                                    body: JSON.stringify({ text: newMinute.content })
                                                });
                                                const data = await res.json();
                                                if (res.ok) setNewMinute(prev => ({ ...prev, content: data.refined }));
                                                else showToast('AI Refine failed.', 'error');
                                            } catch (e) { showToast('AI Error', 'error'); }
                                            setLoading(false);
                                        }}
                                        disabled={loading || !newMinute.content}
                                        className="absolute right-4 bottom-4 px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                        AI Polish
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddMinute}
                                    disabled={loading}
                                    className="px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center"
                                >
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Minute
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingMinute && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Edit Minute</h2>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Client</label>
                                <input
                                    type="text"
                                    value={editingMinute.client?.name || 'Unknown'}
                                    disabled
                                    className="w-full p-4 bg-gray-100 border-none rounded-xl text-gray-500 font-medium cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Meeting Notes</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 border-none rounded-xl text-gray-900 h-48 resize-none focus:ring-2 focus:ring-black/5 outline-none"
                                    value={editingMinute.content}
                                    onChange={e => setEditingMinute({ ...editingMinute, content: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditMinute}
                                    disabled={loading}
                                    className="px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center"
                                >
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Update Minute
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
