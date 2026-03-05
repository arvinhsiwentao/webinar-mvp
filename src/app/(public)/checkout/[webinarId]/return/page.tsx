'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { trackGA4 } from '@/lib/analytics';

export default function CheckoutReturnPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const sessionId = searchParams.get('session_id');
  const webinarId = params.webinarId as string;
  const purchaseTracked = useRef(false);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    async function checkStatus() {
      try {
        const res = await fetch(
          `/api/checkout/session-status?session_id=${encodeURIComponent(sessionId!)}`
        );
        if (!res.ok) throw new Error('Failed to check status');
        const data = await res.json();

        if (data.status === 'complete') {
          setStatus('success');
          setCustomerEmail(data.customerEmail || '');
          if (!purchaseTracked.current) {
            purchaseTracked.current = true;
            trackGA4('purchase', {
              transaction_id: sessionId || `session_${Date.now()}`,
              value: 997.00,
              currency: 'USD',
              items: [{
                item_id: `webinar_${webinarId}`,
                item_name: 'Webinar Course',
                price: 997.00,
                quantity: 1,
              }],
            });
          }
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    }

    checkStatus();
  }, [sessionId, webinarId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">确认支付中...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">结账页面已过期</h1>
          <p className="text-neutral-500 mb-6">请返回重新结账</p>
          <button
            onClick={() => window.history.back()}
            className="bg-[#B8953F] text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-[#A6842F] transition-colors"
          >
            重新结账
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Success animation */}
        <div className="w-20 h-20 rounded-full bg-[rgba(184,149,63,0.08)] flex items-center justify-center mx-auto mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3">
          恭喜你，迈出了最重要的一步！
        </h1>
        <p className="text-neutral-500 text-lg mb-2">
          你的课程激活码和详细设置步骤正在飞往你的邮箱
        </p>
        <p className="text-neutral-400 text-sm mb-8">
          请查收 <span className="font-medium text-neutral-600">{customerEmail}</span> 的收件箱（也检查垃圾邮件文件夹）
        </p>

        <div className="bg-white rounded-lg border border-[#E8E5DE] p-6 text-left text-sm text-neutral-500 space-y-2">
          <p className="font-medium text-neutral-700">接下来：</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>查收邮件中的激活码</li>
            <li>前往 CMoney 平台兑换</li>
            <li>开始学习课程</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
