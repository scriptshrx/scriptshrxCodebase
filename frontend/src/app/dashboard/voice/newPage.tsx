"use client";

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Stethoscope,
  Bot,
  Phone,
  LayoutList,
  Users,
  CreditCard,
  Key,
  Globe,
  ChevronDown,
  MoreVertical,
  Search as SearchIcon,
  Plus,
  PhoneIncoming
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// types

type AgentType = 'Single Prompt' | 'Multi Prompt' | 'Custom LLM';

type Agent = {
  id: string;
  name: string;
  agentType: AgentType;
  voiceName: string;
  phoneNumber?: string | null;
  provider: string;
  providerAgentId?: string | null;
  status: string;
  prompt?: string | null;
  promptsJson?: any;
  llmConfigJson?: any;
  lastEditedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

// api helper
const API_BASE = 'https://scriptishrxcodebase.onrender.com/api';

async function apiFetch(path: string, opts: any = {}) {
  const headers: any = {
    'Content-Type': 'application/json',
    ...opts.headers
  };

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
    headers
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export default function VoicePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const[user,setUser]=useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'All' | AgentType>('All');
  const [sortOrder, setSortOrder] = useState<'Newest' | 'Oldest'>('Newest');

  // tenant details
  const [tenant, setTenant] = useState<{ name: string; email?: string } | null>(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'assignPhone' | null>(null);
  const [modalAgent, setModalAgent] = useState<Partial<Agent> | null>(null);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/voice-agents');
      setAgents(data.agents || []);
    } catch (err: any) {
      console.error('fetchAgents error', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    
    const userString = localStorage.getItem('user');
    if(userString){setUser(JSON.parse(userString));
      setTenant(JSON.parse(userString));
    console.log('User is',userString);}
    fetchAgents();

    // fetch tenant details via settings endpoint (user object includes tenant)
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/settings`, { withCredentials: true });
        if (res.data && res.data.user && res.data.user.tenant) {
         console.log('user info', res.data);
          console.log('tenant info', res.data.user.tenant);
          setTenant(res.data.user.tenant);
        }
    }
    catch (err) {
      console.error('fetch tenant error', err);}
  })();
  }, [user]);

  const filteredAgents = useMemo(() => {
    let arr = [...agents];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.voiceName.toLowerCase().includes(q) ||
        (a.phoneNumber || '').toLowerCase().includes(q)
      );
    }
    if (selectedType !== 'All') {
      arr = arr.filter(a => a.agentType === selectedType);
    }
    arr.sort((a, b) => {
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      return sortOrder === 'Newest' ? tb - ta : ta - tb;
    });
    return arr;
  }, [agents, searchQuery, selectedType, sortOrder]);

  // actions
  const openCreate = () => {
    setModalMode('create');
    setModalAgent({ agentType: 'Single Prompt', provider: 'retell' });
    setModalOpen(true);
  };

  const openEdit = (agent: Agent) => {
    setModalMode('edit');
    setModalAgent(agent);
    setModalOpen(true);
  };

  const openAssignPhone = (agent: Agent) => {
    setModalMode('assignPhone');
    setModalAgent(agent);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalAgent(null);
    setModalMode(null);
  };

  const handleSave = async () => {
    if (!modalAgent) return;
    try {
      if (modalMode === 'create') {
        await apiFetch('/api/voice-agents', {
          method: 'POST',
          body: JSON.stringify(modalAgent)
        });
      } else if (modalMode === 'edit' && modalAgent.id) {
        await apiFetch(`/api/voice-agents/${modalAgent.id}`, {
          method: 'PATCH',
          body: JSON.stringify(modalAgent)
        });
      } else if (modalMode === 'assignPhone' && modalAgent.id) {
        await apiFetch(`/api/voice-agents/${modalAgent.id}/assign-phone`, {
          method: 'POST',
          body: JSON.stringify({ phoneNumber: modalAgent.phoneNumber })
        });
      }
      await fetchAgents();
      closeModal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Delete agent '${agent.name}'?`)) return;
    try {
      await apiFetch(`/api/voice-agents/${agent.id}`, { method: 'DELETE' });
      await fetchAgents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDuplicate = async (agent: Agent) => {
    const copy = { ...agent, name: `${agent.name} (copy)` };
    delete copy.id;
    try {
      await apiFetch('/api/voice-agents', { method: 'POST', body: JSON.stringify(copy) });
      await fetchAgents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // render
  return (
    user?.email!=='ezehmark@gmail.com'?
    <div className='h-full w-full items-center justify-center bg-gray-300 flex'>
      <div className='flex items-center justify-center flex-col gap-4'>
        <div className='h-10 w-10 rounded-full border border-2 border-t-transparent animate-spin'></div>
          <div className='text-gray-900 font-bold text-xl'>Development Ongoing, Please Wait</div>
        </div>
      

    </div>
    :
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      {/* sidebar (same as before) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between">
        <div>
          <div className="p-6 flex items-center gap-2 text-xl font-bold">
            <Stethoscope className="w-6 h-6 text-blue-600" />
            <span>ScriptishRx</span>
          </div>
          <div className="px-6 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
              {tenant ? tenant.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <span className="truncate">{tenant ? `${tenant.name}'s${'\n'}Workspace` : "Tenant's Workspace"}</span>
          </div>
          <nav className="px-4 space-y-1">
            {[
              { name: 'Voice Agents', icon: LayoutList, active: true },
              { name: 'Phone Numbers', icon: Phone },
              { name: 'Call Logs', icon: PhoneIncoming },
              { name: 'Patients', icon: Users },
              { name: 'Billing', icon: CreditCard },
              { name: 'API Keys', icon: Key },
              { name: 'Webhooks', icon: Globe }
            ].map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer ${
                    item.active ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm truncate">{item.name}</span>
                </div>
              );
            })}
          </nav>
        </div>
        <div className="p-6 space-y-4 border-t border-gray-200">
          <div className="bg-gray-100 p-3 rounded-lg text-xs">
            <div className="font-semibold">Pay As You Go</div>
            <div className="text-gray-600">Upcoming Invoice: $25.68</div>
          </div>
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
              {tenant ? tenant.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <span className="text-sm truncate">{tenant?.email || '—'}</span>
          </div>
        </div>
      </aside>

      {/* main */}
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Voice Agents</h1>
            <p className="text-sm text-gray-500">Manage ScriptishRx voice agents</p>
          </div>
          <div className="relative">
            <Button onClick={openCreate} className="bg-gray-900 text-white">
              <Plus className="w-4 h-4 mr-2" />Create Voice Agent <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* controls */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Input
              placeholder="Search agents"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          </div>
          <div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as any)}
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-700 text-sm"
            >
              <option>All</option>
              <option>Single Prompt</option>
              <option>Multi Prompt</option>
              <option>Custom LLM</option>
            </select>
          </div>
          <div>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
              className="h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-700 text-sm"
            >
              <option>Newest</option>
              <option>Oldest</option>
            </select>
          </div>
        </div>

        {/* list */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Agent Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Agent Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Voice</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Edited</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && filteredAgents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No agents found.
                  </td>
                </tr>
              )}
              {filteredAgents.map(agent => (
                <tr
                  key={agent.id}
                  className="hover:bg-gray-50 cursor-pointer relative"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-gray-500" />
                      <span className="truncate max-w-[200px]">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                      {agent.agentType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                        {agent.voiceName[0]}
                      </div>
                      <span className="truncate max-w-[120px]">{agent.voiceName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {agent.phoneNumber ? (
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-mono">
                        {agent.phoneNumber}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(agent.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setRowMenuOpenId(rowMenuOpenId === agent.id ? null : agent.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {rowMenuOpenId === agent.id && (
                      <div className="absolute right-4 top-10 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => openEdit(agent)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(agent)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => openAssignPhone(agent)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                        >
                          Assign Phone
                        </button>
                        <button
                          onClick={() => handleDelete(agent)}
                          className="w-full text-left px-4 py-2 hover:bg-red-100 text-sm text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* modals */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'create' && 'Create Voice Agent'}
              {modalMode === 'edit' && 'Edit Voice Agent'}
              {modalMode === 'assignPhone' && 'Assign Phone'}
            </h2>
            {modalMode === 'assignPhone' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-800">Phone Number</label>
                  <Input
                    value={modalAgent?.phoneNumber || ''}
                    onChange={e => setModalAgent({ ...modalAgent, phoneNumber: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button onClick={handleSave}>Save</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-800">Agent Name</label>
                  <Input
                    value={modalAgent?.name || ''}
                    onChange={e => setModalAgent({ ...modalAgent, name: e.target.value })}
                    placeholder="Front Desk Bot"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-800">Agent Type</label>
                    <select
                      value={modalAgent?.agentType}
                      onChange={e => setModalAgent({ ...modalAgent, agentType: e.target.value as AgentType })}
                      className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                    >
                      <option>Single Prompt</option>
                      <option>Multi Prompt</option>
                      <option>Custom LLM</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-800">Voice Name</label>
                    <Input
                      value={modalAgent?.voiceName || ''}
                      onChange={e => setModalAgent({ ...modalAgent, voiceName: e.target.value })}
                      placeholder="Ethan, Anna, etc."
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-800">Provider</label>
                  <select
                    value={modalAgent?.provider || 'retell'}
                    onChange={e => setModalAgent({ ...modalAgent, provider: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                  >
                    <option value="retell">Retell</option>
                    <option value="twilio">Twilio</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                {modalAgent?.agentType === 'Single Prompt' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-800">Prompt</label>
                    <textarea
                      value={modalAgent?.prompt || ''}
                      onChange={e => setModalAgent({ ...modalAgent, prompt: e.target.value })}
                      className="w-full min-h-[100px] p-3 border border-gray-300 rounded-xl text-gray-900"
                    />
                  </div>
                )}
                {/* additional config fields could be added for multi/custom */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button onClick={handleSave}>Save</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

