'use client';

import { useState, useEffect } from 'react';
import { Webinar, Registration } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function exportCSV(registrations: Registration[], webinarTitle: string) {
  const headers = ['姓名', 'Email', '电话', '场次', '报名时间'];
  const rows = registrations.map(r => [
    r.name, r.email, r.phone || '', r.sessionId, r.registeredAt
  ]);
  const csv = [headers, ...rows].map(row => row.map(escapeCSVField).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${webinarTitle}-registrations.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface RegistrationListProps {
  webinars: Webinar[];
}

export default function RegistrationList({ webinars }: RegistrationListProps) {
  const [registrationMap, setRegistrationMap] = useState<Record<string, Registration[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRegistrations() {
      setLoading(true);
      const map: Record<string, Registration[]> = {};
      await Promise.all(
        webinars.map(async (w) => {
          try {
            const res = await fetch(`/api/admin/webinar/${w.id}`);
            const data = await res.json();
            map[w.id] = data.registrations || [];
          } catch {
            map[w.id] = [];
          }
        })
      );
      setRegistrationMap(map);
      setLoading(false);
    }
    if (webinars.length > 0) {
      fetchRegistrations();
    } else {
      setLoading(false);
    }
  }, [webinars]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8953F]" />
      </div>
    );
  }

  const totalRegistrations = Object.values(registrationMap).reduce((sum, regs) => sum + regs.length, 0);

  if (totalRegistrations === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-400 mb-4">暂无报名数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {webinars.map((webinar) => {
        const regs = registrationMap[webinar.id] || [];
        if (regs.length === 0) return null;
        return (
          <div key={webinar.id} className="bg-white rounded-lg p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {webinar.title}
                <span className="ml-2 text-sm text-neutral-500">({regs.length} 条报名)</span>
              </h3>
              <button
                onClick={() => exportCSV(regs, webinar.title)}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded transition-colors"
              >
                导出 CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500">
                    <th className="text-left py-2 pr-4">姓名</th>
                    <th className="text-left py-2 pr-4">Email</th>
                    <th className="text-left py-2 pr-4">电话</th>
                    <th className="text-left py-2 pr-4">场次</th>
                    <th className="text-left py-2">报名时间</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-200/80 text-neutral-600">
                      <td className="py-2 pr-4">{r.name}</td>
                      <td className="py-2 pr-4">{r.email}</td>
                      <td className="py-2 pr-4">{r.phone || '-'}</td>
                      <td className="py-2 pr-4">{r.sessionId}</td>
                      <td className="py-2">{formatDateTime(r.registeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
