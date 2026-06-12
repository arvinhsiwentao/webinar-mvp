'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { trackGA4 } from '@/lib/analytics';
import { getStoredUtmParams } from '@/lib/utils';
import { getProduct } from '@/lib/products';
import {
  resolveAngle,
  US_STOCK_PRODUCT_ID,
  US_STOCK_CONTAINER_WEBINAR_ID,
  US_STOCK_FUNNEL,
} from '@/lib/usStockCourse';

// us-stock funnel uses its own (sandbox) publishable key when set; else the live key.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_US_STOCK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    ''
);

function CheckoutInner() {
  const searchParams = useSearchParams();
  const angle = resolveAngle(searchParams.get('angle'));
  const product = useMemo(() => getProduct(US_STOCK_PRODUCT_ID), []);

  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);

  const beginTracked = useRef(false);
  const paymentInfoTracked = useRef(false);

  // GA4 item for this fixed SKU
  const ga4Items = useMemo(
    () => [{
      item_id: US_STOCK_PRODUCT_ID,
      item_name: product?.name || '$1 美股入门套餐',
      price: product?.price ?? 1,
      quantity: 1,
    }],
    [product]
  );

  // Fire "进入购买页" once on mount (dedicated conversion — never the shared begin_checkout)
  useEffect(() => {
    if (beginTracked.current) return;
    beginTracked.current = true;
    trackGA4('c_us_stock_course_begin_checkout', {
      angle,
      currency: 'USD',
      value: product?.price ?? 1,
      items: ga4Items,
    });
  }, [angle, product, ga4Items]);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webinarId: US_STOCK_CONTAINER_WEBINAR_ID,
        email,
        name: '',
        source: `us_stock_course_${angle}`,
        funnel: US_STOCK_FUNNEL,
        angle,
        productIds: [US_STOCK_PRODUCT_ID],
        gaClientId: (() => {
          try { const m = document.cookie.match(/_ga=GA\d+\.\d+\.(.+)/); return m?.[1] || ''; } catch { return ''; }
        })(),
        utm: getStoredUtmParams(),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.error === 'already_purchased') {
        setAlreadyPurchased(true);
        throw new Error(data.message || '你已购买过此课程');
      }
      throw new Error(data.error || 'Failed to create session');
    }

    // Stripe payment form is about to render → "启动结帐" conversion
    if (!paymentInfoTracked.current) {
      paymentInfoTracked.current = true;
      trackGA4('c_us_stock_course_add_payment_info', { angle });
    }

    const data = await res.json();
    return data.clientSecret;
  }, [email, angle]);

  /* --- Already purchased --- */
  if (alreadyPurchased) {
    return (
      <Shell>
        <div className="bg-white/[0.04] border border-[#C9A962]/20 rounded-xl p-8 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-[#B8953F] flex items-center justify-center mx-auto mb-5">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-3">你已购买过此课程</h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            商品启用序号已发送至 <span className="text-[#E8D5A3]">{email}</span>，请检查你的邮箱（含垃圾邮件文件夹）。
          </p>
        </div>
      </Shell>
    );
  }

  /* --- Email gate --- */
  if (!emailSubmitted) {
    return (
      <Shell>
        <div className="max-w-md mx-auto">
          {product && <OrderSummary name={product.name} price={product.price} originalPrice={product.originalPrice} includes={product.includes} />}
          <div className="bg-white/[0.04] border border-[#C9A962]/20 rounded-xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-white mb-1.5">输入邮箱以继续</h2>
            <p className="text-sm text-neutral-400 mb-5">序号将寄到这个邮箱，也会在付款后立即显示</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = email.trim();
                if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                  setEmailError('请输入有效的邮箱地址');
                  return;
                }
                setEmailError('');
                setEmail(trimmed);
                setEmailSubmitted(true);
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoFocus
                className="w-full px-4 py-3 rounded-lg bg-[#0a0a08] border border-[#C9A962]/25 text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-[#C9A962] focus:ring-1 focus:ring-[#C9A962] mb-3"
              />
              {emailError && <p className="text-red-400 text-sm mb-3">{emailError}</p>}
              <button
                type="submit"
                className="w-full bg-[#B8953F] hover:bg-[#A6842F] text-white font-bold py-3 rounded-lg transition-colors"
              >
                前往付款 →
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-neutral-500">🔒 Stripe 安全加密结帐 · 支援信用卡 / Apple Pay</p>
          </div>
        </div>
      </Shell>
    );
  }

  /* --- Stripe Embedded Checkout --- */
  return (
    <Shell>
      <div className="max-w-md mx-auto">
        {product && <OrderSummary name={product.name} price={product.price} originalPrice={product.originalPrice} includes={product.includes} />}
        <div className="bg-white rounded-xl overflow-hidden">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a08] text-neutral-200">
      <header className="border-b border-[#C9A962]/15 bg-[#0a0a08]/95">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2 text-sm text-neutral-400">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          安全结帐
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 md:py-14">{children}</main>
    </div>
  );
}

function OrderSummary({
  name, price, originalPrice, includes,
}: {
  name: string; price: number; originalPrice?: number; includes: string[];
}) {
  return (
    <div className="bg-white/[0.04] border border-[#C9A962]/20 rounded-xl p-5 mb-4">
      <p className="text-sm font-semibold text-white mb-1">{name}</p>
      <ul className="text-xs text-neutral-400 space-y-1 my-3">
        {includes.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-[#C9A962] mt-0.5">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline gap-2 pt-2 border-t border-white/10">
        <span className="text-2xl font-bold text-[#C9A962]">${price}</span>
        <span className="text-sm text-neutral-500">USD</span>
        {originalPrice && <span className="text-sm text-neutral-600 line-through ml-1">${originalPrice}</span>}
      </div>
    </div>
  );
}

export default function UsStockCourseCheckoutPage() {
  return (
    <Suspense fallback={<Shell><div className="text-center text-neutral-500">载入中…</div></Shell>}>
      <CheckoutInner />
    </Suspense>
  );
}
