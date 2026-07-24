'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Webinar } from '@/lib/types';
import { trackGA4 } from '@/lib/analytics';
import { getStoredUtmParams } from '@/lib/utils';
import { formatInTimezone, getTimezoneLabel } from '@/lib/timezone';
import PersistentCountdown from '@/components/countdown/PersistentCountdown';
import { useRegistrationForm } from '@/components/registration/useRegistrationForm';
import RegistrationModalV2 from '@/components/landing/RegistrationModalV2';
import ScrollReveal from '@/components/landing/ScrollReveal';
// CountUpNumber 保留 import，讲师介绍区可能会用到
import CountUpNumber from '@/components/landing/CountUpNumber';
import FAQAccordion from '@/components/landing/FAQAccordion';
import StickyNav from '@/components/landing/StickyNav';

const DEFAULT_WEBINAR_ID = '3';

// ─── FAQ content ───
const FAQ_ITEMS = [
  {
    question: '我完全不懂投资，也能听懂吗？',
    answer: '完全可以。这堂课不讲复杂的技术指标和 K 线，Mike 讲的是最底层的逻辑，一步一步带你走。零基础、没有任何金融背景，也一样听得懂。',
  },
  {
    question: '我资金不多、平常也没时间盯盘，适合来吗？',
    answer: '适合。Mike 教的方法跟你钱多钱少、有没有时间盯盘没关系，几千块、一天花几分钟一样能上手。这堂课就是先帮你把观念和框架建起来，钱会慢慢跟上。',
  },
  {
    question: '体验课是中文还是英文？',
    answer: '全程中文（普通话）。Mike 是北美华人，讲解方式接地气，零基础也能听懂。',
  },
  {
    question: '我已经在投资美股了，这堂课对我还有帮助吗？',
    answer: '非常有帮助。很多学员本身已有投资经验，但缺少一套系统化的框架来整合碎片知识。Mike 会讲解完整的选股步骤和仓位配置逻辑，帮你从「凭感觉操作」升级到「有纪律地执行」。',
  },
  {
    question: '错过直播时间怎么办？',
    answer: '报名后系统会发送提醒邮件。如果错过了，你可以选择下一个可用场次重新参加。',
  },
  {
    question: '我的个人信息安全吗？',
    answer: '我们严格保护你的隐私，不会将你的信息出售给任何第三方。报名信息仅用于发送体验课相关通知。',
  },
];

// ─── Hook 痛点：AI 涨疯又逢大回调，散户的纠结（V8 开场 + 环节 6-7 卡点）───
const HOOK_PAINS = [
  {
    // 上升趋势：AI 涨疯、别人一直赚，你还没上车
    text: '最近 AI 涨疯了，你还没上车，看着别人一直赚，越等越焦虑，怕这波时代红利跟你没关系',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />,
  },
  {
    // 回落曲线：想进场却遇上大回调，怕买在山顶
    text: '关注 AI 一阵子了、也想进场，偏偏遇上一个大回调，又怕现在一买，就套在山顶',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />,
  },
  {
    // 地图：摸不清 AI 整张版图，不知从哪研究起
    text: '想搞懂 AI 到底怎么投，却不知道从哪研究起，一堆概念，始终摸不清整张版图',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />,
  },
];

// ─── 筛选受众：这堂课适合谁 / 不适合谁（V8 环节 2）───
const SUITABLE = [
  '想吃到 AI 这波时代红利，但不想靠运气、想靠一套方法',
  '怕现在进场买在山顶，想学会怎么判断买点、分批进场',
  '想慢慢脱离「通胀 + 资本收割」，一步步走向长期财务增长',
  '愿意花一小时，建立一套自己就能判断的选股逻辑',
];
const NOT_SUITABLE = [
  '只想要一支明牌、一个代码，明天冲、后天就翻倍',
  '想一夜暴富，不愿意搞懂为什么涨、为什么跌',
  '习惯听消息追高杀低，不想自己做一点功课',
];

// ─── 学员实证截图（真实截图，已隐去姓名/头像/账号；金额为自家 LP 允许）───
const PROOF_BIG = [
  { src: '/images/proof/proof-12.webp', cap: '还是学生，跟着一路加仓持有，资产曲线一直往上走' },
  { src: '/images/proof/proof-10.webp', cap: '白手起家，AMD 抱了快三年，走在财务自由的路上' },
  { src: '/images/proof/proof-24.webp', cap: '靠美股获利，去年移居日本、在大阪买下一套公寓' },
  { src: '/images/proof/proof-25.webp', cap: '戒掉熬夜做短线，改走长线价值投资，账户盈利超过 300%' },
];
const PROOF_MARQUEE = [
  'proof-33', 'proof-30', 'proof-5', 'proof-37', 'proof-29', 'proof-39', 'proof-40',
  'proof-7', 'proof-14', 'proof-21', 'proof-22', 'proof-23', 'proof-2', 'proof-11', 'proof-20',
].map((n) => `/images/proof/${n}.webp`);


