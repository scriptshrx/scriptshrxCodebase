'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, Clock, Trash2, Edit2, Check, AlertCircle, X, Search, Video, ExternalLink } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import CallConversations from '@/components/CallConversations';

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

export default function BookingsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newBooking, setNewBooking] = useState({ clientId: '', date: '', time: '', purpose: '', meetingLink: '' });

    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });


    const [showEditModal, setShowEditModal] = useState(false);
    const [editBooking, setEditBooking] = useState<any>(null);
    const [editForm, setEditForm] = useState({ date: '', time: '', purpose: '', status: '', meetingLink: '' });

    const fetchBookings = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('❌ No token found in localStorage');
                return;
            }
            const res = await fetch('https://scriptshrxcodebase.onrender.com/api/bookings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log(`[Frontend] Bookings API Response: ${res.status} ${res.statusText}`);
            
            if (res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const data = await res.json();
                    console.log(`[Frontend] ✅ Received ${data.bookings?.length || 0} bookings`);
                    setBookings(data.bookings || []);
                } else {
                    console.error('❌ Received non-JSON response from API');
                }
            } else {
                const errorText = await res.text();
                console.error(`❌ Bookings API failed with ${res.status}:`, errorText);
            }
        } catch (error) {
            console.error('❌ Error fetching bookings:', error);
        }
    };

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch('https://scriptshrxcodebase.onrender.com/api/clients', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const data = await res.json();
                    setClients(data.clients || []);
                }
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    useEffect(() => {
        fetchBookings();
        fetchClients();
        const interval = setInterval(fetchBookings, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleAddBooking = async () => {
        if (!newBooking.clientId || !newBooking.date || !newBooking.time) {
            return showToast('Please fill in all required fields.', 'error');
        }

        try {
            const token = localStorage.getItem('token');
            const dateTime = new Date(`${newBooking.date}T${newBooking.time}`);

            const res = await fetch('https://scriptshrxcodebase.onrender.com/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    clientId: newBooking.clientId,
                    date: dateTime.toISOString(),
                    purpose: newBooking.purpose,
                    meetingLink: newBooking.meetingLink || undefined
                })
            });

            if (res.ok) {
                setShowAddModal(false);
                setNewBooking({ clientId: '', date: '', time: '', purpose: '', meetingLink: '' });
                fetchBookings();
                showToast('Booking created successfully!', 'success');
            } else {
                const errorData = await res.json();
                showToast(errorData.error || 'Failed to create booking.', 'error');
            }
        } catch (error) {
            console.error('Error adding booking:', error);
            showToast('Network error occurred.', 'error');
        }
    };

    const handleDeleteBooking = async (id: string) => {
        if (!confirm('Are you sure you want to delete this booking?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/bookings/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchBookings();
                showToast('Booking deleted successfully.', 'success');
            } else {
                showToast('Failed to delete booking.', 'error');
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            showToast('Network error occurred.', 'error');
        }
    };

    const handleEditClick = (booking: any) => {
        const dateObj = new Date(booking.date);
        setEditBooking(booking);
        setEditForm({
            date: dateObj.toISOString().split('T')[0],
            time: dateObj.toTimeString().slice(0, 5),
            purpose: booking.purpose || '',
            status: booking.status,
            meetingLink: booking.meetingLink || ''
        });
        setShowEditModal(true);
    };

    const handleUpdateBooking = async () => {
        if (!editBooking) return;
        try {
            const token = localStorage.getItem('token');
            const dateTime = new Date(`${editForm.date}T${editForm.time}`);

            const res = await fetch(`https://scriptshrxcodebase.onrender.com/api/bookings/${editBooking.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: dateTime.toISOString(),
                    purpose: editForm.purpose,
                    status: editForm.status,
                    meetingLink: editForm.meetingLink || undefined
                })
            });

            if (res.ok) {
                setShowEditModal(false);
                setEditBooking(null);
                fetchBookings();
                showToast('Booking updated successfully!', 'success');
            } else {
                const errorData = await res.json();
                showToast(errorData.error || 'Failed to update booking.', 'error');
            }
        } catch (error) {
            console.error('Error updating booking:', error);
            showToast('Network error occurred.', 'error');
        }
    };

    return (
        <div className="space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
                    <p className="text-gray-500">Manage appointments</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Booking
                </button>
            </div>

            {bookings.length === 0 ? (
                <EmptyState
                    title="No bookings yet"
                    description="Get started by scheduling your first appointment with a client."
                    icon={CalendarIcon}
                    actionLabel="New Booking"
                    onAction={() => setShowAddModal(true)}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookings.map((booking) => (
                        <div key={booking.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <CalendarIcon className="w-5 h-5" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEditClick(booking)}
                                        className="p-1 hover:bg-gray-100 text-gray-400 hover:text-blue-600 rounded"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBooking(booking.id)}
                                        className="p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status === 'Scheduled' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {booking.status}
                                    </span>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg mb-1">{booking.client?.name || 'Unknown Client'}</h3>
                            <p className="text-gray-500 text-sm mb-4">{booking.purpose}</p>

                            <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-50 mb-4">
                                <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-2" />
                                    {new Date(booking.date).toLocaleString()}
                                </div>
                                {booking.meetingLink && (
                                    <a
                                        href={booking.meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                    >
                                        <Video className="w-3.5 h-3.5" />
                                        Join
                                    </a>
                                )}
                            </div>

                            <div className="border-t border-gray-50 pt-4">
                                <CallConversations 
                                    callSessions={booking.client?.callSessions || []} 
                                    clientName={booking.client?.name || 'Unknown Client'}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-3xl w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">New Booking</h2>
                        <div className="space-y-4">
                            <select
                                className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                value={newBooking.clientId}
                                onChange={e => setNewBooking({ ...newBooking, clientId: e.target.value })}
                            >
                                <option value="">Select Client</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="date"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={newBooking.date}
                                    onChange={e => setNewBooking({ ...newBooking, date: e.target.value })}
                                />
                                <input
                                    type="time"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={newBooking.time}
                                    onChange={e => setNewBooking({ ...newBooking, time: e.target.value })}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Purpose (e.g., Consultation)"
                                className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                value={newBooking.purpose}
                                onChange={e => setNewBooking({ ...newBooking, purpose: e.target.value })}
                            />
                            <input
                                type="url"
                                placeholder="Meeting Link (optional - auto-generates with Google Calendar)"
                                className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                value={newBooking.meetingLink}
                                onChange={e => setNewBooking({ ...newBooking, meetingLink: e.target.value })}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddBooking}
                                    className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800"
                                >
                                    Save Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && editBooking && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-3xl w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Edit Booking</h2>
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-100 rounded-xl text-gray-500">
                                Client: <span className="font-bold text-gray-900">{editBooking.client?.name}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="date"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={editForm.date}
                                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                />
                                <input
                                    type="time"
                                    className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                    value={editForm.time}
                                    onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Purpose"
                                className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                value={editForm.purpose}
                                onChange={e => setEditForm({ ...editForm, purpose: e.target.value })}
                            />
                            <select
                                className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                value={editForm.status}
                                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                            >
                                <option value="Scheduled">Scheduled</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                            <input
                                type="url"
                                placeholder="Meeting Link (e.g., Google Meet, Zoom)"
                                className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                                value={editForm.meetingLink}
                                onChange={e => setEditForm({ ...editForm, meetingLink: e.target.value })}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateBooking}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
