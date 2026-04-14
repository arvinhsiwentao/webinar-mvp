'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import FloatingFAQChat from '@/components/chat/FloatingFAQChat';
import {
  getAllProducts,
  getExcludedProducts,
  calculateTotal,
  PRODUCT_IDS,
  type ProductId,
  type ProductConfig,
} from '@/lib/products';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

const BUNDLE_PRICE = 599;

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
  const [email, setEmail] = useState(urlEmail);
  const [emailSubmitted, setEmailSubmitted] = useState(!!urlEmail);
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [sessionKey, setSessionKey] = useState(0);

  // Product selection
  const [selectedIds, setSelectedIds] = useState<ProductId[]>([]);
  const allProducts = useMemo(() => getAllProducts(), []);
  const total = useMemo(() => calculateTotal(selectedIds), [selectedIds]);

  // Ordered list for individual-product section: OPTIONS → ETF+OPTIONS → APP_QUARTERLY
  const individualProducts = useMemo(() => {
    const order: ProductId[] = [PRODUCT_IDS.OPTIONS, PRODUCT_IDS.ETF_OPTIONS, PRODUCT_IDS.APP_QUARTERLY];
    return order
      .map(id => allProducts.find(p => p.id === id))
      .filter((p): p is ProductConfig => !!p);
  }, [allProducts]);
  const bundleProduct = useMemo(() => allProducts.find(p => p.isBundle), [allProducts]);

  const bundleSelected = selectedIds.includes(PRODUCT_IDS.BUNDLE);

  // Selected product configs (for right-column summary)
  const selectedProducts = useMemo(
    () => selectedIds.map(id => allProducts.find(p => p.id === id)).filter((p): p is ProductConfig => !!p),
    [selectedIds, allProducts]
  );

  // Testimonial shown inside each product card — one per plan, tied to live script moments
  const testimonialByProduct: Record<ProductId, { text: string; name: string }> = {
    [PRODUCT_IDS.OPTIONS]: {
      text: '学会 Sell Put 后，市场跌的时候也能收保费，心态完全不一样。',
      name: '陈先生',
    },
    [PRODUCT_IDS.ETF_OPTIONS]: {
      text: '上完课最大的改变不是赚多少，是终于不焦虑了。市场再震荡也能睡好觉。',
      name: '赵先生',
    },
    [PRODUCT_IDS.APP_QUARTERLY]: {
      text: '通勤路上听 Mike 语音直播，我就知道这周该不该调整。即时互动课程替代不了。',
      name: '林先生',
    },
    [PRODUCT_IDS.BUNDLE]: {
      text: '一对一持仓分析后，十几支 ETF 砍到六支，逻辑一下子清楚。现在每天 10 分钟搞定。',
      name: 'Kevin L.',
    },
  };

  // Stripe confirmation state — CRITICAL: prevents multiple Embedded Checkout objects
  const [checkoutConfirmed, setCheckoutConfirmed] = useState(false);
  const [confirmedProductIds, setConfirmedProductIds] = useState<ProductId[]>([]);

  // Upsell hint: when total of non-bundle items approaches bundle price
  const upsellDiff = !bundleSelected && selectedIds.length > 0
    ? BUNDLE_PRICE - total
    : null;
  const showUpsellHint = upsellDiff !== null && upsellDiff > 0 && upsellDiff <= 350;

  // Toggle product selection — soft-switch: click a conflicting item auto-removes conflicts
  const toggleProduct = useCallback((id: ProductId) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      }
      if (id === PRODUCT_IDS.BUNDLE) {
        return [PRODUCT_IDS.BUNDLE];
      }
      const excluded = new Set<ProductId>(getExcludedProducts(id));
      return [...prev.filter(p => !excluded.has(p)), id];
    });
    setCheckoutConfirmed(false);
  }, []);

  // Confirm selection and render Stripe
  const handleConfirmCheckout = useCallback(() => {
    if (selectedIds.length === 0) return;
    setConfirmedProductIds([...selectedIds]);
    setSessionKey(k => k + 1);
    setCheckoutConfirmed(true);
  }, [selectedIds]);

  // Countdown timer — 2 hours, persisted in localStorage so refresh doesn't reset
  const COUNTDOWN_DURATION = 2 * 60 * 60; // 2 hours in seconds
  const storageKey = `checkout-${webinarId}-deadline`;
  const [countdown, setCountdown] = useState<number | null>(null); // null = not yet initialized

  // Initialize countdown on client only (avoids hydration mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const remaining = Math.round((parseInt(stored, 10) - Date.now()) / 1000);
        setCountdown(remaining > 0 ? remaining : 0);
      } else {
        const deadline = Date.now() + COUNTDOWN_DURATION * 1000;
        localStorage.setItem(storageKey, deadline.toString());
        setCountdown(COUNTDOWN_DURATION);
      }
    } catch {
      setCountdown(COUNTDOWN_DURATION);
    }
  }, [storageKey, COUNTDOWN_DURATION]);

  // Tick every second
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown !== null && countdown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // fetchClientSecret uses confirmedProductIds (NOT selectedIds)
  const confirmedBundleSelected = confirmedProductIds.includes(PRODUCT_IDS.BUNDLE);
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webinarId, email, name, source,
        productIds: confirmedProductIds,
        ...(confirmedBundleSelected ? {
          bonusDeadline: (() => { try { return localStorage.getItem(storageKey) || ''; } catch { return ''; } })(),
        } : {}),
      }),
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
  }, [webinarId, email, name, source, confirmedProductIds, confirmedBundleSelected, storageKey]);

  const checkoutRef = useRef<HTMLDivElement>(null);

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
  const cd = countdown ?? 0;
  const hours = Math.floor(cd / 3600);
  const mins = Math.floor((cd % 3600) / 60);
  const secs = cd % 60;
  const countdownDisplay = countdown !== null && countdown > 0
    ? `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : null;
  const bonusExpired = countdown !== null && countdown <= 0;

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
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500 font-medium hidden sm:inline">直播限定 · 错过不再</span>
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-md px-3 py-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="font-mono font-bold text-red-600 text-sm">{countdownDisplay}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 lg:py-12 pb-36 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12">

          {/* ============ Left column — Content ============ */}
          <div className="space-y-8">

            {/* ==================== Section 1: Headline ==================== */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">
                从听懂美股，到真的每月有收益
              </h1>
              <p className="text-neutral-500">
                5 分钟扫市场代替两三小时盯盘，期权月月收保费、ETF 放大报酬 — Mike 用万美金学费换来的 SOP，你直接照做
              </p>
            </div>

            {/* ==================== Section 2: Course content details (pure education, no pricing) ==================== */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] overflow-hidden">
              <div className="p-5 lg:p-6">
                <h2 className="text-lg font-bold text-neutral-900">课程内容介绍</h2>
              </div>
              <div className="px-5 lg:px-6 pb-5 lg:pb-6 space-y-8">

                {/* Item 1: APP */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Image
                      src="/images/app-icon.png"
                      alt="APP icon"
                      width={40}
                      height={40}
                      className="rounded-lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-neutral-900">MIKE是麦克 APP</h3>
                        <span className="text-xs text-[#B8953F] bg-[rgba(184,149,63,0.08)] px-2 py-0.5 rounded font-medium">APP 工具</span>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2.5 ml-[52px]">
                    <FeatureItem text="价值灯号 — 本益比 / 营收 / 现金流算出红 / 黄 / 绿灯，5 分钟扫完市场，不用花两三小时盯盘" />
                    <FeatureItem text="Mike 每日观点 & 关注清单 — 每天在 APP 更新他真的在盯什么股、怎么看最新行情，不是隔靴搔痒" />
                    <FeatureItem text="双周语音直播 — 每两周一场、至少一小时，聊最新趋势，可直接提问交流" />
                    <FeatureItem text="学员社群 + 付费文章 — 跟 Mike 和学员讨论持仓、读他的深度分析，波动时不用一个人扛" />
                  </ul>
                </div>

                <div className="border-t border-[#E8E5DE]" />

                {/* Item 2: Options course */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(184,149,63,0.08)] flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-neutral-900">期权策略课程</h3>
                        <span className="text-xs text-[#B8953F] bg-[rgba(184,149,63,0.08)] px-2 py-0.5 rounded font-medium">线上课程</span>
                        <span className="text-xs text-[#B8953F] bg-[rgba(184,149,63,0.08)] px-2 py-0.5 rounded font-medium">无期限 · 无限次数观看</span>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2.5 ml-[52px]">
                    <FeatureItem text="Sell Put 低接收保费 — 像「挂低价等买房，等待期间还能收租」，市场越跌你越从容" />
                    <FeatureItem text="Sell Call 持仓收租 — 手上有 ETF 就能额外收保费，不卖股票也有现金流" />
                    <FeatureItem text="风险控制 SOP — 保证金怎么算、什么该做什么不该做。Mike 踩过上万美金学费的坑，你直接跳过" />
                  </ul>
                </div>

                <div className="border-t border-[#E8E5DE]" />

                {/* Item 3: ETF course */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[rgba(184,149,63,0.08)] flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-neutral-900">ETF 实战课程</h3>
                        <span className="text-xs text-[#B8953F] bg-[rgba(184,149,63,0.08)] px-2 py-0.5 rounded font-medium">线上课程</span>
                        <span className="text-xs text-[#B8953F] bg-[rgba(184,149,63,0.08)] px-2 py-0.5 rounded font-medium">无期限 · 无限次数观看</span>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2.5 ml-[52px]">
                    <FeatureItem text="四类 ETF 推车配置 — 成长做加速、防御做安全垫、收益做现金流、进阶博超额回报，像逛 Costco 装满推车" />
                    <FeatureItem text="从退休目标倒推配比 — 几岁退休、每年要多少钱、现在多少本金，三个数字算出你该偏攻还是偏守" />
                    <FeatureItem text="长短账户策略 + 季度再平衡 — 退休账户做长线、一般账户做短线，每季 10 分钟，用纪律替代情绪" />
                  </ul>
                </div>
              </div>
            </div>

            {/* ==================== Section 3: Product selector ==================== */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-neutral-900">选择你的方案</h2>

              {/* Countdown timer */}
              {countdownDisplay && (
                <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="text-sm text-red-600 font-medium">直播限定优惠剩余</span>
                  <span className="font-mono font-bold text-red-600 text-lg">{countdownDisplay}</span>
                </div>
              )}

              {/* Individual product cards — ordered: OPTIONS → ETF+OPTIONS → APP_QUARTERLY */}
              {individualProducts.map(product => {
                const pid = product.id as ProductId;
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selectedIds.includes(pid)}
                    disabled={false}
                    disabledReason=""
                    onToggle={() => toggleProduct(pid)}
                    bonusExpired={bonusExpired}
                    testimonial={testimonialByProduct[pid]}
                  />
                );
              })}

              {/* Separator — leads into bundle */}
              <div className="py-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-[#E8E5DE]" />
                  <span className="text-xs text-neutral-400 whitespace-nowrap">── 或选择完整组合包（含额外福利）──</span>
                  <div className="flex-1 border-t border-[#E8E5DE]" />
                </div>
              </div>

              {/* 1-on-1 bonus card — teaser above Bundle */}
              <div className={`rounded-lg p-5 relative ${bonusExpired ? 'bg-neutral-50 border border-neutral-200' : 'bg-[#B8953F]/5 border border-[#B8953F]/20'}`}>
                <div className={`absolute -top-3 left-4 text-white text-xs font-bold px-3 py-1 rounded ${bonusExpired ? 'bg-neutral-400' : 'bg-[#B8953F]'}`}>
                  {bonusExpired ? '此福利已过期' : '直播限定加赠'}
                </div>
                <div className={`flex flex-wrap items-center gap-2 mb-3 mt-1 ${bonusExpired ? 'opacity-50' : ''}`}>
                  <div className={`w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center shrink-0 ${bonusExpired ? 'bg-neutral-400' : 'bg-[#B8953F]'}`}>+</div>
                  <h3 className={`font-bold ${bonusExpired ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>Mike 一对一持仓分析</h3>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${bonusExpired ? 'text-neutral-400 bg-neutral-200' : 'text-white bg-[#B8953F]'}`}>
                    {bonusExpired ? '已过期' : '仅限组合包'}
                  </span>
                </div>
                {bonusExpired ? (
                  <p className="text-sm text-neutral-400 ml-8">
                    直播限定 2 小时内的福利已过期。课程套餐内容不受影响，仍可正常购买。
                  </p>
                ) : (
                  <p className="text-sm text-neutral-600 ml-8">
                    Mike 亲自检视你的投资账户，告诉你哪里配得好、哪里可以优化。就像直播中 A 同学那样，15 支 ETF 精简到 6 支，思路立刻清晰。<span className="text-[#B8953F] font-medium">购买组合包即可获得此福利。</span>
                  </p>
                )}
              </div>

              {/* Bundle card — last, to avoid price anchor shock */}
              {bundleProduct && (
                <ProductCard
                  product={bundleProduct}
                  selected={selectedIds.includes(PRODUCT_IDS.BUNDLE)}
                  disabled={false}
                  disabledReason=""
                  onToggle={() => toggleProduct(PRODUCT_IDS.BUNDLE)}
                  bonusExpired={bonusExpired}
                  testimonial={testimonialByProduct[PRODUCT_IDS.BUNDLE]}
                />
              )}
            </div>

            {/* ==================== Section 6: How it works ==================== */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-6 lg:p-8">
              <h2 className="text-lg font-bold text-neutral-900 mb-5">购买后怎么开始？</h2>
              <div className="space-y-0">
                <StepRow step="1" title="完成付款" desc="支持信用卡、Apple Pay、Google Pay" />
                <StepRow step="2" title="取得启用序号" desc="付款成功后页面自动显示，同时发送至你的邮箱" />
                <StepRow step="3" title="前往商品官网" desc="在官网输入启用序号，登入或注册理财宝帐号" />
                <StepRow step="4" title="下载 APP" desc="App Store / Google Play 搜索「MIKE是麦克」并登入" />
                <StepRow step="5" title="开始学习" desc="APP 内观看课程、加入社群、使用全部工具" isLast />
              </div>
            </div>

            {/* ==================== Section 7: Guarantee ==================== */}
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

          {/* ============ Right column — Summary + Stripe Checkout ============ */}
          <div ref={checkoutRef}>
            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-4 lg:pr-1">
              <CheckoutSection
                email={email}
                error={error}
                changingEmail={changingEmail}
                newEmail={newEmail}
                emailError={emailError}
                sessionKey={sessionKey}
                checkoutConfirmed={checkoutConfirmed}
                hasSelection={selectedIds.length > 0}
                selectedProducts={selectedProducts}
                total={total}
                bundleSelected={bundleSelected}
                bonusExpired={bonusExpired}
                showUpsellHint={showUpsellHint}
                upsellDiff={upsellDiff}
                onRemoveProduct={(pid) => toggleProduct(pid)}
                onConfirmCheckout={handleConfirmCheckout}
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

      {/* Mobile sticky checkout bar — visible when selection made but not yet confirmed */}
      {selectedIds.length > 0 && !checkoutConfirmed && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E8E5DE] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          {/* Trust strip */}
          <div className="flex items-center justify-center gap-1.5 bg-green-50 border-b border-green-200 px-3 py-1.5 text-xs text-green-700">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <span className="font-semibold">30 天无理由退款保证</span>
            <span className="text-green-600">· 零风险</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-neutral-500">已选 {selectedIds.length} 项</div>
              <div className="text-lg font-bold text-[#B8953F] leading-tight">
                ${total} <span className="text-xs font-medium">USD</span>
              </div>
            </div>
            <button
              onClick={() => {
                handleConfirmCheckout();
                requestAnimationFrame(() => {
                  checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              className="bg-[#B8953F] hover:bg-[#A6842F] text-white font-bold px-6 py-3 rounded-lg transition-colors shadow-md whitespace-nowrap"
            >
              确认并结账
            </button>
          </div>
        </div>
      )}

      <FloatingFAQChat
        webinarId={webinarId}
        pageSource="checkout"
        bottomOffsetClass={
          selectedIds.length > 0 && !checkoutConfirmed
            ? 'bottom-32 lg:bottom-5'
            : 'bottom-5'
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Product selection card */
function ProductCard({
  product,
  selected,
  disabled,
  disabledReason,
  onToggle,
  bonusExpired,
  testimonial,
}: {
  product: ProductConfig;
  selected: boolean;
  disabled: boolean;
  disabledReason: string;
  onToggle: () => void;
  bonusExpired: boolean;
  testimonial?: { text: string; name: string };
}) {
  const isBundle = product.isBundle;

  const borderClass = isBundle
    ? selected
      ? 'border-2 border-[#B8953F] shadow-md'
      : 'border-2 border-[#B8953F]/30'
    : selected
      ? 'border-2 border-[#B8953F] shadow-md'
      : 'border border-[#E8E5DE]';

  const opacityClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <div
      className={`bg-white rounded-lg overflow-hidden transition-all ${borderClass} ${opacityClass}`}
      onClick={() => !disabled && onToggle()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle(); } }}
      aria-pressed={selected}
      aria-disabled={disabled}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Checkbox / radio indicator */}
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            selected ? 'border-[#B8953F] bg-[#B8953F]' : 'border-neutral-300'
          }`}>
            {selected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-neutral-900">{product.name}</h3>
              {isBundle && (
                <span className="text-xs text-white bg-[#B8953F] px-2 py-0.5 rounded font-bold">最推荐</span>
              )}
              {product.bonus && !isBundle && (
                <span className="text-xs text-[#B8953F] bg-[rgba(184,149,63,0.08)] px-2 py-0.5 rounded font-medium">
                  {product.bonus}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-neutral-500 mb-2">{product.description}</p>

            {/* Includes list — bundle shows original prices inline */}
            {isBundle ? (
              <ul className="space-y-1.5">
                {[
                  { name: 'ETF 实战课程（无期限回看）', origPrice: '$384 USD' },
                  { name: '期权策略课程（无期限回看）', origPrice: '$312 USD' },
                  { name: 'APP 一年完整权限', origPrice: '$1,000 USD/年' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 text-xs">
                    <div className="flex items-start gap-1.5 text-neutral-600">
                      <span className="text-[#B8953F] shrink-0">&#10003;</span>
                      <span>{item.name}</span>
                    </div>
                    <span className="text-neutral-400 shrink-0">原价 {item.origPrice}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-1">
                {product.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-neutral-600">
                    <span className="text-[#B8953F] shrink-0">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Testimonial — student social proof tied to this plan */}
            {testimonial && (
              <div className="mt-3 border-l-2 border-[#B8953F]/40 bg-[#FAFAF7] px-3 py-2 rounded-r">
                <p className="text-xs italic text-neutral-600 leading-relaxed">
                  <span className="text-[#B8953F] mr-1">&ldquo;</span>{testimonial.text}<span className="text-[#B8953F] ml-1">&rdquo;</span>
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">&mdash; 学员 {testimonial.name}</p>
              </div>
            )}

            {/* Price — bottom right */}
            <div className={`flex flex-wrap items-baseline justify-end gap-2 ${isBundle ? 'mt-3' : 'mt-1'}`}>
              <span className="text-2xl font-bold text-[#B8953F]">${product.price} <span className="text-base font-semibold">USD</span></span>
              {product.originalPrice && (
                <>
                  <span className="text-sm text-neutral-400 line-through">${product.originalPrice}+ USD</span>
                  <span className="text-xs text-white bg-red-500 px-1.5 py-0.5 rounded font-bold">
                    {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Disabled reason */}
            {disabled && disabledReason && (
              <p className="text-xs text-neutral-400 mt-2">{disabledReason}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Stripe checkout section */
function CheckoutSection({
  email,
  error,
  changingEmail,
  newEmail,
  emailError,
  sessionKey,
  checkoutConfirmed,
  hasSelection,
  selectedProducts,
  total,
  bundleSelected,
  bonusExpired,
  showUpsellHint,
  upsellDiff,
  onRemoveProduct,
  onConfirmCheckout,
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
  checkoutConfirmed: boolean;
  hasSelection: boolean;
  selectedProducts: ProductConfig[];
  total: number;
  bundleSelected: boolean;
  bonusExpired: boolean;
  showUpsellHint: boolean;
  upsellDiff: number | null;
  onRemoveProduct: (id: ProductId) => void;
  onConfirmCheckout: () => void;
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
      {/* Email display + change — only when checkout is confirmed */}
      {checkoutConfirmed && !error && !changingEmail && (
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
        ) : !hasSelection ? (
          <div className="p-6 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 rounded-full bg-[rgba(184,149,63,0.08)] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <p className="text-neutral-500 text-sm font-medium mb-1">请先选择商品方案</p>
            <p className="text-neutral-400 text-xs">在左侧选择商品后，这里会显示订单摘要</p>
          </div>
        ) : !checkoutConfirmed ? (
          <div className="p-5">
            <h3 className="text-base font-bold text-neutral-900 mb-4">订单摘要</h3>
            <ul className="space-y-3 mb-4">
              {selectedProducts.map(p => (
                <li key={p.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-900">{p.shortName}</div>
                    <div className="text-xs text-neutral-500 line-clamp-2">{p.description}</div>
                    <button
                      type="button"
                      onClick={() => onRemoveProduct(p.id as ProductId)}
                      className="text-xs text-neutral-400 hover:text-red-500 transition-colors mt-1"
                    >
                      移除
                    </button>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-neutral-900">${p.price} <span className="text-xs font-medium text-neutral-500">USD</span></div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-[#E8E5DE] pt-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-neutral-600">合计 · 已选 {selectedProducts.length} 项</span>
              <span className="text-2xl font-bold text-[#B8953F]">${total} <span className="text-base font-semibold">USD</span></span>
            </div>
            {bundleSelected && !bonusExpired && (
              <div className="mb-4 bg-[rgba(184,149,63,0.06)] border border-[#B8953F]/20 rounded-md px-3 py-2">
                <p className="text-xs text-[#B8953F]">
                  <span className="font-bold">&#x2726; 含直播限定加赠：</span>Mike 一对一持仓分析
                </p>
              </div>
            )}
            {showUpsellHint && upsellDiff !== null && (
              <div className="mb-4 bg-[rgba(184,149,63,0.06)] border border-[#B8953F]/20 rounded-md px-3 py-2">
                <p className="text-xs text-[#B8953F]">
                  只差 <span className="font-bold">${upsellDiff} USD</span> 就能升级组合包，包含全部课程 + APP 一年 + 一对一持仓分析
                </p>
              </div>
            )}
            <button
              onClick={onConfirmCheckout}
              className="w-full bg-[#B8953F] hover:bg-[#A6842F] text-white font-bold py-3 rounded-lg transition-colors shadow-md"
            >
              确认并结账
            </button>
            {/* Refund guarantee — reinforces trust at decision moment */}
            <div className="mt-3 flex items-start gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
              <div className="text-xs leading-relaxed">
                <span className="font-bold text-green-700">30 天无理由退款保证</span>
                <span className="text-green-600"> · 不满意全额退款，零风险体验</span>
              </div>
            </div>
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

/** Feature bullet item with checkmark */
function FeatureItem({ text }: { text: string }) {
  // Split on " — " to bold the part before the dash
  const dashIndex = text.indexOf(' — ');
  return (
    <li className="flex items-start gap-2 text-sm text-neutral-600 leading-relaxed">
      <span className="text-[#B8953F] mt-0.5 shrink-0">&#10003;</span>
      {dashIndex > -1 ? (
        <span>
          <span className="font-medium text-neutral-800">{text.slice(0, dashIndex)}</span>
          {' — '}{text.slice(dashIndex + 3)}
        </span>
      ) : (
        <span>{text}</span>
      )}
    </li>
  );
}

/** Step row with vertical connector line */
function StepRow({ step, title, desc, isLast = false }: { step: string; title: string; desc: string; isLast?: boolean }) {
  return (
    <div className="flex gap-4">
      {/* Left: circle + connector line */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-[#B8953F] text-white text-sm font-bold flex items-center justify-center shrink-0">
          {step}
        </div>
        {!isLast && <div className="w-px flex-1 bg-[#E8E5DE] my-1" />}
      </div>
      {/* Right: content */}
      <div className="pb-5">
        <p className="font-medium text-sm text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
      </div>
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
