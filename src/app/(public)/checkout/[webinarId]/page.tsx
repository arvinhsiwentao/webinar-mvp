'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import FloatingFAQChat from '@/components/chat/FloatingFAQChat';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

/* ------------------------------------------------------------------ */
/*  Checkout Page                                                      */
/* ------------------------------------------------------------------ */

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const webinarId = params.webinarId as string;

  const urlEmail = searchParams.get('email') || '';
  const source = searchParams.get('source') || 'direct';
  const name = searchParams.get('name') || '';
  const countdownParam = searchParams.get('t'); // remaining seconds from CTA

  const [email, setEmail] = useState(urlEmail);
  const [emailSubmitted, setEmailSubmitted] = useState(!!urlEmail);
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [sessionKey, setSessionKey] = useState(0);

  // Countdown timer (from live page CTA)
  const [countdown, setCountdown] = useState(() =>
    countdownParam ? parseInt(countdownParam, 10) : 0
  );

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webinarId, email, name, source }),
    });

    if (!res.ok) {
      const data = await res.json();
      if (data.error === 'already_purchased') {
        setAlreadyPurchased(true);
        throw new Error(data.message);
      }
      throw new Error(data.error || 'Failed to create session');
    }

    const data = await res.json();
    return data.clientSecret;
  }, [webinarId, email, name, source]);

  // Scroll to checkout section
  const checkoutRef = useRef<HTMLDivElement>(null);
  const scrollToCheckout = () => {
    checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* --- Already purchased --- */
  if (alreadyPurchased) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">&#10004;</div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">你已购买过此课程</h1>
          <p className="text-neutral-500">
            商品启用序号已发送至 {email}，请检查你的邮箱（包括垃圾邮件文件夹）。
          </p>
        </div>
        <FloatingFAQChat webinarId={webinarId} pageSource="checkout" />
      </div>
    );
  }

  /* --- Email collection fallback --- */
  if (!emailSubmitted) {
    return (
      <div className="min-h-screen bg-[#FAFAF7]">
        <header className="border-b border-[#E8E5DE] bg-white">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <LockIcon />
              安全结账
            </div>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-16">
          <div className="bg-white rounded-lg border border-[#E8E5DE] p-8 text-center">
            <h2 className="text-xl font-bold text-neutral-900 mb-2">请输入邮箱以继续</h2>
            <p className="text-sm text-neutral-500 mb-6">我们需要你的邮箱来处理订单和发送课程信息</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const trimmed = email.trim();
              if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                setEmailError('请输入有效的邮箱地址');
                return;
              }
              setEmailError('');
              setEmail(trimmed);
              setEmailSubmitted(true);
            }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-[#E8E5DE] rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#B8953F] focus:ring-1 focus:ring-[#B8953F] mb-3"
                autoFocus
              />
              {emailError && <p className="text-red-500 text-sm mb-3">{emailError}</p>}
              <button
                type="submit"
                className="w-full bg-[#B8953F] hover:bg-[#A6842F] text-white font-medium py-3 rounded-lg transition-colors"
              >
                继续结账
              </button>
            </form>
          </div>
        </main>
        <FloatingFAQChat webinarId={webinarId} pageSource="checkout" />
      </div>
    );
  }

  /* --- Main checkout page --- */
  const countdownDisplay = countdown > 0
    ? `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}`
    : null;

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#E8E5DE] bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <LockIcon />
            安全结账
          </div>
          {countdownDisplay && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">限时优惠剩余</span>
              <span className="font-mono font-bold text-[#B8953F] bg-[rgba(184,149,63,0.08)] px-2 py-0.5 rounded">
                {countdownDisplay}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12">

          {/* ============ Left column — Content ============ */}
          <div className="space-y-8">

            {/* 1. Headline */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">
                你离财务自由，只差一个决定
              </h1>
              <p className="text-neutral-500">
                加入 3,000+ 学员，跟着 Mike 用美股抄底存股双策略打造被动收入
              </p>
            </div>

            {/* 2. Course package — detailed */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-6 lg:p-8">
              <h2 className="text-lg font-bold text-neutral-900 mb-6">课程套餐内容</h2>
              <div className="space-y-6">
                <PackageItem
                  number="1"
                  title="震荡行情的美股期权操作解析"
                  value="USD $312"
                  description="学会用 Sell Put、Covered Call 等期权策略，在震荡市场中稳定收保费。不再害怕大跌，反而利用波动创造收入。"
                />
                <PackageItem
                  number="2"
                  title="ETF 进阶资产放大术"
                  value="USD $384"
                  description="从 ETF 选择、结构性主题配置到攻守转换，建立一套完整的资产配置框架。适合想从「定期定额」升级到「主动配置」的投资人。"
                />
                <PackageItem
                  number="3"
                  title="「MIKE是麦克」APP 一年完整权限"
                  value="年费 USD $1,000"
                  description="包含 VIP 聊天室（直接向 Mike 提问）、每日语音直播（盘势分析）、即时选股逻辑分享、所有课程无限回放。通勤路上就能掌握市场动态。"
                />
                <PackageItem
                  number="4"
                  title="3,000+ 人美股操作社群"
                  value="独家福利"
                  description="与志同道合的投资人交流心得、分享操作。Mike 每天在社群发布实战配置思路，课堂理论搭配即时实战。"
                />
                <PackageItem
                  number="5"
                  title="Mike 亲自录制选股逻辑教学"
                  value="独家内容"
                  description="不是泛泛而谈的理论，而是 Mike 本人实际使用的选股框架和进出场判断逻辑，带你理解每一笔操作背后的思考。"
                />
              </div>
            </div>

            {/* 3. Speaker intro */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-6 lg:p-8">
              <h2 className="text-lg font-bold text-neutral-900 mb-5">关于 Mike</h2>
              <div className="flex gap-5 items-start">
                <img
                  src="/images/mike-avatar.jpg"
                  alt="Mike是麦克"
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#E8E5DE] shrink-0"
                />
                <div className="text-sm text-neutral-600 leading-relaxed space-y-2">
                  <p className="font-medium text-neutral-900">Mike｜美股投资人 / YouTube 创作者</p>
                  <p>
                    从负债 50 万到 43 岁实现财务自由。专注美股 ETF 资产配置与期权策略，
                    透过系统化教学帮助超过 3,000 位学员建立被动收入。
                  </p>
                  <p>
                    每天在 APP 社群分享即时盘势分析和操作逻辑，
                    不只教框架，更带你跟上市场节奏。
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Testimonials */}
            <div>
              <h2 className="text-lg font-bold text-neutral-900 mb-5">学员真实反馈</h2>
              <div className="space-y-4">
                <Testimonial
                  text="跟着 Mike 学了三个月，现在每个月被动收入已经超过生活费了。课程内容非常实用！"
                  name="Wei Z."
                />
                <Testimonial
                  text="以前只会定期定额买 VOO，跌了就慌、涨了又不敢加。上完 ETF 课才知道原来可以用结构性主题去选不同类型的 ETF 做攻守配置；再上期权课学会 Sell Put，现在大跌反而是我收保费＋低接的机会。"
                  name="陈先生"
                />
                <Testimonial
                  text="我是上班族，没时间整天研究，平常就靠 App 语音直播通勤时听 Mike 的盘势分析，有什么变动社团也会即时更新，还挺方便。"
                  name="林先生"
                />
                <Testimonial
                  text="App VIP 聊天室能直接问 Mike 问题，有一次我问 Sell Put 的履约价怎么选，Mike 隔天语音直播还专门讲了这个。"
                  name="Yiming L."
                />
                <Testimonial
                  text="老实说以前对 Mike 的印象还停留在看准 Tesla 的眼光，上了课才懂...原来背后靠的是一套扎实的 ETF 的策略，帮助心态更稳。自己现在遇到市场震荡，也能相对冷静了。"
                  name="赵先生"
                />
              </div>
            </div>

            {/* 5. Price + urgency */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-6 lg:p-8">
              <div className="flex flex-wrap items-baseline gap-3 mb-3">
                <span className="text-neutral-400 line-through text-lg">USD $1,696</span>
                <span className="text-3xl font-bold text-neutral-900">USD $599</span>
                <span className="inline-block bg-[rgba(184,149,63,0.08)] text-[#B8953F] text-sm font-medium px-3 py-1 rounded-md">
                  立省 $1,097 (65% OFF)
                </span>
              </div>
              {countdownDisplay && (
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <span className="text-neutral-500">限时优惠倒数：</span>
                  <span className="font-mono font-bold text-[#B8953F]">{countdownDisplay}</span>
                </div>
              )}
              <button
                onClick={scrollToCheckout}
                className="w-full sm:w-auto px-8 py-3 bg-[#B8953F] hover:bg-[#A6842F] text-white font-medium rounded-lg transition-colors"
              >
                立即购买
              </button>
            </div>

            {/* 6. How it works — post-purchase flow */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-6 lg:p-8">
              <h2 className="text-lg font-bold text-neutral-900 mb-5">购买后怎么开始？</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <StepCard step="1" title="完成付款" desc="支持信用卡、Apple Pay、Google Pay" />
                <StepCard step="2" title="查收邮件" desc="付款后立即收到启用序号" />
                <StepCard step="3" title="下载 APP" desc="App Store / Google Play 搜索「MIKE是麦克」" />
                <StepCard step="4" title="开始学习" desc="输入序号，解锁全部课程和社群" />
              </div>
            </div>

            {/* 7. Guarantee */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-6 lg:p-8">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-full bg-[rgba(184,149,63,0.08)] flex items-center justify-center shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-1">30 天无理由退款保证</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    如果你觉得课程不适合你，30 天内联系客服即可全额退款，不需要任何理由。
                    我们对课程质量有绝对信心，你可以零风险体验。
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">
                    退款联系：<a href="mailto:cmoney_overseas@cmoney.com.tw" className="text-[#B8953F] underline underline-offset-2">cmoney_overseas@cmoney.com.tw</a>
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* ============ Right column — Stripe Checkout ============ */}
          {/* Desktop: sticky in right column. Mobile: flows after left column content. */}
          <div ref={checkoutRef}>
            <div className="lg:sticky lg:top-20 space-y-4">
              <CheckoutSection
                email={email}
                error={error}
                changingEmail={changingEmail}
                newEmail={newEmail}
                emailError={emailError}
                sessionKey={sessionKey}
                onChangeEmailClick={() => { setChangingEmail(true); setNewEmail(email); }}
                onNewEmailChange={setNewEmail}
                onNewEmailSubmit={(trimmed) => {
                  setEmailError('');
                  setEmail(trimmed);
                  setSessionKey(k => k + 1);
                  setChangingEmail(false);
                }}
                onNewEmailCancel={() => { setChangingEmail(false); setEmailError(''); }}
                onEmailError={setEmailError}
                onRetry={() => { setError(''); window.location.reload(); }}
                fetchClientSecret={fetchClientSecret}
              />
            </div>
          </div>
        </div>
      </main>

      <FloatingFAQChat webinarId={webinarId} pageSource="checkout" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Stripe checkout section — reused in mobile (inline) and desktop (sticky) */
function CheckoutSection({
  email,
  error,
  changingEmail,
  newEmail,
  emailError,
  sessionKey,
  onChangeEmailClick,
  onNewEmailChange,
  onNewEmailSubmit,
  onNewEmailCancel,
  onEmailError,
  onRetry,
  fetchClientSecret,
}: {
  email: string;
  error: string;
  changingEmail: boolean;
  newEmail: string;
  emailError: string;
  sessionKey: number;
  onChangeEmailClick: () => void;
  onNewEmailChange: (v: string) => void;
  onNewEmailSubmit: (trimmed: string) => void;
  onNewEmailCancel: () => void;
  onEmailError: (v: string) => void;
  onRetry: () => void;
  fetchClientSecret: () => Promise<string>;
}) {
  return (
    <div className="space-y-4">
      {/* Email display + change */}
      {!error && !changingEmail && (
        <div className="bg-white rounded-lg border border-[#E8E5DE] px-5 py-4 flex items-center justify-between">
          <div className="text-sm text-neutral-600">
            结账邮箱：<span className="font-medium text-neutral-900">{email}</span>
          </div>
          <button
            onClick={onChangeEmailClick}
            className="text-sm text-[#B8953F] hover:text-[#A6842F] font-medium transition-colors"
          >
            更换邮箱
          </button>
        </div>
      )}
      {changingEmail && (
        <div className="bg-white rounded-lg border border-[#E8E5DE] p-4">
          <p className="text-sm text-neutral-500 mb-3">输入新的结账邮箱：</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const trimmed = newEmail.trim();
            if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
              onEmailError('请输入有效的邮箱地址');
              return;
            }
            onNewEmailSubmit(trimmed);
          }} className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => onNewEmailChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-[#E8E5DE] rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#B8953F] focus:ring-1 focus:ring-[#B8953F]"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#B8953F] hover:bg-[#A6842F] text-white text-sm font-medium rounded-lg transition-colors"
            >
              确认
            </button>
            <button
              type="button"
              onClick={onNewEmailCancel}
              className="px-3 py-2 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              取消
            </button>
          </form>
          {emailError && <p className="text-red-500 text-xs mt-2">{emailError}</p>}
        </div>
      )}

      <div className="bg-white rounded-lg border border-[#E8E5DE] p-1 min-h-[400px]">
        {error ? (
          <div className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={onRetry}
              className="text-[#B8953F] underline text-sm"
            >
              重新结账
            </button>
          </div>
        ) : (
          <EmbeddedCheckoutProvider
            key={sessionKey}
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-6 text-xs text-neutral-400 py-2">
        <div className="flex items-center gap-1">
          <LockIcon size={14} />
          SSL 加密
        </div>
        <div className="flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Stripe 安全支付
        </div>
        <div className="flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          30天退款
        </div>
      </div>
    </div>
  );
}

/** Course package item with number, title, value tag, and description */
function PackageItem({ number, title, value, description }: {
  number: string;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-[#B8953F] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="font-semibold text-neutral-900 text-sm">{title}</h3>
          <span className="text-xs text-[#B8953F] bg-[rgba(184,149,63,0.08)] px-2 py-0.5 rounded">
            价值 {value}
          </span>
        </div>
        <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/** Testimonial card */
function Testimonial({ text, name }: { text: string; name: string }) {
  return (
    <div className="border-l-4 border-[#B8953F] bg-white rounded-r-lg p-5">
      <p className="text-sm text-neutral-600 italic mb-2">&ldquo;{text}&rdquo;</p>
      <p className="text-xs text-neutral-400">&mdash; 学员 {name}</p>
    </div>
  );
}

/** Step card for post-purchase flow */
function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="text-center p-4 bg-[#FAFAF7] rounded-lg">
      <div className="w-8 h-8 rounded-full bg-[#B8953F] text-white text-sm font-bold flex items-center justify-center mx-auto mb-2">
        {step}
      </div>
      <p className="font-medium text-sm text-neutral-900 mb-1">{title}</p>
      <p className="text-xs text-neutral-500">{desc}</p>
    </div>
  );
}

/** Reusable lock icon */
function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
