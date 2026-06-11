'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackGA4 } from '@/lib/analytics';
import { resolveAngle, US_STOCK_PRODUCT_ID } from '@/lib/usStockCourse';

type PageStatus = 'loading' | 'fulfilled' | 'processing' | 'timeout' | 'error';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;
const SUPPORT_EMAIL = 'cmoney_overseas@cmoney.com.tw';
const WHATSAPP_URL = 'https://wa.me/886917642752?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E5%92%A8%E8%AF%A2%E8%AF%BE%E7%A8%8B%E7%9B%B8%E5%85%B3%E9%97%AE%E9%A2%98';

function ReturnInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const angle = resolveAngle(searchParams.get('angle'));
  const purchaseTracked = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const [status, setStatus] = useState<PageStatus>('loading');
  const [customerEmail, setCustomerEmail] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [copied, setCopied] = useState(false);

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
        const res = await fetch(`/api/checkout/session-status?session_id=${encodeURIComponent(sessionId!)}`);
        if (!res.ok) throw new Error('Failed to check status');
        const data = await res.json();

        if (data.status === 'complete') {
          // Fire the dedicated $1-funnel purchase conversion once.
          // NOTE: do NOT fire the shared `purchase` event — that would pollute the
          // webinar funnel's Google Ads Smart Bidding via the shared GA4 property.
          if (!purchaseTracked.current) {
            purchaseTracked.current = true;
            setCustomerEmail(data.customerEmail || '');
            // Real $1 amount — never fall back to the $599 webinar default.
            const purchaseValue = typeof data.amountTotal === 'number' ? data.amountTotal / 100 : 1;
            const purchaseCurrency = (data.currency || 'usd').toUpperCase();
            const purchaseItems = Array.isArray(data.items) && data.items.length > 0
              ? data.items
              : [{
                  item_id: US_STOCK_PRODUCT_ID,
                  item_name: data.productName || '$1 美股入门套餐',
                  price: purchaseValue,
                  quantity: 1,
                }];
            trackGA4('c_us_stock_course_purchase', {
              transaction_id: sessionId || `session_${Date.now()}`,
              value: purchaseValue,
              currency: purchaseCurrency,
              items: purchaseItems,
              angle,
            });
          }

          if (data.orderStatus === 'fulfilled' && data.activationCode) {
            setActivationCode(data.activationCode);
            setCustomerEmail(data.customerEmail || '');
            setStatus('fulfilled');
            stopPolling();
            return;
          }

          setStatus('processing');
          if (Date.now() - pollStartRef.current >= POLL_TIMEOUT_MS) {
            setStatus('timeout');
            stopPolling();
          }
        } else {
          setStatus('error');
          stopPolling();
        }
      } catch {
        setStatus('error');
        stopPolling();
      }
    }

    pollStartRef.current = Date.now();
    poll();
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => stopPolling();
  }, [sessionId, angle]);

  if (status === 'loading' || status === 'processing') {
    return (
      <div className="min-h-screen bg-[#0a0a08] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#C9A962] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">{status === 'loading' ? '确认支付中…' : '订单处理中，请稍候…'}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a08] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-3">结帐页面已过期</h1>
          <p className="text-neutral-400 mb-6">请返回重新结帐</p>
          <button
            onClick={() => window.history.back()}
            className="bg-[#B8953F] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#A6842F] transition-colors"
          >
            重新结帐
          </button>
        </div>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="min-h-screen bg-[#0a0a08] flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg w-full">
          <div className="w-16 h-16 rounded-full bg-[#C9A962]/15 border border-[#C9A962]/30 flex items-center justify-center mx-auto mb-8">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9A962" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">订单正在处理中</h1>
          <p className="text-neutral-400 leading-relaxed mb-2">你的商品启用序号将通过邮件发送至</p>
          <p className="font-medium text-[#E8D5A3] mb-6">{customerEmail}</p>
          <p className="text-neutral-500 text-sm mb-8">如 10 分钟内未收到，请联系客服</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-block bg-[#B8953F] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#A6842F] transition-colors">
            联系客服：{SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    );
  }

  // --- Fulfilled ---
  return (
    <div className="min-h-screen bg-[#0a0a08] text-neutral-200 flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-lg w-full">
        <div className="w-16 h-16 rounded-full bg-[#B8953F] flex items-center justify-center mx-auto mb-8">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">购买成功，迈出了最重要的一步！</h1>

        {/* Activation code */}
        <div className="my-6">
          <div className="border-2 border-[#C9A962] rounded-xl p-6 text-center bg-[#C9A962]/[0.06]">
            <p className="text-sm text-neutral-400 mb-2">商品启用序号</p>
            <p className="text-2xl font-bold tracking-[4px] text-[#E8D5A3]">{activationCode}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(activationCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors bg-[#B8953F] text-white hover:bg-[#A6842F]"
            >
              {copied ? '✓ 已复制' : '一键复制'}
            </button>
          </div>
          <p className="text-xs text-[#C9A962] text-center mt-2">※ 每个序号仅限单次使用，启用后即失效，请勿分享给他人</p>
        </div>

        <p className="text-neutral-400 leading-relaxed mb-1">
          我们也已将序号发送至 <span className="font-medium text-[#E8D5A3]">{customerEmail}</span>
        </p>
        <p className="text-neutral-500 text-sm mb-10">没收到？请检查垃圾邮件文件夹</p>

        {/* Redemption steps — go log in & redeem on cmoney.tw */}
        <div className="bg-white/[0.04] rounded-xl border border-[#C9A962]/20 p-6 md:p-8 text-left">
          <p className="text-sm font-semibold text-white mb-4 tracking-wide">启用步骤</p>
          <div className="space-y-4">
            {[
              { step: '1', content: <span>前往 <a href="https://www.cmoney.tw/" target="_blank" rel="noopener noreferrer" className="text-[#E8D5A3] underline underline-offset-2 font-medium">CMoney 官网</a></span> },
              { step: '2', content: <span>输入上方商品启用序号</span> },
              { step: '3', content: <span>点击「启用序号」</span> },
              { step: '4', content: <span>如你尚未登入或注册理财宝帐号，请登入或注册（你已完成付款，仅需登入即可领取）</span> },
              { step: '5', content: <span>登入帐号并启用序号后，即可看到「序号启用成功！」</span> },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a0a08] border border-[#C9A962]/40 flex items-center justify-center text-sm font-semibold text-[#C9A962] mt-0.5">{item.step}</span>
                <span className="text-sm text-neutral-400 leading-relaxed">{item.content}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Product access */}
        <div className="bg-white/[0.04] rounded-xl border border-[#C9A962]/20 p-6 md:p-8 text-left mt-4">
          <p className="text-sm font-semibold text-white mb-1 tracking-wide">启用后，可前往以下页面使用</p>
          <p className="text-xs text-neutral-500 mb-4">请确保已登入你的帐号</p>
          <div className="space-y-3 text-sm text-neutral-400">
            <div className="flex items-start gap-3">
              <span className="text-[#C9A962] mt-0.5">•</span>
              <span>9 章美股投资线上课程：登入 CMoney 后于「我的课程」观看</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#C9A962] mt-0.5">•</span>
              <span>
                Mike是麦克 App（3 天 VIP）：
                <a href="https://cmoneymike.onelink.me/ZEaW/kkyo4oqs" target="_blank" rel="noopener noreferrer" className="text-[#E8D5A3] underline underline-offset-2 break-all">点此下载</a>
                ，登入后 VIP 自动启用
              </span>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="bg-white/[0.03] rounded-xl border border-white/10 p-6 text-center mt-4">
          <p className="text-sm text-neutral-400 mb-3">※ 如遇任何问题，欢迎联系客服</p>
          <div className="flex flex-col items-center gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-medium transition-colors">
              WhatsApp 咨询客服
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#E8D5A3] underline underline-offset-2 text-sm">{SUPPORT_EMAIL}</a>
          </div>
          <p className="text-xs text-neutral-500 mt-3">服务时间：北京时间周一到周五 8:30 ~ 17:30</p>
        </div>
      </div>
    </div>
  );
}

export default function UsStockCourseReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a08] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#C9A962] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ReturnInner />
    </Suspense>
  );
}
