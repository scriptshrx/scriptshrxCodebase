'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, Trash2, Edit2, Check, AlertCircle, X, Users } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

// Toast Component (Ideally this should be shared, but inlining for speed/simplicity per current structure)
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

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', notes: '' });

    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

    // Edit State
    const [editClient, setEditClient] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch('/api/clients', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const data = await res.json();
                    setClients(data.clients || []);
                } else {
                    console.error('Received non-JSON response from API');
                }
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
        const interval = setInterval(fetchClients, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const handleCall = async (client: any) => {
        if (!confirm(`Call ${client.name}?`)) return;
        try {
            const token = localStorage.getItem('token');
            showToast('Initiating call...', 'success');
            const res = await fetch('/api/voice/outbound', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ to: client.phone, context: { name: client.name, id: client.id } })
            });

            if (res.ok) {
                showToast('Call initiated successfully!', 'success');
            } else {
                showToast('Failed to initiate call.', 'error');
            }
        } catch (error) {
            console.error('Call error:', error);
            showToast('Network error on call.', 'error');
        }
    };

    const handleAddClient = async () => {
        if (!newClient.name || !newClient.email) {
            return showToast('Name and Email are required.', 'error');
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newClient)
            });

            if (res.ok) {
                setShowAddModal(false);
                setNewClient({ name: '', email: '', phone: '', notes: '' });
                fetchClients();
                showToast('Client added successfully!', 'success');
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to add client.', 'error');
            }
        } catch (error) {
            console.error('Error adding client:', error);
            showToast('Network error occurred.', 'error');
        }
    };

    // ... (existing code for handleDeleteClient) ...

    const handleDeleteClient = async (id: string) => {
        if (!confirm('Are you sure you want to delete this client?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/clients/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchClients();
                showToast('Client deleted successfully.', 'success');
            } else {
                showToast('Failed to delete client.', 'error');
            }
        } catch (error) {
            console.error('Error deleting client:', error);
            showToast('Network error occurred.', 'error');
        }
    };

    const handleUpdateClient = async () => {
        if (!editClient || !editClient.name || !editClient.email) {
            return showToast('Name and Email are required.', 'error');
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/clients/${editClient.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editClient)
            });

            if (res.ok) {
                setShowEditModal(false);
                setEditClient(null);
                fetchClients();
                showToast('Client updated successfully!', 'success');
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to update client.', 'error');
            }
        } catch (error) {
            console.error('Error updating client:', error);
            showToast('Network error occurred.', 'error');
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="text-gray-500">Manage your client base</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                </button>
            </div>

            {/* Client List */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="flex-1 flex items-center bg-gray-50 px-4 py-2 rounded-xl">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            className="ml-3 bg-transparent outline-none w-full text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Name</th>
                                <th className="px-6 py-4 font-medium">Contact</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Last Visit</th>
                                <th className="px-6 py-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {clients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{client.name}</div>
                                        <div className="text-xs text-gray-500">{client.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-gray-500 gap-2">
                                            <Phone className="w-3 h-3" />
                                            {client.phone}
                                            <button
                                                onClick={() => handleCall(client)}
                                                className="p-1 hover:bg-green-50 text-green-600 rounded-full transition-colors"
                                                title="Call Client"
                                            >
                                                <Phone className="w-3 h-3 fill-current" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(client.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => { setEditClient(client); setShowEditModal(true); }}
                                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClient(client.id)}
                                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr >
                            ))
                            }
                        </tbody >
                    </table >
                </div >
            </div >

            {/* Add Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-3xl w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4">Add New Client</h2>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Name"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={newClient.name}
                                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={newClient.email}
                                    onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                                />
                                <input
                                    type="tel"
                                    placeholder="Phone"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={newClient.phone}
                                    onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                                />
                                <textarea
                                    placeholder="Notes"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={newClient.notes}
                                    onChange={e => setNewClient({ ...newClient, notes: e.target.value })}
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddClient}
                                        className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800"
                                    >
                                        Save Client
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Edit Modal */}
            {
                showEditModal && editClient && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-3xl w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4">Edit Client</h2>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={editClient.name}
                                    onChange={e => setEditClient({ ...editClient, name: e.target.value })}
                                />
                                <input
                                    type="email"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={editClient.email}
                                    onChange={e => setEditClient({ ...editClient, email: e.target.value })}
                                />
                                <input
                                    type="tel"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={editClient.phone}
                                    onChange={e => setEditClient({ ...editClient, phone: e.target.value })}
                                />
                                <textarea
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={editClient.notes || ''}
                                    onChange={e => setEditClient({ ...editClient, notes: e.target.value })}
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateClient}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
