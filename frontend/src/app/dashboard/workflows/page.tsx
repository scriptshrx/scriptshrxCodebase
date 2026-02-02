'use client';
import { useState, useEffect } from 'react';
import { Zap, Activity, Trash2, Plus, Clock, MessageSquare, ArrowRight, Layout, X, Save, CheckCircle } from 'lucide-react';

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newWorkflow, setNewWorkflow] = useState({
        name: '',
        trigger: 'booking:created',
        actionType: 'send_email',
        actionConfig: {
            to: '{{client.email}}',
            subject: 'Booking Confirmation',
            body: 'Your booking has been confirmed.'
        }
    });
    const [creating, setCreating] = useState(false);

    // Feedback State
    const [successModal, setSuccessModal] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

    // Use provided NEXT_PUBLIC_API_BASE if available, otherwise use Render URL
    const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || 'https://scriptshrxcodebase.onrender.com';

    useEffect(() => {
        // Fetch workflows
        const fetchWorkflows = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/workflows`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await res.json();
                if (res.ok) {
                    setWorkflows(data.workflows || []);
                }
            } catch (error) {
                console.error("Failed to fetch workflows", error);
            } finally {
                setLoading(false);
            }
        };
        fetchWorkflows();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/workflows/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                setWorkflows(prev => {
                    const updated = prev.filter(w => w.id !== id);
                    return updated;
                });
                setSuccessModal({ show: true, message: 'Workflow successfully deleted' });
            }
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        const action = {
            type: newWorkflow.actionType,
            ...newWorkflow.actionConfig
        };

        try {
            const res = await fetch(`${API_BASE}/api/workflows`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    name: newWorkflow.name,
                    trigger: newWorkflow.trigger,
                    actions: [action]
                })
            });

            const data = await res.json();
            if (res.ok) {
                setWorkflows(prev => [data.workflow, ...prev]);
                setShowCreate(false);
                setSuccessModal({ show: true, message: 'Workflow successfully created' });
                setNewWorkflow({
                    name: '',
                    trigger: 'booking:created',
                    actionType: 'send_email',
                    actionConfig: {
                        to: '{{client.email}}',
                        subject: 'Booking Confirmation',
                        body: 'Your booking has been confirmed.'
                    }
                });
            } else {
                alert(data.error || 'Failed to create workflow');
            }
        } catch (error) {
            console.error('Failed to create workflow', error);
            alert('An error occurred while creating the workflow');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Workflows</h1>
                    <p className="text-gray-500 mt-1">Automate tasks and communications.</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    New Workflow
                </button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-gray-400">Loading workflows...</div>
            ) : workflows.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                        <Activity className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No workflows active</h3>
                    <p className="text-gray-500 mb-6">Create your first automation to save time.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workflows.map(wf => (
                        <div key={wf.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group relative">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDelete(wf.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-gray-900">{wf.name}</h3>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                <span className="font-medium capitalize">{wf.trigger.replace(/_/g, ' ')}</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <span className="font-medium capitalize">{(JSON.parse(wf.actions || '[]')[0]?.type || 'action').replace(/_/g, ' ')}</span>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400 font-medium">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Auto-runs</span>
                                <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Workflow Side Panel */}
            {showCreate && (
                <div className="fixed inset-0 z-[110] overflow-hidden">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                    <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto transform transition-transform animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Create Workflow</h2>
                            <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Workflow Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g., Booking Confirmation"
                                    value={newWorkflow.name}
                                    onChange={e => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Trigger Event</label>
                                <select
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                                    value={newWorkflow.trigger}
                                    onChange={e => setNewWorkflow({ ...newWorkflow, trigger: e.target.value })}
                                >
                                    <option value="booking:created">Booking Created</option>
                                    <option value="booking:cancelled">Booking Cancelled</option>
                                    <option value="payment:received">Payment Received</option>
                                    <option value="client:registered">New Client Registered</option>
                                </select>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                                <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Action Configuration</h3>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
                                    <select
                                        className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                        value={newWorkflow.actionType}
                                        onChange={e => setNewWorkflow({ ...newWorkflow, actionType: e.target.value })}
                                    >
                                        <option value="send_email">Send Email</option>
                                        <option value="send_sms">Send SMS</option>
                                        <option value="notification">Push Notification</option>
                                    </select>
                                </div>

                                {newWorkflow.actionType === 'send_email' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Recipient</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                                value={newWorkflow.actionConfig.to}
                                                onChange={e => setNewWorkflow({ ...newWorkflow, actionConfig: { ...newWorkflow.actionConfig, to: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                                                value={newWorkflow.actionConfig.subject}
                                                onChange={e => setNewWorkflow({ ...newWorkflow, actionConfig: { ...newWorkflow.actionConfig, subject: e.target.value } })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
                                            <textarea
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm h-24"
                                                value={newWorkflow.actionConfig.body}
                                                onChange={e => setNewWorkflow({ ...newWorkflow, actionConfig: { ...newWorkflow.actionConfig, body: e.target.value } })}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2"
                                >
                                    {creating ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Create Workflow
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {successModal.show && (
                <div className="fixed inset-0 z-[120] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSuccessModal({ ...successModal, show: false })}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full animate-in zoom-in-95 duration-200">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <CheckCircle className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Success
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                {successModal.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setSuccessModal({ ...successModal, show: false })}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
