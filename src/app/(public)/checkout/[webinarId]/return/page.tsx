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
  const [activationCodes, setActivationCodes] = useState<{ productId: string; productName: string; code: string }[]>([]);
  const [copied, setCopied] = useState<string | false>(false);

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
            // Prefer real per-product items from API; fall back to single-item summary if API is pre-update
            const purchaseItems = Array.isArray(data.items) && data.items.length > 0
              ? data.items
              : [{
                  item_id: `webinar_${webinarId}`,
                  item_name: data.productName || 'Webinar Course',
                  price: purchaseValue,
                  quantity: 1,
                }];
            trackGA4('purchase', {
              transaction_id: sessionId || `session_${Date.now()}`,
              value: purchaseValue,
              currency: purchaseCurrency,
              items: purchaseItems,
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
            if (data.activationCodes) setActivationCodes(data.activationCodes);
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

        {/* Activation code box(es) */}
        <div className="my-6 space-y-4">
          {activationCodes.length > 1 ? (
            // Multi-product: show each code with product name
            activationCodes.map((item, idx) => (
              <div key={`${item.productId}-${idx}`} className="border-2 border-[#B8953F] rounded-lg p-5 text-center">
                <p className="text-xs text-neutral-400 mb-1">{item.productName}</p>
                <p className="text-xl font-bold tracking-[4px] text-[#B8953F] mb-2">{item.code}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(item.code);
                    setCopied(item.code);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors bg-[#B8953F] text-white hover:bg-[#A6842F]"
                >
                  {copied === item.code ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      已复制
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      复制
                    </>
                  )}
                </button>
              </div>
            ))
          ) : (
            // Single product or legacy
            <div className="border-2 border-[#B8953F] rounded-lg p-6 text-center">
              {activationCodes.length === 1 && activationCodes[0].productName && (
                <p className="text-xs text-neutral-400 mb-1">{activationCodes[0].productName}</p>
              )}
              <p className="text-sm text-neutral-500 mb-2">商品启用序号</p>
              <p className="text-2xl font-bold tracking-[4px] text-[#B8953F]">{activationCode}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activationCode);
                  setCopied('single');
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors bg-[#B8953F] text-white hover:bg-[#A6842F]"
              >
                {copied === 'single' ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    已复制
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    一键复制
                  </>
                )}
              </button>
            </div>
          )}
          <p className="text-xs text-[#B8953F] text-center">※ 每个序号仅限单次使用，启用后即失效，请勿分享给他人</p>
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

        {/* Product access links — dynamic based on purchase */}
        <div className="bg-white rounded-xl border border-[#E8E5DE] p-8 text-left mt-4">
          <p className="text-sm font-semibold text-neutral-800 mb-4 tracking-wide">商品启用后，可前往以下页面使用权限</p>
          <p className="text-xs text-neutral-400 mb-4">请确保已登入您的帐号</p>
          <div className="space-y-3">
            {(() => {
              const pids = activationCodes.map(c => c.productId);
              const hasApp = pids.some(id => ['app-monthly', 'bundle', 'options', 'etf-options'].includes(id));
              const hasOptions = pids.some(id => ['options', 'etf-options', 'bundle'].includes(id));
              const hasEtf = pids.some(id => ['etf-options', 'bundle'].includes(id));
              const links = [];
              if (hasApp) links.push({ name: 'Mike是麦克 美股财富导航 App 下载', url: 'https://cmoneymike.onelink.me/ZEaW/kkyo4oqs' });
              if (hasOptions) links.push({ name: '震荡行情的美股期权操作解析 线上课程观看', url: 'https://cmy.tw/00CKIq' });
              if (hasEtf) links.push({ name: 'ETF 进阶资产放大术 线上课程观看', url: 'https://cmy.tw/00ChKt' });
              // Fallback: if no codes matched (legacy), show all
              if (links.length === 0) {
                links.push({ name: 'Mike是麦克 美股财富导航 App 下载', url: 'https://cmoneymike.onelink.me/ZEaW/kkyo4oqs' });
                links.push({ name: '震荡行情的美股期权操作解析 线上课程观看', url: 'https://cmy.tw/00CKIq' });
                links.push({ name: 'ETF 进阶资产放大术 线上课程观看', url: 'https://cmy.tw/00ChKt' });
              }
              return links.map((link) => (
                <div key={link.url} className="flex items-start gap-3">
                  <span className="text-[#B8953F] mt-0.5">•</span>
                  <span className="text-sm text-neutral-600">
                    {link.name}：
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[#B8953F] underline underline-offset-2 break-all">
                      {link.url.includes('onelink') ? '点此下载' : '点此观看'}
                    </a>
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Customer support */}
        <div className="bg-[#FAFAF7] rounded-xl border border-[#E8E5DE] p-6 text-center mt-4">
          <p className="text-sm text-neutral-500 mb-3">※ 如您遇到任何问题，欢迎联系客服</p>
          <div className="flex flex-col items-center gap-3 mb-3">
            <a
              href="https://wa.me/886917642752?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E5%92%A8%E8%AF%A2%E8%AF%BE%E7%A8%8B%E7%9B%B8%E5%85%B3%E9%97%AE%E9%A2%98"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp 咨询客服
            </a>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-[#E8E5DE] bg-white text-neutral-700 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <a href="mailto:cmoney_overseas@cmoney.com.tw" className="text-[#B8953F] underline underline-offset-2">cmoney_overseas@cmoney.com.tw</a>
            </div>
          </div>
          <p className="text-xs text-neutral-400">服务时间：北京时间周一到周五 8:30 ~ 17:30</p>
        </div>
      </div>
    </div>
  );
}
