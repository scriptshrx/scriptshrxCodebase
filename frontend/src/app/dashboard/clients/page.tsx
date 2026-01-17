'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, Trash2, Edit2, Check, AlertCircle, X, Users, UserPlus } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';

// Toast Component (Ideally this should be shared, but inlining for speed/simplicity per current structure)
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transform transition-all animate-in slide-in-from-right-5 fade-in duration-300 ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
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
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', notes: '' });

    // Configure Invite State
    const [showConfigureInvite, setShowConfigureInvite] = useState(false);
    const [organizationName, setOrganizationName] = useState('');
    const [inviteFieldsConfig, setInviteFieldsConfig] = useState({
        name: true,
        email: true,
        phone: false,
        country: false,
        role: false
    });
    const [inviteRoleConfig, setInviteRoleConfig] = useState('MEMBER');
    const [generatedInviteLink, setGeneratedInviteLink] = useState('');
    const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [inviteLogoFile, setInviteLogoFile] = useState<File | null>(null);
    const [inviteLogoPreview, setInviteLogoPreview] = useState<string>('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [inviteLogoUrl, setInviteLogoUrl] = useState<string>('');

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

    const fetchTeamMembers = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch('https://scriptshrxcodebase.onrender.com/api/organization/team', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.team) {
                    setTeamMembers(data.team || []);
                }
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    const fetchOrganizationName = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch('https://scriptshrxcodebase.onrender.com/api/organization/info', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.organization) {
                    console.log('Org data:', data.organization);
                    setOrganizationName(data.organization.name || 'Organization');
                }
            }
        } catch (error) {
            console.error('Error fetching org info :', error);
            setOrganizationName('Organization');
        }
    };

    useEffect(() => {
        fetchClients();
        fetchTeamMembers();
        fetchOrganizationName();
        const interval = setInterval(() => {
            fetchClients();
            fetchTeamMembers();
        }, 10000);
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

    const handleLogoUploadClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                setInviteLogoFile(file);
                const reader = new FileReader();
                reader.onload = (e) => {
                    setInviteLogoPreview(e.target?.result as string);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const handleUploadLogoToCloudinary = async () => {
        if (!inviteLogoFile) {
            showToast('Please select a logo first', 'error');
            return;
        }

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('file', inviteLogoFile);
            formData.append('upload_preset', 'schools_upload');

            const response = await fetch('https://api.cloudinary.com/v1_1/dadvxxgl1/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload to Cloudinary');
            }

            const data = await response.json();
            setInviteLogoUrl(data.secure_url);
            showToast('Logo uploaded successfully!', 'success');
        } catch (error) {
            console.error('Logo upload error:', error);
            showToast('Failed to upload logo', 'error');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleGenerateCustomInvite = async () => {
        setGeneratingInvite(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('https://scriptshrxcodebase.onrender.com/api/organization/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: `invite-${Date.now()}@temp.local`,
                    role: inviteRoleConfig,
                    metadata: {
                        fieldsConfig: inviteFieldsConfig,
                        configuredRole: inviteRoleConfig,
                        logoUrl: inviteLogoUrl
                    }
                })
            });

            if (res.ok) {
                const data = await res.json();
                // The backend returns the full inviteLink, but we need to add our custom fields
                const baseLink = data.invite?.inviteLink;
                if (!baseLink) {
                    showToast('No invite link returned from server.', 'error');
                    setGeneratingInvite(false);
                    return;
                }
                // Extract the invite token from the backend link
                const urlParams = new URLSearchParams(new URL(baseLink).search);
                const inviteToken = urlParams.get('invite');
                
                // Rebuild link with custom fields configuration
                const fieldsParam = btoa(JSON.stringify(inviteFieldsConfig));
                const customLink = `https://scriptishrx.net/register?invite=${inviteToken}&fields=${fieldsParam}&role=${inviteRoleConfig}`;
                setGeneratedInviteLink(customLink);
                showToast('Invite configuration generated!', 'success');
            } else {
                const error = await res.json();
                showToast(error.error || 'Failed to generate invite.', 'error');
            }
        } catch (error) {
            console.error('Error generating invite:', error);
            showToast('Network error occurred.', 'error');
        } finally {
            setGeneratingInvite(false);
        }
    };

    const handleCopyInviteLink = () => {
        navigator.clipboard.writeText(generatedInviteLink);
        setInviteLinkCopied(true);
        showToast('Invite link copied to clipboard!', 'success');
        setTimeout(() => setInviteLinkCopied(false), 2000);
    };

    const handleOpenConfigureInvite = () => {
        setInviteFieldsConfig({ name: true, email: true, phone: false, country: false, role: false });
        setInviteRoleConfig('MEMBER');
        setGeneratedInviteLink('');
        setInviteLogoFile(null);
        setInviteLogoPreview('');
        setInviteLogoUrl('');
        setShowConfigureInvite(true);
    };

    return (
        <div className="space-y-6 pb-10">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="text-gray-500">Manage your client base</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleOpenConfigureInvite}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Configure Invite
                    </button>
                    <Link href="/invite">
                        <button
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite Team
                        </button>
                    </Link>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Client
                    </button>
                </div>
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

            {/* Team Members Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{teamMembers.length}</span>
                </div>
                {teamMembers.length === 0 ? (
                    <div className="py-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No team members</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-medium text-left text-gray-700">Name</th>
                                    <th className="px-6 py-4 font-medium text-left text-gray-700">Email</th>
                                    <th className="px-6 py-4 font-medium text-left text-gray-700">Phone</th>
                                    <th className="px-6 py-4 font-medium text-left text-gray-700">Role</th>
                                    <th className="px-6 py-4 font-medium text-left text-gray-700">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {teamMembers.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4"><div className="font-medium text-gray-900">{member.name}</div></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4" />{member.email}</div></td>
                                        <td className="px-6 py-4">{member.phoneNumber ? (<div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4" />{member.phoneNumber}</div>) : (<span className="text-gray-400">—</span>)}</td>
                                        <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${member.role === 'ADMIN' ? 'bg-red-100 text-red-700' : member.role === 'MEMBER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{member.role}</span></td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">{new Date(member.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}\n                            </tbody>
                        </table>
                    </div>
                )}\n            </div>

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

            {/* Configure Invite Modal */}
            {showConfigureInvite && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowConfigureInvite(false)}
                    />

                    {/* Toast/Modal at Bottom */}
                    <div className="relative bg-white rounded-t-3xl shadow-2xl w-full max-w-md p-8 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowConfigureInvite(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2 pr-8">Configure Invite</h2>

                         {/* Logo Upload Section */}
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-gray-700">Organization Logo</p>
                                    <p className="text-xs text-gray-600">Upload a logo to display on the invitation form</p>
                                    
                                    {/* Logo Preview */}
                                    {inviteLogoPreview && (
                                        <div className="relative p-4 bg-gray-50 rounded-xl border border-gray-200">
                                            <img 
                                                src={inviteLogoPreview} 
                                                alt="Logo Preview" 
                                                className="h-20 mx-auto object-contain rounded-lg"
                                            />
                                            <button
                                                onClick={() => {
                                                    setInviteLogoFile(null);
                                                    setInviteLogoPreview('');
                                                    setInviteLogoUrl('');
                                                }}
                                                className="absolute top-2 right-2 p-1 bg-red-100 hover:bg-red-200 rounded-full transition-colors"
                                            >
                                                <X className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Upload Button */}
                                    <button
                                        onClick={handleLogoUploadClick}
                                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors text-gray-600 font-medium"
                                    >
                                        + Select Logo
                                    </button>

                                    {/* Upload to Cloudinary Button */}
                                    {inviteLogoPreview && !inviteLogoUrl && (
                                        <button
                                            onClick={handleUploadLogoToCloudinary}
                                            disabled={uploadingLogo}
                                            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors"
                                        >
                                            {uploadingLogo ? 'Uploading Logo...' : 'Upload Logo to Cloud'}
                                        </button>
                                    )}

                                    {inviteLogoUrl && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                                            <p className="text-xs font-semibold text-green-800">✓ Logo ready</p>
                                        </div>
                                    )}
                                </div>

                                <hr className="my-6" />




                        <p className="text-gray-600 text-sm mb-6">Select which fields should appear in the invitation form</p>

                        {!generatedInviteLink ? (
                            <div className="space-y-4">
                                {/* Organization Name (Read-only) */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Organization</p>
                                    <p className="text-lg font-semibold text-gray-900">{organizationName}</p>
                                </div>

                                <hr className="my-6" />

                                {/* Field Toggles */}
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-gray-700">Required Fields</p>

                                    {/* Name Toggle */}
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={inviteFieldsConfig.name}
                                            onChange={(e) => setInviteFieldsConfig({ ...inviteFieldsConfig, name: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">Full Name</p>
                                            <p className="text-xs text-gray-500">Ask for the invitee's name</p>
                                        </div>
                                    </label>

                                    {/* Email Toggle */}
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={inviteFieldsConfig.email}
                                            onChange={(e) => setInviteFieldsConfig({ ...inviteFieldsConfig, email: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">Email</p>
                                            <p className="text-xs text-gray-500">Ask for the invitee's email</p>
                                        </div>
                                    </label>
                                </div>

                                <hr className="my-6" />

                                {/* Role Configuration Section */}
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-gray-700">Assign Role</p>
                                    <p className="text-xs text-gray-600">Select the role this invitee will have. They won't be able to change it.</p>
                                    <select
                                        value={inviteRoleConfig}
                                        onChange={(e) => setInviteRoleConfig(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                                    >
                                        <option value="MEMBER">Member</option>
                                        <option value="ADMIN">Admin</option>
                                        <option value="SUPER_ADMIN">Super Admin</option>
                                    </select>
                                </div>

                                <hr className="my-6" />

                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-gray-700">Optional Fields</p>

                                    {/* Phone Toggle */}
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={inviteFieldsConfig.phone}
                                            onChange={(e) => setInviteFieldsConfig({ ...inviteFieldsConfig, phone: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">Phone Number</p>
                                            <p className="text-xs text-gray-500">Ask for the invitee's phone</p>
                                        </div>
                                    </label>

                                    {/* Country Toggle */}
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={inviteFieldsConfig.country}
                                            onChange={(e) => setInviteFieldsConfig({ ...inviteFieldsConfig, country: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">Country</p>
                                            <p className="text-xs text-gray-500">Ask for the invitee's country</p>
                                        </div>
                                    </label>
                                </div>

                                <hr className="my-6" />

                               

                                {/* Generate Button */}
                                <button
                                    onClick={handleGenerateCustomInvite}
                                    disabled={generatingInvite}
                                    className="w-full mt-8 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors"
                                >
                                    {generatingInvite ? 'Generating...' : 'Generate Invite Link'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <p className="text-sm font-semibold text-green-800">✓ Invite Link Generated!</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Invite Link (Click to copy)
                                    </label>
                                    <div
                                        onClick={handleCopyInviteLink}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-600 break-all cursor-pointer hover:bg-gray-100 transition-colors font-mono max-h-24 overflow-y-auto"
                                    >
                                        {generatedInviteLink}
                                    </div>
                                    {inviteLinkCopied && (
                                        <p className="text-xs text-green-600 mt-2 font-semibold">✓ Copied to clipboard!</p>
                                    )}
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                                    <p className="font-semibold mb-2">Configuration Summary:</p>
                                    <div className="space-y-1">
                                        <p><strong>Fields shown:</strong></p>
                                        <ul className="space-y-1 ml-4">
                                            {inviteFieldsConfig.name && <li>✓ Full Name</li>}
                                            {inviteFieldsConfig.email && <li>✓ Email</li>}
                                            {inviteFieldsConfig.phone && <li>✓ Phone Number</li>}
                                            {inviteFieldsConfig.country && <li>✓ Country</li>}
                                        </ul>
                                        <p className="mt-2"><strong>Assigned role:</strong> {inviteRoleConfig} (read-only)</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCopyInviteLink}
                                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
                                >
                                    {inviteLinkCopied ? '✓ Copied!' : 'Copy Link'}
                                </button>

                                <button
                                    onClick={() => setShowConfigureInvite(false)}
                                    className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
}
