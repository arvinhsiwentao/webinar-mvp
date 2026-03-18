'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { trackGA4, DEFAULT_PRODUCT_PRICE } from '@/lib/analytics';

type PageStatus = 'loading' | 'fulfilled' | 'processing' | 'timeout' | 'error';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

export default function CheckoutReturnPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const sessionId = searchParams.get('session_id');
  const webinarId = params.webinarId as string;
  const purchaseTracked = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const [status, setStatus] = useState<PageStatus>('loading');
  const [customerEmail, setCustomerEmail] = useState('');
  const [activationCode, setActivationCode] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    function stopPolling() {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    async function poll() {
      try {
        const res = await fetch(
          `/api/checkout/session-status?session_id=${encodeURIComponent(sessionId!)}`
        );
        if (!res.ok) throw new Error('Failed to check status');
        const data = await res.json();

        if (data.status === 'complete') {
          // Fire GA4 events on first complete (regardless of fulfillment state)
          if (!purchaseTracked.current) {
            purchaseTracked.current = true;
            setCustomerEmail(data.customerEmail || '');
            const purchaseValue = data.amountTotal
              ? data.amountTotal / 100
              : (() => {
                  console.warn('[GA4] Purchase fallback: amountTotal missing from session-status', { sessionId, webinarId });
                  return DEFAULT_PRODUCT_PRICE;
                })();
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
            trackGA4('c_purchase_confirmation', {
              webinar_id: webinarId,
              transaction_id: sessionId || `session_${Date.now()}`,
              order_status: data.orderStatus || 'unknown',
            });
          }

          // Check if order is fulfilled with activation code
          if (data.orderStatus === 'fulfilled' && data.activationCode) {
            setActivationCode(data.activationCode);
            setCustomerEmail(data.customerEmail || '');
            setStatus('fulfilled');
            stopPolling();
            return;
          }

          // Payment complete but not yet fulfilled — keep polling
          setStatus('processing');

          // Check timeout
          if (Date.now() - pollStartRef.current >= POLL_TIMEOUT_MS) {
            setStatus('timeout');
            stopPolling();
          }
        } else {
          // Payment not complete — this is an error
          setStatus('error');
          stopPolling();
        }
      } catch {
        setStatus('error');
        stopPolling();
      }
    }

    // Start polling
    pollStartRef.current = Date.now();
    poll(); // immediate first check
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      stopPolling();
    };
  }, [sessionId, webinarId]);

  // --- Loading ---
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

  // --- Processing (payment complete, awaiting fulfillment) ---
  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">订单处理中，请稍候...</p>
        </div>
      </div>
    );
  }

  // --- Error ---
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

  // --- Timeout (payment succeeded but fulfillment didn't complete in time) ---
  if (status === 'timeout') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg w-full">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-8">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">订单正在处理中</h1>
          <p className="text-neutral-500 leading-relaxed mb-2">
            您的商品启用序号将通过邮件发送至
          </p>
          <p className="font-medium text-neutral-800 mb-6">{customerEmail}</p>
          <p className="text-neutral-400 text-sm mb-8">
            如 10 分钟内未收到，请联系客服
          </p>
          <a
            href="mailto:CMoney_overseas@cmoney.com.tw"
            className="inline-block bg-[#B8953F] text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-[#A6842F] transition-colors"
          >
            联系客服：CMoney_overseas@cmoney.com.tw
          </a>
        </div>
      </div>
    );
  }

  // --- Fulfilled (activation code available) ---
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

        {/* Activation code box */}
        <div className="border-2 border-[#B8953F] rounded-lg p-6 text-center my-6">
          <p className="text-sm text-neutral-500 mb-2">商品启用序号</p>
          <p className="text-2xl font-bold tracking-[4px] text-[#B8953F]">{activationCode}</p>
          <p className="text-xs text-[#B8953F] mt-3">※ 此序号仅限单次使用，启用后即失效，请勿分享给他人</p>
        </div>

        <p className="text-neutral-500 leading-relaxed mb-2">
          我们也已将序号发送至{' '}
          <span className="font-medium text-neutral-800">{customerEmail}</span>
        </p>
        <p className="text-neutral-400 text-sm mb-10">
          没收到？请检查垃圾邮件文件夹
        </p>

        {/* Activation steps */}
        <div className="bg-white rounded-xl border border-[#E8E5DE] p-8 text-left">
          <p className="text-sm font-semibold text-neutral-800 mb-4 tracking-wide">启用步骤</p>
          <div className="space-y-4">
            {[
              { step: '1', content: <span>前往<a href="https://www.cmoney.tw/" target="_blank" rel="noopener noreferrer" className="text-[#B8953F] underline underline-offset-2 font-medium">商品官网</a></span> },
              { step: '2', content: <span>输入上方商品启用序号</span> },
              { step: '3', content: <span>点击「启用序号」</span> },
              { step: '4', content: <span>如您尚未登入或注册理财宝帐号，请您登入或注册</span> },
              { step: '5', content: <span>登入帐号并启用序号后，即可看到「序号启用成功！」</span> },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FAFAF7] border border-[#E8E5DE] flex items-center justify-center text-sm font-semibold text-[#B8953F] mt-0.5">
                  {item.step}
                </span>
                <span className="text-sm text-neutral-600 leading-relaxed">{item.content}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Product access links */}
        <div className="bg-white rounded-xl border border-[#E8E5DE] p-8 text-left mt-4">
          <p className="text-sm font-semibold text-neutral-800 mb-4 tracking-wide">商品启用后，可前往以下页面使用权限</p>
          <p className="text-xs text-neutral-400 mb-4">请确保已登入您的帐号</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-[#B8953F] mt-0.5">•</span>
              <span className="text-sm text-neutral-600">
                Mike是麦克 美股财富导航 App 下载：
                <a href="https://cmoneymike.onelink.me/ZEaW/kkyo4oqs" target="_blank" rel="noopener noreferrer" className="text-[#B8953F] underline underline-offset-2 break-all">点此下载</a>
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#B8953F] mt-0.5">•</span>
              <span className="text-sm text-neutral-600">
                震荡行情的美股期权操作解析 线上课程观看：
                <a href="https://cmy.tw/00CKIq" target="_blank" rel="noopener noreferrer" className="text-[#B8953F] underline underline-offset-2">点此观看</a>
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#B8953F] mt-0.5">•</span>
              <span className="text-sm text-neutral-600">
                ETF 进阶资产放大术 线上课程观看：
                <a href="https://cmy.tw/00ChKt" target="_blank" rel="noopener noreferrer" className="text-[#B8953F] underline underline-offset-2">点此观看</a>
              </span>
            </div>
          </div>
        </div>

        {/* Customer support */}
        <div className="bg-[#FAFAF7] rounded-xl border border-[#E8E5DE] p-6 text-center mt-4">
          <p className="text-sm text-neutral-500 mb-2">※ 如您遇到任何问题，欢迎联系官网客服</p>
          <p className="text-sm text-neutral-600">
            Email：<a href="mailto:csservice@cmoney.com.tw" className="text-[#B8953F] underline underline-offset-2">csservice@cmoney.com.tw</a>
          </p>
          <p className="text-xs text-neutral-400 mt-1">服务时间：北京时间周一到周五 8:30 ~ 17:30</p>
        </div>
      </div>
    </div>
  );
}
