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
            const purchaseValue = data.amountTotal ? data.amountTotal / 100 : 997;
            const purchaseCurrency = (data.currency || 'usd').toUpperCase();
            trackGA4('purchase', {
              transaction_id: sessionId || `session_${Date.now()}`,
              value: purchaseValue,
              currency: purchaseCurrency,
              items: [{
                item_id: `webinar_${webinarId}`,
                item_name: data.productName || 'Webinar Course',
                price: purchaseValue,
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
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-lg w-full">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-[#B8953F] flex items-center justify-center mx-auto mb-8">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
          恭喜你，迈出了最重要的一步！
        </h1>
        <p className="text-neutral-500 leading-relaxed mb-6">
          你的商品启用序号和详细设置步骤已发送至
          <br />
          <span className="font-medium text-neutral-800">{customerEmail}</span>
        </p>
        <p className="text-neutral-400 text-sm mb-10">
          没收到？请检查垃圾邮件文件夹
        </p>

        {/* Next steps */}
        <div className="bg-white rounded-xl border border-[#E8E5DE] p-8 text-left">
          <p className="text-sm font-semibold text-neutral-800 mb-4 tracking-wide">接下来</p>
          <div className="space-y-4">
            {[
              { step: '1', text: '查收邮件中的商品启用序号' },
              { step: '2', text: '前往 CMoney 平台兑换' },
              { step: '3', text: '开始学习课程' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FAFAF7] border border-[#E8E5DE] flex items-center justify-center text-sm font-semibold text-[#B8953F]">
                  {item.step}
                </span>
                <span className="text-sm text-neutral-600">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
