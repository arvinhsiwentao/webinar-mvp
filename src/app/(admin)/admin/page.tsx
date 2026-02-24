'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Webinar } from '@/lib/types';
import WebinarList from './_components/WebinarList';
import RegistrationList from './_components/RegistrationList';
import WebinarForm from './_components/WebinarForm';

type TabType = 'list' | 'create' | 'edit' | 'registrations';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [editingWebinar, setEditingWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch webinars
  useEffect(() => {
    fetchWebinars();
  }, []);

  async function fetchWebinars() {
    try {
      const res = await fetch('/api/admin/webinar');
      const data = await res.json();
      setWebinars(data.webinars || []);
    } catch (err) {
      console.error('Failed to fetch webinars:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (webinar: Webinar) => {
    setEditingWebinar(webinar);
    setActiveTab('edit');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此研讨会吗？')) return;

    try {
      await fetch(`/api/admin/webinar/${id}`, { method: 'DELETE' });
      setWebinars(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleSaved = () => {
    fetchWebinars();
    setActiveTab('list');
    setEditingWebinar(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">研讨会管理后台</h1>
          <Link href="/" className="text-neutral-500 hover:text-neutral-900 text-sm">
            ← 返回首页
          </Link>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white/80 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-4">
            <button
              onClick={() => { setActiveTab('list'); setEditingWebinar(null); }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              场次管理
            </button>
            <button
              onClick={() => { setActiveTab('create'); setEditingWebinar(null); }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              创建研讨会
            </button>
            <button
              onClick={() => { setActiveTab('registrations'); setEditingWebinar(null); }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'registrations'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              报名名单
            </button>
            {activeTab === 'edit' && (
              <span className="py-3 px-4 text-sm font-medium border-b-2 border-blue-500 text-blue-400">
                编辑研讨会
              </span>
            )}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'list' && (
          <WebinarList
            webinars={webinars}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        {activeTab === 'create' && (
          <WebinarForm onSaved={handleSaved} />
        )}
        {activeTab === 'registrations' && (
          <RegistrationList webinars={webinars} />
        )}
        {activeTab === 'edit' && editingWebinar && (
          <WebinarForm webinar={editingWebinar} onSaved={handleSaved} />
        )}
      </main>
    </div>
  );
}
