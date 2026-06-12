'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { trackGA4 } from '@/lib/analytics';
import { getStoredUtmParams } from '@/lib/utils';
import { getProduct } from '@/lib/products';
import PromoCountdown from '@/components/us-stock-course/PromoCountdown';
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

  const ga4Items = useMemo(
    () => [{
      item_id: US_STOCK_PRODUCT_ID,
      item_name: product?.name || '$1 美股入门课',
      price: product?.price ?? 1,
      quantity: 1,
    }],
    [product]
  );

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
          try { const m = document.cookie.match(/_ga=GA\d+\.\d+\.([^;]+)/); return m?.[1] || ''; } catch { return ''; }
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
      <Shell angle={angle}>
        <div className="bg-white border border-[#E8E5DE] rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#B8953F] flex items-center justify-center mx-auto mb-5">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-3">你已购买过此课程</h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            商品启用序号已发送至 <span className="text-[#B8953F] font-medium">{email}</span>，请检查你的邮箱（含垃圾邮件 / 促销邮件）。
          </p>
        </div>
      </Shell>
    );
  }

  /* --- Email gate --- */
  if (!emailSubmitted) {
    return (
      <Shell angle={angle}>
        <OrderSummary />
        <div className="bg-white border border-[#E8E5DE] rounded-2xl p-6 md:p-7 shadow-sm mt-4">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3">输入邮箱</h2>
            <p className="text-base md:text-lg text-neutral-600 leading-relaxed mb-5">
              我们会将<span className="text-[#B8953F] font-semibold">购买确认信</span>与<span className="text-[#B8953F] font-semibold">商品启用序号</span>寄送到此邮箱，请务必确保填写正确。<span className="text-[#B8953F] font-semibold">保证不会寄送任何促销讯息。</span>
            </p>
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
                className="w-full px-4 py-3.5 text-base rounded-lg bg-white border border-[#E8E5DE] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#B8953F] focus:ring-1 focus:ring-[#B8953F] mb-3"
              />
              {emailError && <p className="text-red-500 text-sm mb-3">{emailError}</p>}
              <button
                type="submit"
                className="w-full bg-[#B8953F] hover:bg-[#A6842F] text-white font-bold py-3.5 text-base rounded-lg transition-colors"
              >
                前往付款 →
              </button>
            </form>
        </div>
        <PaymentBadges />
      </Shell>
    );
  }

  /* --- Stripe Embedded Checkout --- */
  return (
    <Shell angle={angle}>
      <OrderSummary />
      <div className="bg-white border border-[#E8E5DE] rounded-2xl overflow-hidden shadow-sm mt-4 p-2">
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
      <PaymentBadges />
    </Shell>
  );
}

function Stepper() {
  const steps = [
    { label: '课程页', state: 'done' as const },
    { label: '付款', state: 'current' as const },
    { label: '购买完成', state: 'future' as const },
  ];
  return (
    <div className="flex-1 flex items-center justify-center">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                s.state === 'current'
                  ? 'bg-[#B8953F] text-white shadow-[0_0_0_3px_rgba(184,149,63,0.15)]'
                  : s.state === 'done'
                    ? 'bg-[#B8953F]/15 text-[#B8953F] border border-[#B8953F]/40'
                    : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
              }`}
            >
              {s.state === 'done' ? '✓' : i + 1}
            </span>
            <span
              className={`text-xs md:text-sm whitespace-nowrap ${
                s.state === 'current' ? 'font-bold text-[#B8953F]' : s.state === 'done' ? 'text-neutral-600' : 'text-neutral-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span className={`mx-2 md:mx-3 h-px w-4 md:w-8 ${i < 1 ? 'bg-[#B8953F]/40' : 'bg-neutral-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Shell({ children, angle }: { children: React.ReactNode; angle: string }) {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-900">
      <header className="border-b border-[#E8E5DE] bg-white">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/us-stock-course/${angle}`} aria-label="返回课程页" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-[#B8953F] transition-colors flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            <span className="hidden sm:inline">返回</span>
          </Link>
          <Stepper />
          <span className="w-9 flex-shrink-0" aria-hidden />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}

function OrderSummary() {
  return (
    <div className="bg-white border border-[#E8E5DE] rounded-2xl p-4 md:p-5 shadow-sm">
      {/* Countdown (top) */}
      <div className="flex justify-center mb-3">
        <PromoCountdown />
      </div>
      {/* Cover */}
      <div className="rounded-xl overflow-hidden border border-[#E8E5DE]">
        <Image src="/images/us-stock/cover.webp" alt="$1 美股入门课｜9 章课程 + 赠送 3 天 App VIP" width={1600} height={900} className="w-full h-auto" priority />
      </div>
      {/* What's included */}
      <div className="space-y-3 mt-5">
        <div className="flex items-start gap-2.5 text-base md:text-lg text-neutral-700">
          <span className="text-[#B8953F] font-bold mt-0.5">✓</span>
          <span>9 章节线上课程 · 永久观看权限</span>
        </div>
        <div className="flex items-start gap-2.5 text-base md:text-lg text-neutral-700">
          <span className="text-[#B8953F] font-bold mt-0.5">✓</span>
          <span>🎁 赠送 3 天 App VIP 权限</span>
        </div>
      </div>
      {/* Price */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E8E5DE]">
        <span className="text-base text-neutral-400">原价 <span className="line-through">US$49</span></span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-[#ef4444]">限时特价</span>
          <span className="text-3xl font-extrabold text-[#ef4444]">US$1</span>
        </span>
      </div>
    </div>
  );
}

function PaymentBadges() {
  return (
    <div className="mt-10 text-center">
      <p className="text-sm text-neutral-500 mb-4">🔒 全程安全加密结帐，由 Stripe 处理</p>
      <Image src="/images/us-stock/pay-stripe.webp" alt="Stripe" width={128} height={64} className="h-12 md:h-16 w-auto mx-auto" />
      <p className="text-sm text-neutral-400 mt-6 mb-4">支援以下付款方式</p>
      <div className="flex flex-row flex-wrap items-center justify-center gap-x-4 gap-y-3 md:gap-10">
        <Image src="/images/us-stock/pay-applepay.webp" alt="Apple Pay" width={100} height={64} className="h-11 md:h-14 w-auto" />
        <Image src="/images/us-stock/pay-googlepay.webp" alt="Google Pay" width={120} height={64} className="h-11 md:h-14 w-auto" />
        <Image src="/images/us-stock/pay-link.webp" alt="Link" width={191} height={64} className="h-9 md:h-12 w-auto" />
      </div>
    </div>
  );
}

export default function UsStockCourseCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAF7]" />}>
      <CheckoutInner />
    </Suspense>
  );
}