export default function HomePageV2() {
  const router = useRouter();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evergreenSlots, setEvergreenSlots] = useState<Array<{ slotTime: string; type: string }>>([]);
  const [evergreenTimezone, setEvergreenTimezone] = useState('America/Chicago');
  const [selectedSlotTime, setSelectedSlotTime] = useState('');
  const [modalSource, setModalSource] = useState<string>('');
  const [modalRemainingSeats, setModalRemainingSeats] = useState<number | undefined>(undefined);
  const [scheduleHint, setScheduleHint] = useState(false);

  const form = useRegistrationForm({
    webinarId: DEFAULT_WEBINAR_ID,
    assignedSlot: selectedSlotTime || evergreenSlots[0]?.slotTime,
    source: modalSource,
    onSuccess: (name) => {
      const slotTime = selectedSlotTime || evergreenSlots[0]?.slotTime;
      const sticky = localStorage.getItem(`webinar-${DEFAULT_WEBINAR_ID}-evergreen`);
      if (sticky) {
        try {
          const parsed = JSON.parse(sticky);
          parsed.registered = true;
          parsed.email = form.email;
          parsed.assignedSlot = slotTime;
          localStorage.setItem(`webinar-${DEFAULT_WEBINAR_ID}-evergreen`, JSON.stringify(parsed));
        } catch { /* ignore */ }
      }
      const slotParam = slotTime ? `&slot=${encodeURIComponent(slotTime)}` : '';
      const emailParam = form.email ? `&email=${encodeURIComponent(form.email)}` : '';
      const utmStr = new URLSearchParams(getStoredUtmParams()).toString();
      const utmParam = utmStr ? `&${utmStr}` : '';
      router.push(`/webinar/${DEFAULT_WEBINAR_ID}/lobby?name=${encodeURIComponent(name)}${slotParam}${emailParam}${utmParam}`);
    },
  });

  useEffect(() => {
    if (evergreenSlots.length > 0 && !selectedSlotTime) {
      setSelectedSlotTime(evergreenSlots[0].slotTime);
    }
  }, [evergreenSlots, selectedSlotTime]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [slotSeats, setSlotSeats] = useState<Record<string, number>>({});
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const heroCTARef = useRef<HTMLButtonElement>(null);
  const scheduleRef = useRef<HTMLElement>(null);

  // Sticky bar: 顯示條件 = hero CTA 不可見 AND schedule 區不可見
  useEffect(() => {
    const onScroll = () => {
      if (!heroCTARef.current) return;
      const heroRect = heroCTARef.current.getBoundingClientRect();
      const heroGone = heroRect.bottom < 0;

      let scheduleVisible = false;
      if (scheduleRef.current) {
        const schedRect = scheduleRef.current.getBoundingClientRect();
        scheduleVisible = schedRect.top < window.innerHeight && schedRect.bottom > 0;
      }

      setShowStickyBar(heroGone && !scheduleVisible);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 剩余名额 — localStorage 持久化，每次载入有小机率递减
  useEffect(() => {
    if (evergreenSlots.length === 0) return;
    const storageKey = 'webinar-v2-slot-seats';
    const stored = localStorage.getItem(storageKey);
    let seats: Record<string, number> = {};

    if (stored) {
      try { seats = JSON.parse(stored); } catch { /* ignore */ }
    }

    let changed = false;
    for (const slot of evergreenSlots) {
      const key = slot.slotTime;
      if (seats[key] === undefined) {
        // 首次：随机 12–28
        seats[key] = Math.floor(Math.random() * 17) + 12;
        changed = true;
      } else {
        // 回访：30% 机率减少 1–3
        if (Math.random() < 0.3 && seats[key] > 3) {
          seats[key] -= Math.floor(Math.random() * 3) + 1;
          seats[key] = Math.max(seats[key], 2);
          changed = true;
        }
      }
    }

    if (changed) {
      localStorage.setItem(storageKey, JSON.stringify(seats));
    }
    setSlotSeats(seats);
  }, [evergreenSlots]);

  // 报名人数 — localStorage 持久化，封顶 100
  const [registeredCount, setRegisteredCount] = useState(0);
  useEffect(() => {
    const key = 'webinar-v2-registered-count';
    const stored = localStorage.getItem(key);
    let count = 0;
    if (stored) {
      count = parseInt(stored, 10) || 0;
      // 回访 30% 机率 +1~3
      if (Math.random() < 0.3 && count < 100) {
        count += Math.floor(Math.random() * 3) + 1;
        count = Math.min(count, 100);
        localStorage.setItem(key, String(count));
      }
    } else {
      count = Math.floor(Math.random() * 26) + 60; // 首次 60-85
      localStorage.setItem(key, String(count));
    }
    setRegisteredCount(count);
  }, []);

  const refreshEvergreenSlots = useCallback(async () => {
    try {
      const slotRes = await fetch(`/api/webinar/${DEFAULT_WEBINAR_ID}/next-slot`);
      if (!slotRes.ok) return;
      const slotData = await slotRes.json();
      setEvergreenSlots(slotData.slots);
      if (slotData.config?.timezone) {
        setEvergreenTimezone(slotData.config.timezone);
      }

      const existingSticky = localStorage.getItem(`webinar-${DEFAULT_WEBINAR_ID}-evergreen`);
      const now = new Date();
      let shouldUpdate = true;

      if (existingSticky) {
        try {
          const parsed = JSON.parse(existingSticky);
          if (new Date(parsed.expiresAt) > now && new Date(parsed.assignedSlot) > now) {
            shouldUpdate = false;
            setEvergreenSlots(prev => {
              const stored = { slotTime: parsed.assignedSlot, type: 'stored' };
              return [stored, ...prev.filter(s => s.slotTime !== parsed.assignedSlot)].slice(0, slotData.slots.length);
            });
          }
        } catch { /* invalid stored data, update */ }
      }

      if (shouldUpdate && slotData.slots.length > 0) {
        const visitorId = localStorage.getItem('webinar-visitor-id') || `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        if (!localStorage.getItem('webinar-visitor-id')) {
          localStorage.setItem('webinar-visitor-id', visitorId);
        }
        localStorage.setItem(`webinar-${DEFAULT_WEBINAR_ID}-evergreen`, JSON.stringify({
          visitorId,
          assignedSlot: slotData.countdownTarget,
          expiresAt: slotData.expiresAt,
          registered: false,
          registrationId: null,
        }));
      }
    } catch {
      // Fall back to existing slots
    }
  }, []);

  useEffect(() => {
    async function fetchWebinar() {
      try {
        const res = await fetch(`/api/webinar/${DEFAULT_WEBINAR_ID}`);
        if (!res.ok) throw new Error('Webinar not found');
        const data = await res.json();
        setWebinar(data.webinar);

        if (data.webinar.evergreen?.enabled) {
          await refreshEvergreenSlots();
        }
      } catch {
        setError('找不到此研讨会');
      } finally {
        setLoading(false);
      }
    }
    fetchWebinar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 检测第一场是否已开始，触发 re-render
  const [, setTick] = useState(0);
  useEffect(() => {
    if (evergreenSlots.length === 0) return;
    const firstSlot = new Date(evergreenSlots[0].slotTime);
    const now = new Date();
    if (firstSlot <= now) return; // 已经过了，不需要 timer
    const msUntilStart = firstSlot.getTime() - now.getTime();
    const timer = setTimeout(() => setTick(t => t + 1), msUntilStart + 500);
    return () => clearTimeout(timer);
  }, [evergreenSlots]);

  // Scroll depth tracking
  useEffect(() => {
    const milestones = new Set<number>();
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const scrollPct = Math.round((window.scrollY / scrollHeight) * 100);
      for (const m of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
        if (scrollPct >= m && !milestones.has(m)) {
          milestones.add(m);
          trackGA4('c_scroll_depth', { percent: m, page: 'landing', webinar_id: DEFAULT_WEBINAR_ID });
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a08] flex items-center justify-center">
        <div className="w-8 h-8 border border-[#C9A962]/30 border-t-[#C9A962] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !webinar) {
    return (
      <div className="min-h-screen bg-[#0a0a08] flex items-center justify-center">
        <div className="text-center text-neutral-200">
          <p className="text-xl mb-4">{error || '找不到研讨会'}</p>
          <a href="/admin" className="text-neutral-500 hover:text-neutral-300">前往后台设置</a>
        </div>
      </div>
    );
  }

  const trackExternalLink = (linkType: string, linkPosition: string) => {
    trackGA4('c_external_link_click', { link_type: linkType, link_position: linkPosition });
  };

  const scrollToSchedule = (source: string) => {
    trackGA4('c_signup_button_click', { button_position: source, webinar_id: DEFAULT_WEBINAR_ID });
    const el = document.getElementById('schedule');
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const inView = rect.top >= -100 && rect.top <= window.innerHeight * 0.5;

    if (inView) {
      // 已在场次区 — 闪烁提示选择
      setScheduleHint(true);
      setTimeout(() => setScheduleHint(false), 2000);
    } else {
      el.scrollIntoView({ behavior: 'smooth' });
      // 滚动完后闪烁提示
      setTimeout(() => {
        setScheduleHint(true);
        setTimeout(() => setScheduleHint(false), 2000);
      }, 600);
    }
  };

  const openModal = async (source: string, remainingSeats?: number) => {
    if (webinar?.evergreen?.enabled) {
      await refreshEvergreenSlots();
    }
    trackGA4('c_signup_button_click', { button_position: source, webinar_id: DEFAULT_WEBINAR_ID });
    setModalSource(source);
    setModalRemainingSeats(remainingSeats);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a08] text-neutral-200">

      {/* Sticky Navigation Bar — always visible */}
      <StickyNav onCtaClick={() => scrollToSchedule('nav')} logoSrc="/icon.png" />

      {/* Spacer for fixed nav height */}
      <div className="h-14" />

      {/* ================================================================
          Section 1: HERO — Full-bleed background image with CTA
          ================================================================ */}
      {/* Hero — 图片 + CTA 一体化，底部渐层融入下方区块 */}
      <section className="w-full bg-gradient-to-b from-[#0a0a08] to-[#0f0f0d] h-[calc(100dvh-56px)] md:h-auto flex flex-col md:block">
        {/* 图片容器 + 底部渐层遮罩 — mobile: 图片缩放到 max-h-[60vh]，不裁切 */}
        <div className="relative">
          <picture>
            {/* V2 hero banners */}
            <source media="(min-width: 768px)" srcSet="/images/ai-mike-v3-desktop.webp" />
            <img
              src="/images/ai-mike-v3-mobile.webp"
              alt="AI时代，普通人最好的美股机会来了，一套不用盯盘、可复制的高胜率投资策略"
              className="w-full h-auto block max-h-[60vh] md:max-h-none object-cover object-top"
              fetchPriority="high"
            />
          </picture>
          {/* 底部渐层遮罩 — 让图片自然融入下方 CTA 区域 */}
          <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 bg-gradient-to-t from-[#0f0f0d] to-transparent pointer-events-none" />
        </div>

        {/* 上方弹性间距 — 图片与 CTA 之间 */}
        <div className="flex-[2] md:hidden" />

        {/* CTA 区块 */}
        <div className="md:pt-10 relative z-10 md:pb-12">
        <div className="max-w-xl mx-auto text-center px-6 animate-[heroFadeIn_0.8s_ease-out_0.3s_both]">
          <button
            ref={heroCTARef}
            onClick={() => scrollToSchedule('hero')}
            className="hero-cta group relative overflow-hidden px-14 py-5 md:px-16 md:py-4.5 lg:px-20 lg:py-5 rounded-2xl bg-[#B8953F] text-white text-xl md:text-xl lg:text-2xl font-bold tracking-widest cursor-pointer whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-[0_0_20px_rgba(184,149,63,0.5),0_0_50px_rgba(184,149,63,0.25)] hover:shadow-[0_0_30px_rgba(184,149,63,0.7),0_0_70px_rgba(184,149,63,0.4)] hover:bg-[#A6842F] hover:scale-105 active:scale-95"
          >
            {/* 顶部玻璃高光 */}
            <span className="absolute inset-x-0 top-0 h-[45%] pointer-events-none rounded-t-2xl bg-gradient-to-b from-white/[0.12] to-transparent" />
            {/* 持续光扫 */}
            <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[ctaShimmer_3s_ease-in-out_infinite_1.5s]" />
            </span>
            {/* Hover 时的蓝金色光扫 */}
            <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2563eb]/15 via-50% to-transparent animate-[ctaShimmer_1.5s_ease-in-out_infinite]" />
            </span>
            {/* 底部蓝色科技光边 — hover 时显现 */}
            <span className="absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#2563eb]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <span className="relative z-10">免费观看体验课 →</span>
          </button>
          {(() => {
            const firstSlot = evergreenSlots[0];
            const seats = firstSlot ? slotSeats[firstSlot.slotTime] : null;
            return seats ? (
              <p className="mt-1.5 text-base text-red-400 flex items-center justify-center gap-1.5">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                仅剩 <span className="font-bold text-red-300">{seats}</span> 个名额
              </p>
            ) : null;
          })()}
        </div>
      </div>
        {/* 下方弹性间距 — CTA 与 fold 之间 */}
        <div className="flex-[3] md:hidden" />
      </section>

      {/* ================================================================
          Section 3: PAIN POINTS — 痛点共鸣（与 CTA 同色，视觉连贯）
          ================================================================ */}
      <section id="content" className="pt-6 md:pt-10 pb-16 md:pb-24 px-6 lg:px-12 bg-[#0f0f0d]">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              最近 AI 涨疯了，你却更纠结了？
            </h2>
          </ScrollReveal>

          <div className="space-y-4">
            {HOOK_PAINS.map((point, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <div className="flex items-center gap-5 bg-white/[0.04] rounded-lg px-6 py-5 border border-[#C9A962]/20 hover:border-[#C9A962]/40 hover:bg-white/[0.06] transition-all duration-300">
                  <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#C9A962]/10 border border-[#C9A962]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {point.icon}
                    </svg>
                  </span>
                  <p className="text-lg md:text-xl text-neutral-300 leading-relaxed">{point.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          Section 4: BENEFITS — 你将学到什么
          ================================================================ */}
      <section className="py-16 md:py-24 px-6 lg:px-12 bg-[#111318]">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              免费体验课 1 小时，带走的是付费程度的干货
            </h2>
          </ScrollReveal>

          <div className="space-y-4">
            {[
              { title: '一张 Mike 亲手整理的 AI 完整版图', desc: '六层架构怎么分、十二大板块各自的重点股票清单，一次看懂 AI 到底该怎么投' },
              { title: '最新的 AI 趋势判断', desc: '现在进场到底还来不来得及、资金正在往哪个板块冲、下一棒的机会又在哪里' },
              { title: '一套最好的进场方法', desc: '什么时候该出手、怎么分批买，不追高、也不套在山顶' },
            ].map((b, idx) => (
              <ScrollReveal key={idx} delay={idx * 80}>
                <div className="flex items-start gap-4 bg-white/[0.03] rounded-xl border border-[#C9A962]/20 px-6 py-5 hover:border-[#C9A962]/40 hover:bg-white/[0.05] transition-all duration-300">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#C9A962]/20 border border-[#C9A962]/40 flex items-center justify-center mt-0.5">
                    <svg className="w-5 h-5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg md:text-xl font-bold text-[#E8D5A3] mb-1.5 leading-snug">{b.title}</p>
                    <p className="text-base md:text-lg text-neutral-400 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Mid-page CTA — 桌机保留，手机有 sticky bar 不需要 */}
          <ScrollReveal delay={500}>
            <div className="mt-10 text-center hidden md:block">
              <button
                onClick={() => scrollToSchedule('benefits')}
                className="group relative inline-block overflow-hidden px-10 py-4 text-lg font-semibold tracking-wide rounded-xl border border-[#C9A962] bg-gradient-to-r from-[#1a1508]/80 to-[#0f1a2e]/80 text-[#E8D5A3] hover:border-[#E8D5A3] hover:shadow-[0_0_20px_rgba(201,169,98,0.5),0_0_60px_rgba(201,169,98,0.2)] hover:scale-105 active:scale-95 transition-all duration-500 cursor-pointer"
              >
                <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[ctaShimmer_1.5s_ease-in-out_infinite]" />
                </span>
                <span className="relative z-10">限时免费报名 →</span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ================================================================
          Section 4.2: 筛选受众 — 这堂课适合谁 / 不适合谁（独立区块）
          ================================================================ */}
      <section className="py-16 md:py-24 px-6 lg:px-12 bg-[#0f0f0d]">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              这堂课适合谁？不适合谁？
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-5">
            {/* 不适合（左） */}
            <ScrollReveal>
              <div className="h-full bg-white/[0.03] rounded-xl border border-white/10 px-6 py-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/5 border border-white/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </span>
                  <h3 className="text-lg font-bold text-neutral-400">这些人，这堂课可能不适合你</h3>
                </div>
                <ul className="space-y-3">
                  {NOT_SUITABLE.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-lg md:text-xl text-neutral-400 leading-relaxed">
                      <span className="flex-shrink-0 mt-3 w-1.5 h-1.5 rounded-full bg-neutral-600" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
            {/* 适合（右） */}
            <ScrollReveal delay={120}>
              <div className="h-full bg-[#C9A962]/[0.06] rounded-xl border border-[#C9A962]/30 px-6 py-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#C9A962]/20 border border-[#C9A962]/40 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <h3 className="text-lg font-bold text-[#E8D5A3]">这堂课，为你准备</h3>
                </div>
                <ul className="space-y-3">
                  {SUITABLE.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-lg md:text-xl text-neutral-200 leading-relaxed">
                      <span className="flex-shrink-0 mt-3 w-1.5 h-1.5 rounded-full bg-[#C9A962]" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ================================================================
          Section 4.3: TESTIMONIALS — 学员实证（真实截图，排在筛选后 / 大纲前）
          ================================================================ */}
      <section id="testimonials" className="py-16 md:py-24 px-6 lg:px-12 bg-[#111318]">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              真实学员，真实结果
            </h2>
            <p className="text-neutral-400 text-center mb-10 text-sm md:text-base">
              以下都是真实学员的回馈截图，为保护隐私，姓名与头像已做隐去处理
            </p>
          </ScrollReveal>

          {/* 4 张大卡 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {PROOF_BIG.map((p, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <figure className="h-full bg-white/[0.03] rounded-xl border border-[#C9A962]/20 overflow-hidden">
                  <div className="bg-[#0f0f0d]">
                    <Image
                      src={p.src}
                      alt="学员实证截图"
                      width={640}
                      height={640}
                      className="w-full h-auto block"
                    />
                  </div>
                  <figcaption className="px-5 py-4 text-base md:text-lg text-neutral-300 leading-relaxed border-t border-white/5">
                    {p.cap}
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* 学员实证跑马灯 */}
        <div className="mt-12 -mx-6 md:-mx-[calc(50vw-50%)] overflow-hidden">
          <p className="text-xs text-neutral-500 text-center mb-5 tracking-widest uppercase px-6">更多真实回馈</p>
          <div className="flex animate-[marqueeScroll_45s_linear_infinite] hover:[animation-play-state:paused] gap-4 w-max">
            {[...Array(2)].map((_, setIdx) => (
              <div key={setIdx} className="flex gap-4">
                {PROOF_MARQUEE.map((src, num) => (
                  <div key={`${setIdx}-${num}`} className="flex-shrink-0 w-52 h-52 md:w-56 md:h-56 rounded-lg overflow-hidden bg-[#1a1a18] border border-white/10">
                    <Image
                      src={src}
                      alt="学员实证截图"
                      width={360}
                      height={360}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          Section 4.5: COURSE OUTLINE — 体验课大纲
          ================================================================ */}
      <section className="py-16 md:py-24 px-6 lg:px-12 bg-[#0f0f0d]">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              体验课大纲
            </h2>
            <p className="text-neutral-400 text-center mb-12 text-sm md:text-base">
一小时，从「为什么要行动」到「具体怎么做」，完整走一遍
            </p>
          </ScrollReveal>

          <div className="relative">
            {/* 左侧时间线 */}
            <div className="absolute left-5 md:left-6 top-0 bottom-6 w-px bg-[#C9A962]/30" />

            <div className="space-y-4 md:space-y-8">
              {[
                {
                  num: '01',
                  title: 'AI 六层架构：2026 年的机会在哪一层',
                  desc: '拆解 AI 产业链六层结构，告诉你资金正在往哪里流、哪些标的还在合理估值，现在进场还来不来得及。',
                },
                {
                  num: '02',
                  title: '选股四动作：看大盘 → 找风口 → 找交集 → 找买点',
                  desc: 'Mike 每天在用的一套选股系统，从大盘往下一层层走，让你不再听人报明牌，自己就能判断一支股能不能买。',
                },
                {
                  num: '03',
                  title: '仓位配置：核心 / 卫星 / 现金，依年龄怎么调',
                  desc: '选对股只是一半，配置是更重要的另一半。核心仓、卫星仓、现金三块怎么分，二十岁跟五十岁完全不一样。',
                },
                {
                  num: '04',
                  title: '真实学员实证 + 一天几分钟，怎么用工具上手',
                  desc: '一群跟你一样的普通人靠这套做出结果；最后带你看怎么把整套变成一天只花几分钟就能做的事。',
                },
              ].map((item, idx) => (
                <ScrollReveal key={idx} delay={idx * 100}>
                  <div className="flex gap-5 md:gap-7 relative">
                    {/* 编号圆点 */}
                    <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#0f0f0d] border border-[#C9A962]/40 flex items-center justify-center z-10">
                      <span className="text-sm md:text-base font-bold text-[#C9A962]">{item.num}</span>
                    </div>
                    {/* 内容 */}
                    <div className="pt-1 pb-2">
                      <h3 className="text-lg md:text-xl font-bold text-neutral-200 mb-1.5">{item.title}</h3>
                      <p className="hidden md:block text-base md:text-lg text-neutral-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          Section 5: SPEAKER — 故事型介绍
          ================================================================ */}
      <section id="speaker" className="py-16 md:py-24 px-6 lg:px-12 bg-[#111318]">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
              {/* Avatar — 放大 + 金色光环动画 */}
              <div className="flex-shrink-0 relative">
                {/* 外圈旋转光环 */}
                <div className="absolute -inset-3 rounded-full border border-[#C9A962]/20 md:animate-[speakerRingSpin_12s_linear_infinite]" />
                <div className="absolute -inset-6 rounded-full border border-[#C9A962]/10 md:animate-[speakerRingSpin_20s_linear_infinite_reverse]" />
                {/* 背景光晕 */}
                <div className="absolute -inset-4 rounded-full bg-[#C9A962]/5 blur-xl" />
                <div className="relative w-36 h-36 md:w-64 md:h-64 rounded-full overflow-hidden border-2 border-[#C9A962]/40 shadow-[0_0_30px_rgba(201,169,98,0.2)]">
                  <Image
                    src="/images/mike-profile.jpg"
                    alt="Mike是麦克"
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Story-based bio */}
              <div className="text-center md:text-left flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                  {webinar.speakerName}
                </h2>
                <p className="text-sm text-[#C9A962] font-medium mb-5">
                  {webinar.speakerTitle || '美股投资人 / YouTube 创作者'}
                </p>

                <div className="space-y-4 text-lg md:text-xl text-neutral-400 leading-relaxed">
                  <p>
                    32 岁负债 50 万美金，没有背景、没有人脉。你现在经历的迷茫，怕买错、怕亏钱、光靠薪水看不到尽头，Mike 全都经历过。靠着自己摸索出的投资框架，43 岁实现财务自由。走过的每一个弯路，都变成了现在能教给你的方法。
                  </p>
                  <p>
                    著有投资畅销书《人生重启》，曾受邀电视财经节目分享投资策略，
                    并与台湾最大财经平台 CMoney 合作推出投资工具。
                  </p>
                </div>

                {/* 第三方背书标签 */}
                <div className="mt-5 hidden md:flex flex-wrap items-center gap-2 justify-center md:justify-start">
                  <a
                    href="https://www.amazon.in/%E4%BA%BA%E7%94%9F%E9%87%8D%E5%95%9F%EF%BC%9A%E7%A7%BB%E6%B0%91%E7%BE%8E%E5%9C%8B%E8%B7%A8%E8%B6%8A%E8%B2%A1%E5%AF%8C%E9%AB%98%E7%89%86%EF%BC%8C%E5%BE%9E%E6%99%AE%E9%80%9A%E4%BA%BA%E5%88%B0%E4%B8%80%E5%80%8B%E6%9C%89%E9%8C%A2%E7%9A%84%E6%99%AE%E9%80%9A%E4%BA%BA-Traditional-Chinese-Mike-ebook/dp/B0FQRN9YKD"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackExternalLink('book', 'speaker_badge')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-neutral-400 hover:border-[#C9A962]/40 hover:text-neutral-300 transition-all"
                  >
                    <svg className="w-3.5 h-3.5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    畅销书《人生重启》作者
                  </a>
                  <a
                    href="https://www.youtube.com/watch?v=cWsTo3Vp-Wc"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackExternalLink('tvbs', 'speaker_badge')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-neutral-400 hover:border-[#C9A962]/40 hover:text-neutral-300 transition-all"
                  >
                    <svg className="w-3.5 h-3.5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    TVBS 财经节目受邀嘉宾
                  </a>
                  <a
                    href="https://www.cmoney.tw/app/ItemContent.aspx?id=6643"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackExternalLink('cmoney', 'speaker_badge')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-neutral-400 hover:border-[#C9A962]/40 hover:text-neutral-300 transition-all"
                  >
                    <svg className="w-3.5 h-3.5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    3,000+ 付费会员社群
                  </a>
                </div>

              </div>
            </div>
          </ScrollReveal>

          {/* Mike 的作品与平台 */}
          <ScrollReveal delay={200}>
            <div className="mt-14">
              <p className="text-xs text-neutral-500 text-center mb-5 tracking-widest uppercase">更多关于 Mike</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* YouTube */}
                <a
                  href="https://www.youtube.com/@mike1111"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackExternalLink('youtube', 'speaker_card')}
                  className="group/card flex flex-col items-center justify-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#C9A962]/40 hover:bg-white/[0.07] p-5 transition-all duration-300 text-center"
                >
                  <svg className="w-12 h-12 text-[#FF0000]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-neutral-200 group-hover/card:text-white transition-colors">YouTube</p>
                    <p className="text-xs text-neutral-500 mt-0.5">20万+ 订阅</p>
                  </div>
                </a>

                {/* 书籍 */}
                <a
                  href="https://www.amazon.in/%E4%BA%BA%E7%94%9F%E9%87%8D%E5%95%9F%EF%BC%9A%E7%A7%BB%E6%B0%91%E7%BE%8E%E5%9C%8B%E8%B7%A8%E8%B6%8A%E8%B2%A1%E5%AF%8C%E9%AB%98%E7%89%86%EF%BC%8C%E5%BE%9E%E6%99%AE%E9%80%9A%E4%BA%BA%E5%88%B0%E4%B8%80%E5%80%8B%E6%9C%89%E9%8C%A2%E7%9A%84%E6%99%AE%E9%80%9A%E4%BA%BA-Traditional-Chinese-Mike-ebook/dp/B0FQRN9YKD"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackExternalLink('book', 'speaker_card')}
                  className="group/card flex flex-col items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#C9A962]/40 hover:bg-white/[0.07] p-5 transition-all duration-300 text-center"
                >
                  <div className="w-16 h-22 rounded overflow-hidden shadow-lg">
                    <Image src="/images/book-cover.jpg" alt="《人生重启》" width={64} height={88} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-200 group-hover/card:text-white transition-colors">《人生重启》</p>
                    <p className="text-xs text-neutral-500 mt-0.5">投资畅销书</p>
                  </div>
                </a>

                {/* TVBS */}
                <a
                  href="https://www.youtube.com/watch?v=cWsTo3Vp-Wc"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackExternalLink('tvbs', 'speaker_card')}
                  className="group/card flex flex-col items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#C9A962]/40 hover:bg-white/[0.07] p-5 transition-all duration-300 text-center"
                >
                  <div className="w-32 h-22 rounded overflow-hidden relative">
                    <Image src="/images/tvbs-interview.png" alt="TVBS 专访" width={128} height={88} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-200 group-hover/card:text-white transition-colors">TVBS 专访</p>
                    <p className="text-xs text-neutral-500 mt-0.5">财经节目嘉宾</p>
                  </div>
                </a>

                {/* APP */}
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#C9A962]/40 hover:bg-white/[0.07] p-5 transition-all duration-300 text-center">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg">
                    <Image src="/icon.png" alt="Mike是麦克 APP" width={56} height={56} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-200">投资 APP</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <a href="https://apps.apple.com/tw/app/mike%E6%98%AF%E9%BA%A5%E5%85%8B/id6738429943" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('app_ios', 'speaker_card')} className="text-xs text-neutral-500 hover:text-[#C9A962] transition-colors underline">iOS</a>
                      <span className="text-neutral-600">|</span>
                      <a href="https://play.google.com/store/apps/details?id=com.jingliang.productionline.mikeismike2&hl=zh_TW" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('app_android', 'speaker_card')} className="text-xs text-neutral-500 hover:text-[#C9A962] transition-colors underline">Android</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* 线下活动跑马灯 */}
          <div className="mt-14 -mx-6 md:-mx-[calc(50vw-50%)] overflow-hidden">
            <p className="text-xs text-neutral-500 text-center mb-5 tracking-widest uppercase px-6">线下活动与粉丝互动</p>
            <div className="flex animate-[marqueeScroll_30s_linear_infinite] hover:[animation-play-state:paused] gap-4 w-max">
              {[...Array(2)].map((_, setIdx) => (
                <div key={setIdx} className="flex gap-4">
                  {[
                    { src: '/images/community-1.jpg', alt: 'Mike 与粉丝户外合照' },
                    { src: '/images/community-2.jpg', alt: 'Mike 与学员聚会' },
                    { src: '/images/community-3.jpg', alt: 'Mike 一对一交流' },
                    { src: '/images/community-4.jpg', alt: 'Mike 线下演讲' },
                    { src: '/images/community-5.jpg', alt: 'Mike 演讲现场' },
                    { src: '/images/community-6.jpg', alt: 'Mike 学员聚餐' },
                    { src: '/images/community-7.jpg', alt: 'Mike 与学员对谈' },
                    { src: '/images/community-8.jpg', alt: 'Mike 分享交流' },
                  ].map((photo, num) => (
                    <div key={`${setIdx}-${num}`} className="flex-shrink-0 w-80 h-48 rounded-lg overflow-hidden bg-[#1a1a18] border border-white/10">
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        width={320}
                        height={192}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          Section 7: DATE SCHEDULE + COUNTDOWN
          ================================================================ */}
      <section id="schedule" ref={scheduleRef} className="py-16 md:py-24 px-6 lg:px-12 bg-[#111318]">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              免费名额有限 · 选择你的场次
            </h2>
            <p className="text-sm md:text-base text-[#C9A962] text-center mb-6">
              🎁 报名即有机会获得 Mike 一对一持仓分析
            </p>
          </ScrollReveal>


          {/* 提示选择场次 */}
          <div
            className={`overflow-hidden transition-all duration-500 w-full max-w-xl ${scheduleHint ? 'max-h-16 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}
          >
            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#C9A962]/15 border border-[#C9A962]/30 animate-pulse">
              <svg className="w-4 h-4 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
              </svg>
              <p className="text-base md:text-lg font-medium text-[#E8D5A3]">请选择一个场次时间报名</p>
            </div>
          </div>

          {/* Slot cards — 手機預設只顯示第一場，可展開更多 */}
          <div className="space-y-5 mb-14 w-full max-w-xl">
            {(() => {
              const isReasonableTime = (slotTime: string) => {
                const d = new Date(slotTime);
                const ptHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hourCycle: 'h23' }).format(d));
                const etHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(d));
                return ptHour >= 8 && ptHour <= 23 && etHour >= 8 && etHour <= 23;
              };
              const filtered = evergreenSlots.filter((item) =>
                item.type === 'immediate' || item.type === 'stored' || isReasonableTime(item.slotTime)
              );
              return filtered;
            })().map((item, idx) => {
              // 手機：預設只顯示第一張，展開後全部顯示
              const hideOnMobile = idx > 1 && !showAllSlots;
              const dateStr = item.slotTime;
              const { date: fullDate } = formatInTimezone(dateStr, evergreenTimezone);
              const dateObj = new Date(dateStr);
              const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: evergreenTimezone, month: 'numeric' }).format(dateObj));
              const day = Number(new Intl.DateTimeFormat('en-US', { timeZone: evergreenTimezone, day: 'numeric' }).format(dateObj));
              const remaining = slotSeats[dateStr];

              return (
                <React.Fragment key={idx}>
                <ScrollReveal delay={idx * 100}>
                  <div className={`bg-white/[0.04] rounded-xl border border-[#C9A962]/20 hover:border-[#C9A962]/40 transition-all duration-300 overflow-hidden ${hideOnMobile ? 'hidden md:block' : ''}`}>
                    <div className="flex items-center gap-5 px-6 py-5">
                      {/* 日期信息 */}
                      <div className="flex-1">
                        <p className="text-lg md:text-xl font-bold text-neutral-200">{fullDate}</p>
                        <p className="text-base md:text-lg text-[#C9A962] mt-1">
                          {formatInTimezone(dateStr, 'America/Los_Angeles').time} 美西 (PT) / {formatInTimezone(dateStr, 'America/New_York').time} 美东 (ET)
                        </p>
                      </div>
                    </div>
                    {/* 第一场：倒计时或已开始提示 */}
                    {idx === 0 && (
                      <div className="px-6 py-4 bg-[#C9A962]/[0.07] border-t border-[#C9A962]/20">
                        {new Date(dateStr) <= new Date() ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            <p className="text-base md:text-lg font-semibold text-[#E8D5A3]">
                              直播已经开始，立即报名收听
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="text-base md:text-lg font-semibold text-[#E8D5A3] mb-3 text-center">
                              最近一场即将开始，免费报名立即观看
                            </p>
                            <div className="[&_p]:text-neutral-300 [&_p]:text-base mb-3">
                              <PersistentCountdown slots={evergreenSlots.slice(0, 1)} />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {/* 底部操作栏 */}
                    <div className="flex items-center justify-between px-6 py-3 bg-white/[0.02] border-t border-white/5">
                      <div className="flex flex-col gap-0.5">
                        {remaining !== undefined && (
                          <>
                            <p className="text-sm md:text-base text-neutral-500">
                              已有 <span className="text-[#C9A962] font-semibold">{80 - remaining}</span> 人报名
                            </p>
                            <p className="text-sm md:text-base text-red-400 flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                              </span>
                              仅剩 <span className="font-bold text-red-300">{remaining}</span> 个名额
                            </p>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          trackGA4('c_schedule_card_click', { slot_index: idx, slot_type: item.type, remaining_seats: remaining ?? 0 });
                          setSelectedSlotTime(dateStr);
                          openModal('schedule_card', remaining);
                        }}
                        className="ml-auto text-base font-semibold px-6 py-2.5 rounded-lg border border-[#C9A962]/50 text-[#E8D5A3] bg-[#C9A962]/10 hover:bg-[#C9A962]/20 hover:border-[#C9A962] transition-all duration-300 cursor-pointer"
                      >
                        立即报名
                      </button>
                    </div>
                  </div>
                </ScrollReveal>
                {/* 已额满假卡 — 穿插在第 2 張后面，制造「中间场次也抢完了」 */}
                {idx === 1 && evergreenSlots.length > 2 && (() => {
                  // 场次 3 的早场（场次 3 时间 - 10 小时）
                  const slot3Time = evergreenSlots[2]?.slotTime;
                  if (!slot3Time) return null;
                  const soldOutDate = new Date(new Date(slot3Time).getTime() - 10 * 3600000);
                  const { date: soldOutFullDate } = formatInTimezone(soldOutDate.toISOString(), evergreenTimezone);
                  return (
                    <div className="bg-white/[0.02] rounded-xl border border-white/10 opacity-50 overflow-hidden mt-5">
                      <div className="flex items-center gap-5 px-6 py-5">
                        <div className="flex-1">
                          <p className="text-lg md:text-xl font-bold text-neutral-500">{soldOutFullDate}</p>
                          <p className="text-base md:text-lg text-neutral-600 mt-1">
                            {formatInTimezone(soldOutDate.toISOString(), 'America/Los_Angeles').time} 美西 (PT) / {formatInTimezone(soldOutDate.toISOString(), 'America/New_York').time} 美东 (ET)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-6 py-3 bg-white/[0.02] border-t border-white/5">
                        <p className="text-sm md:text-base text-neutral-500">已有 <span className="text-neutral-400 font-semibold">80</span> 人报名</p>
                        <span className="text-sm md:text-base font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded">已额满</span>
                      </div>
                    </div>
                  );
                })()}
              </React.Fragment>
              );
            })}
            {/* 展開更多場次 — 手機預設收起 */}
            {!showAllSlots && evergreenSlots.length > 2 && (
              <button
                onClick={() => setShowAllSlots(true)}
                className="w-full py-4 text-base font-medium text-neutral-300 hover:text-[#C9A962] transition-colors flex md:hidden items-center justify-center gap-2 bg-white/[0.03] rounded-xl border border-white/10 hover:border-[#C9A962]/30"
              >
                查看更多场次
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}

          </div>

        </div>
      </section>

      {/* ================================================================
          Section 8: FAQ — 常见问题
          ================================================================ */}
      <section id="faq" className="py-16 md:py-24 px-6 lg:px-12 bg-[#0f0f0d]">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              常见问题
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <FAQAccordion items={FAQ_ITEMS} />
          </ScrollReveal>
        </div>
      </section>

      {/* ================================================================
          Section 9: URGENCY + FINAL CTA
          ================================================================ */}
      <section className="py-16 md:py-20 px-6 lg:px-12 bg-[#0a0a08] border-t border-[#C9A962]/30">
        <div className="max-w-2xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              未来最大的风险，<br className="md:hidden" />不是亏损，是你还没上车
            </h2>
            <p className="text-base text-neutral-400 mb-6 leading-relaxed max-w-lg mx-auto">
              AI 这波机会的窗口，现在才刚打开，你越早进来，复利滚的时间就越长。这堂体验课限时免费，听完你就知道第一步该怎么走。
            </p>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div className="hidden md:block">
              <button
                onClick={() => scrollToSchedule('footer')}
                className="group relative inline-block overflow-hidden px-12 py-4 text-lg font-semibold tracking-wide rounded-xl border border-[#C9A962] bg-gradient-to-r from-[#1a1508]/80 to-[#0f1a2e]/80 text-[#E8D5A3] hover:border-[#E8D5A3] hover:shadow-[0_0_20px_rgba(201,169,98,0.5),0_0_60px_rgba(201,169,98,0.2)] hover:scale-105 active:scale-95 transition-all duration-500 cursor-pointer"
              >
                <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[ctaShimmer_1.5s_ease-in-out_infinite]" />
                </span>
                <span className="relative z-10">免费报名，观看体验课</span>
              </button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <p className="text-sm md:text-base text-neutral-500 mt-8 leading-relaxed max-w-xl mx-auto">
              {(webinar.disclaimerText || '本次体验课内容仅为知识分享与经验探讨，不构成任何形式的投资建议、理财推荐或收益保证。所有提及的策略、工具及案例均为 Mike 个人投资经验分享。').replace(/讲座/g, '体验课')}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ================================================================
          Footer
          ================================================================ */}
      <footer className="py-12 px-6 bg-[#060606] border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          {/* Logo + Brand */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Image src="/icon.png" alt="Mike是麦克" width={36} height={36} className="rounded-lg" />
              <span className="text-base font-semibold text-[#E8D5A3]" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                Mike是麦克
              </span>
            </div>
          </div>

          {/* 社群链接 */}
          <div className="flex items-center justify-center gap-5 mb-8">
            <a href="https://www.youtube.com/@mike1111" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('youtube', 'footer')} className="text-neutral-600 hover:text-[#FF0000] transition-colors" aria-label="YouTube">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="https://apps.apple.com/tw/app/mike%E6%98%AF%E9%BA%A5%E5%85%8B/id6738429943" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('app_ios', 'footer')} className="text-neutral-600 hover:text-[#C9A962] transition-colors" aria-label="iOS App">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.jingliang.productionline.mikeismike2&hl=zh_TW" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('app_android', 'footer')} className="text-neutral-600 hover:text-[#4ade80] transition-colors" aria-label="Android App">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.523 2.27l1.443-2.5a.3.3 0 00-.118-.405.3.3 0 00-.41.108L16.95 2.04C15.55 1.4 14.01 1.04 12.38 1.04c-1.63 0-3.17.36-4.57 1l-1.49-2.57a.3.3 0 00-.41-.108.3.3 0 00-.118.405l1.443 2.5C4.26 3.84 2.19 6.89 2.01 10.5h20.74c-.18-3.61-2.25-6.66-5.227-8.23zM8.5 7.5a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2zM2 11.5v8a2 2 0 002 2h1v3a1.5 1.5 0 003 0v-3h4v3a1.5 1.5 0 003 0v-3h1a2 2 0 002-2v-8H2z"/>
              </svg>
            </a>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-white/[0.06] pt-6">
            <p className="text-xs text-neutral-700 text-center">&copy; {new Date().getFullYear()} {webinar.speakerName}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ================================================================
          Sticky Mobile CTA — 手机版底部常驻按钮
          ================================================================ */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#1a1815] border-t border-[#C9A962]/40 shadow-[0_-4px_20px_rgba(0,0,0,0.6)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] transition-all duration-300 ${showStickyBar ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        {/* Scarcity 指標 */}
        {(() => {
          const firstSlot = evergreenSlots[0];
          const seats = firstSlot ? slotSeats[firstSlot.slotTime] : null;
          return seats ? (
            <p className="text-xs text-red-400 flex items-center justify-center gap-1.5 mb-2">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              仅剩 <span className="font-bold text-red-300">{seats}</span> 个免费名额
            </p>
          ) : null;
        })()}
        {/* CTA 按鈕 — 發光 + shimmer */}
        <button
          onClick={() => scrollToSchedule('sticky')}
          className="w-full relative overflow-hidden bg-[#B8953F] text-white py-3.5 text-base font-bold rounded-lg shadow-[0_0_20px_rgba(184,149,63,0.5)] hover:shadow-[0_0_30px_rgba(184,149,63,0.7)] hover:bg-[#A6842F] transition-all"
        >
          <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[ctaShimmer_3s_ease-in-out_infinite]" />
          </span>
          <span className="relative z-10">限时免费 · 立即报名 →</span>
        </button>
      </div>

      {/* ================================================================
          Floating CTA + Back to Top — 桌面版右下角常驻
          ================================================================ */}
      <div className="fixed bottom-6 right-6 z-50 hidden md:flex flex-col items-end gap-3">
        {/* 返回顶部 */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/10 hover:border-[#C9A962]/50 hover:bg-white/[0.15] transition-all duration-300 flex items-center justify-center cursor-pointer"
          aria-label="返回顶部"
        >
          <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {/* 浮动 CTA */}
        <button
          onClick={() => scrollToSchedule('floating')}
          className="group flex items-center gap-2 px-5 py-3 rounded-full bg-[#B8953F] text-white font-semibold shadow-[0_4px_20px_rgba(184,149,63,0.4)] hover:shadow-[0_4px_30px_rgba(184,149,63,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          立即免费报名
        </button>
      </div>

      {/* Bottom padding on mobile for sticky CTA */}
      <div className="h-16 md:hidden" />

      {/* ================================================================
          Registration Modal
          ================================================================ */}
      <RegistrationModalV2
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        name={form.name}
        onNameChange={form.setName}
        email={form.email}
        onEmailChange={form.setEmail}
        phone={form.phone}
        onPhoneChange={form.setPhone}
        onSubmit={form.handleSubmit}
        submitting={form.submitting}
        formError={form.formError}
        evergreenSlots={evergreenSlots}
        selectedSlotTime={selectedSlotTime}
        onSlotTimeChange={setSelectedSlotTime}
        timezone={evergreenTimezone}
        hideSlotSelector={modalSource === 'schedule_card'}
        source={modalSource}
        remainingSeats={modalRemainingSeats}
        registeredCount={modalRemainingSeats !== undefined ? 80 - modalRemainingSeats : registeredCount}
        googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        onGoogleFilled={form.handleGoogleFilled}
        googleFillActive={form.googleFillActive}
        onResetGoogleFill={form.resetGoogleFill}
      />
    </div>
  );
}
