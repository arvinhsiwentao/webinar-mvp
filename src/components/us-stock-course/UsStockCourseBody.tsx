'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { trackGA4 } from '@/lib/analytics';
import ScrollReveal from '@/components/landing/ScrollReveal';
import FAQAccordion from '@/components/landing/FAQAccordion';
import StickyNav from '@/components/landing/StickyNav';
import PromoCountdown from '@/components/us-stock-course/PromoCountdown';
import IntroVideoPlayer from '@/components/us-stock-course/IntroVideoPlayer';
import { ANGLE_CONFIG, TRAILERS, type UsStockAngle } from '@/lib/usStockCourse';

const WHATSAPP_CS_URL = 'https://wa.me/886917642752?text=' + encodeURIComponent('你好，我想咨询 US$1 美股入门课');
const WA_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';

const NAV_ITEMS = [
  { id: 'top', label: '首页' },
  { id: 'framework', label: '课程目标' },
  { id: 'speaker', label: '讲师介绍' },
  { id: 'chapters', label: '课程介绍&试看' },
  { id: 'app', label: 'App 功能介绍' },
  { id: 'steps', label: '如何开始' },
  { id: 'faq', label: '常见问题' },
];

const PAIN_POINTS = [
  { text: '想靠美股累积资产，但每天看新闻、网路资讯，越看越乱', img: '/images/us-stock/pain-1-r2.webp' },
  { text: '行情震荡（战争、IPO、AI）时，都不知道该不该动', img: '/images/us-stock/pain-2-r2.webp' },
  { text: 'AI 概念股几百支，自己研究太花时间，总是错过行情', img: '/images/us-stock/pain-3-r2.webp' },
];

const REVIEWS = [
  { src: '/images/us-stock/review-1-r2.webp', w: 720, h: 470, alt: '学员好评：入手 Oracle 赚回三年订阅费' },
  { src: '/images/us-stock/review-2-r2.webp', w: 720, h: 626, alt: '学员好评：分批加仓，现在 40–50% 利润' },
  { src: '/images/us-stock/review-3-r2.webp', w: 720, h: 649, alt: '学员好评：跟着 Mike 领路入场美股' },
  { src: '/images/us-stock/review-4-r2.webp', w: 720, h: 1149, alt: '学员好评：建立长线投资纪律，心态更安定' },
];

const FRAMEWORK = [
  { num: '1', title: '看大盘', desc: '先看清市场风向，掌握现在该不该出手' },
  { num: '2', title: '筛板块', desc: '再分辨哪些板块站在风口、钱正往哪流' },
  { num: '3', title: '挑个股', desc: '接着从板块里挑出真正值得押的几支股' },
  { num: '4', title: '找买点', desc: '最后判断估值与时机，不被情绪牵着走' },
];

const CHAPTERS = [
  ['Ch1', '投资逻辑总纲', '4 步骤选股法，建立完整投资框架'],
  ['Ch2', '大盘节奏判读', '每天 30 秒看清市场风向'],
  ['Ch3', '12 板块框架', '以 AI 为中心分辨哪些板块站在风口'],
  ['Ch4', '板块交集打分系统', '从 12 板块筛出值得押的个股'],
  ['Ch5', '个股实战分析 — NVDA 为例', '学会判断估值与时机，找到个股买点'],
  ['Ch6', '6 种选股策略', '不同情境使用不同策略，灵活应对行情'],
  ['Ch7', '即时市场动态', '掌握近期最热门话题，市场动态不漏接'],
  ['Ch8', '更多学习资源', '专属深度文章、影音，历史内容随时可查'],
  ['Ch9', '30 天日常', '4 个具体动作把课程学到的串成日常习惯'],
];

const VIP_TABLE: [string, string, string][] = [
  ['视频 / 语音直播', '畅看所有直播 + 回放 + 精华', '不定时开放'],
  ['VIP 社团回放', 'Mike 买卖 0 秒通知', '×'],
  ['专属群互动', '与 Mike 即时互动', '×'],
  ['麦克精选', '✓', '每日 3 档'],
  ['麦克投资日志', '✓', '×'],
  ['投票预测准率', '每日无限查看', '×'],
  ['定存定投预测', '✓', '×'],
  ['ETF 热门清单', '✓', '×'],
  ['独家视频 / 文章', '周周送', '×'],
];

const REPLAYS = [
  'SpaceX 史上最大 IPO × 2026 下半年展望与布局',
  '哪些是下个高成长赚钱赛道？Mike 2026 选股清单大公开',
  '战争恐慌下我如何 5 单 Sell Put 隔天全赚 × 最新机会全拆解',
];

const STEPS = [
  ['1', '购买课程', '点击立即购买，使用信用卡 Stripe 结帐、全程安全加密，支援 Apple Pay / Google Pay'],
  ['2', 'Email 收信', '确认信件中有收到课程、App 3 天 VIP 权限兑换序号'],
  ['3', '注册 / 登入会员', '进入线上课程平台，注册 / 登入帐号兑换课程、App VIP 序号'],
  ['4', '下载 Mike是麦克 App', '透过下方 QRCode / 链接下载，或在 App 商店搜「Mike 是麦克」'],
  ['5', '登入 App、搭配课程体验 VIP 功能', 'App 搭配课程，让你投资更上手'],
];

const FAQ_ITEMS = [
  { question: '我是投资新手，能跟得上吗？', answer: '9 章课程从零开始一步一步带你建立完整框架。学员里很多都是从零开始的，跟着 9 章走完、搭配 App 工具操作 3 天，你会有自己的判断起点。' },
  { question: 'App VIP 权限到期后会自动扣款吗？', answer: '不会自动扣款。3 天到期 App 自动降回免费版，你的卡不会被再扣任何钱，喜欢再升级。' },
  { question: '3 天期间能用全部 VIP 功能吗？还是有限制？', answer: '完整 VIP 功能全开放、没有任何限制。' },
  { question: '北美 / 海外信用卡能结账吗？安全吗？', answer: '可以，跨境支付走 Stripe，跟北美主流网站一样安全，支援 Apple Pay / Google Pay。' },
];

export default function UsStockCourseBody({ angle }: { angle: UsStockAngle }) {
  const router = useRouter();
  const cfg = ANGLE_CONFIG[angle];

  const goCheckout = (position: string) => {
    trackGA4('c_us_stock_course_cta_click', { angle, position });
    router.push(`/us-stock-course/checkout?angle=${angle}`);
  };

  const trackExternalLink = (linkType: string, linkPosition: string) => {
    trackGA4('c_external_link_click', { link_type: linkType, link_position: linkPosition });
  };

  const trackVideoPlay = (videoId: string, videoLabel: string) => {
    trackGA4('c_us_stock_course_video_play', { angle, video_id: videoId, video_label: videoLabel });
  };

  const trackCsClick = (position: string) => {
    trackGA4('c_us_stock_course_cs_click', { angle, position });
  };

  // Hide the mobile sticky CTA whenever an inline CTA (hero or final) is on screen —
  // avoids showing two CTAs at once.
  const heroCtaRef = useRef<HTMLButtonElement>(null);
  const finalCtaRef = useRef<HTMLButtonElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);

  // Scroll-depth tracking + sticky/scroll-cue visibility (computed from live geometry)
  useEffect(() => {
    const milestones = new Set<number>();
    const inView = (el: HTMLElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };
    const handleScroll = () => {
      setScrolledDown(window.scrollY > 30);
      // Hide the mobile sticky CTA whenever the hero or final CTA is on screen
      setShowSticky(!inView(heroCtaRef.current) && !inView(finalCtaRef.current));
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const scrollPct = Math.round((window.scrollY / scrollHeight) * 100);
      for (const m of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
        if (scrollPct >= m && !milestones.has(m)) {
          milestones.add(m);
          trackGA4('c_scroll_depth', { percent: m, page: `us_stock_course_${angle}` });
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initialize on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, [angle]);

  return (
    <div className="min-h-screen bg-[#0a0a08] text-neutral-200">
      <StickyNav onCtaClick={() => goCheckout('nav')} logoSrc="/icon.png" navItems={NAV_ITEMS} rightSlot={<PromoCountdown />} />
      <div className="h-14" />

      {/* ===== Hero ===== */}
      <section className="px-6 lg:px-12 pt-6 pb-9 md:pt-4 md:pb-20 min-h-[calc(100svh-3.5rem)] flex flex-col md:block md:min-h-0 bg-gradient-to-b from-[#0a0a08] to-[#0f0f0d]">
        {/* Content sits compact at the top; a scroll cue is pinned at the bottom on mobile */}
        <div className="max-w-3xl mx-auto text-center w-full">
          <ScrollReveal>
            {/* Biggest line — the offer (shared across all angles) */}
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              <span className="text-[#C9A962]">US$1</span> 美股入门课
            </h1>
            {/* Angle-specific headline + sub */}
            <p className="text-lg md:text-3xl font-bold text-neutral-100 leading-snug mt-2 md:mt-3">{cfg.heroHeadline}</p>
            {cfg.heroSub && <p className="text-base md:text-lg text-neutral-400 mt-1.5">{cfg.heroSub}</p>}
            {/* Course meta (shared across angles) — bonus lives at the CTA, not here */}
            <p className="text-lg md:text-xl font-semibold text-[#C9A962] tracking-wide mt-2">
              9 章节 <span className="text-[#C9A962]/40 mx-0.5">|</span> 40 分钟
            </p>
          </ScrollReveal>

          <ScrollReveal delay={120}>
            {/* Prompt label above the frame, arrow inline (right) pointing down at the video */}
            <div className="mt-8 md:mt-9 mb-3 flex items-center justify-center gap-2">
              <p className="text-[#E8D5A3] text-sm md:text-base font-medium tracking-wide">⏱ 1 分钟，先听听 Mike 怎么说</p>
              <svg className="w-5 h-5 text-[#C9A962] animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-[#C9A962]/25 shadow-[0_0_40px_rgba(201,169,98,0.12)] aspect-video bg-black mb-4 max-w-[46rem] mx-auto">
              <IntroVideoPlayer src={cfg.introVideoHls} poster={cfg.poster} onPlay={() => trackVideoPlay('hero', 'hero_intro')} />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <p className="text-sm md:text-base text-neutral-400 leading-relaxed max-w-xl mx-auto mt-2 mb-7">{cfg.hookCopy}</p>
            <button
              ref={heroCtaRef}
              onClick={() => goCheckout('hero')}
              className="group relative overflow-hidden px-9 py-3.5 text-lg md:px-12 md:py-5 md:text-xl rounded-2xl bg-[#B8953F] text-white font-bold tracking-widest cursor-pointer transition-all duration-500 shadow-[0_0_20px_rgba(184,149,63,0.5)] hover:bg-[#A6842F] hover:scale-105 active:scale-95"
            >
              <span className="relative z-10">US$1 立即购买 →</span>
            </button>
            <p className="mt-6 md:mt-5 text-base md:text-lg text-[#C9A962]">9 章课程永久持有 ＋ 🎁 送 3 天 App VIP</p>
          </ScrollReveal>
        </div>

        {/* Mobile-only scroll cue — sits just below the content, fades out once scrolling starts */}
        <button
          type="button"
          onClick={() => document.getElementById('pain')?.scrollIntoView({ behavior: 'smooth' })}
          className={`mt-auto mx-auto md:hidden flex flex-col items-center gap-1 pt-6 text-neutral-500 cursor-pointer transition-opacity duration-300 ${scrolledDown ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          aria-label="向下滑看更多"
        >
          <span className="text-xs tracking-wide">下滑看更多</span>
          <svg className="w-5 h-5 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12l-7 7-7-7" />
          </svg>
        </button>
      </section>

      {/* ===== Pain points — original text + cropped illustration on the right ===== */}
      <section id="pain" className="py-16 md:py-24 px-6 lg:px-12 bg-[#0f0f0d] border-t border-[#C9A962]/12">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>你是不是也常常这样？</h2>
          </ScrollReveal>
          <div className="space-y-4">
            {PAIN_POINTS.map((p, idx) => (
              <ScrollReveal key={idx} delay={idx * 100}>
                <div className="flex items-stretch gap-4 bg-white/[0.04] rounded-2xl border border-[#C9A962]/20 overflow-hidden">
                  <p className="flex-1 text-base md:text-xl text-neutral-200 leading-relaxed self-center pl-5 py-4">{p.text}</p>
                  <Image src={p.img} alt="" width={360} height={360} className="w-24 h-24 md:w-32 md:h-32 object-cover flex-shrink-0" />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 4-step framework ===== */}
      <section id="framework" className="py-16 md:py-24 px-6 lg:px-12 bg-[#111318]">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center leading-snug" style={{ fontFamily: '"Noto Serif SC", serif' }}>课程带你建立<br />投资 4 步骤框架</h2>
            <p className="text-neutral-400 text-center mb-12 text-sm md:text-base">从「为什么要行动」到「具体怎么做」</p>
          </ScrollReveal>
          <div className="max-w-sm mx-auto">
            {FRAMEWORK.map((item, idx) => (
              <ScrollReveal key={item.num} delay={idx * 80} className="w-full">
                <div className="text-center bg-white/[0.04] rounded-xl px-6 py-6 border border-[#C9A962]/20">
                  <div className="w-10 h-10 md:w-12 md:h-12 mx-auto rounded-full bg-[#C9A962]/15 border border-[#C9A962]/40 flex items-center justify-center text-[#C9A962] font-bold mb-3">{item.num}</div>
                  <h3 className="text-xl md:text-2xl font-bold text-neutral-100 mb-1.5">{item.title}</h3>
                  <p className="text-base md:text-lg text-neutral-400 leading-relaxed">{item.desc}</p>
                </div>
                {idx < FRAMEWORK.length - 1 && (
                  <div className="flex justify-center py-3">
                    <svg className="w-6 h-6 text-[#C9A962]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M19 12l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Testimonials — text heading + 4 cropped review cards, each with a glow ===== */}
      <section id="testimonials" className="py-16 md:py-24 px-6 lg:px-12 bg-[#0f0f0d]">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>学员好评</h2>
            <p className="text-neutral-400 text-center mb-10 text-sm md:text-base">真实学员，真实回馈</p>
          </ScrollReveal>
          <div className="columns-1 md:columns-2 gap-5">
            {REVIEWS.map((r) => (
              <div key={r.src} className="break-inside-avoid mb-5">
                <div className="rounded-2xl shadow-[0_0_30px_rgba(201,169,98,0.16)]">
                  <Image src={r.src} alt={r.alt} width={r.w} height={r.h} className="w-full h-auto rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Speaker — ported from the production / landing ===== */}
      <section id="speaker" className="py-16 md:py-24 px-6 lg:px-12 bg-[#111318]">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
              {/* Avatar — 放大 + 金色光环动画 */}
              <div className="flex-shrink-0 relative">
                <div className="absolute -inset-3 rounded-full border border-[#C9A962]/20 md:animate-[speakerRingSpin_12s_linear_infinite]" />
                <div className="absolute -inset-6 rounded-full border border-[#C9A962]/10 md:animate-[speakerRingSpin_20s_linear_infinite_reverse]" />
                <div className="absolute -inset-4 rounded-full bg-[#C9A962]/5 blur-xl" />
                <div className="relative w-36 h-36 md:w-64 md:h-64 rounded-full overflow-hidden border-2 border-[#C9A962]/40 shadow-[0_0_30px_rgba(201,169,98,0.2)]">
                  <Image src="/images/mike-profile.jpg" alt="Mike是麦克" width={256} height={256} className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Story-based bio */}
              <div className="text-center md:text-left flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                  Mike是麦克
                </h2>
                <p className="text-sm text-[#C9A962] font-medium mb-5">美股投资人 / YouTube 创作者</p>

                <div className="space-y-4 text-base md:text-lg text-neutral-400 leading-relaxed">
                  <p>
                    著有投资畅销书《人生重启》，曾受邀电视财经节目分享投资策略，
                    并与台湾最大财经平台 CMoney 合作推出投资工具。
                  </p>
                  <p className="font-medium text-neutral-200">
                    这堂课，Mike 会把这套花了十几年验证的完整框架，毫无保留地讲给你听。
                  </p>
                </div>

                {/* 第三方背书标签 */}
                <div className="mt-5 hidden md:flex flex-wrap items-center gap-2 justify-center md:justify-start">
                  <a href="https://www.amazon.in/%E4%BA%BA%E7%94%9F%E9%87%8D%E5%95%9F%EF%BC%9A%E7%A7%BB%E6%B0%91%E7%BE%8E%E5%9C%8B%E8%B7%A8%E8%B6%8A%E8%B2%A1%E5%AF%8C%E9%AB%98%E7%89%86%EF%BC%8C%E5%BE%9E%E6%99%AE%E9%80%9A%E4%BA%BA%E5%88%B0%E4%B8%80%E5%80%8B%E6%9C%89%E9%8C%A2%E7%9A%84%E6%99%AE%E9%80%9A%E4%BA%BA-Traditional-Chinese-Mike-ebook/dp/B0FQRN9YKD" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('book', 'speaker_badge')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-neutral-400 hover:border-[#C9A962]/40 hover:text-neutral-300 transition-all">
                    <svg className="w-3.5 h-3.5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    畅销书《人生重启》作者
                  </a>
                  <a href="https://www.youtube.com/watch?v=cWsTo3Vp-Wc" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('tvbs', 'speaker_badge')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-neutral-400 hover:border-[#C9A962]/40 hover:text-neutral-300 transition-all">
                    <svg className="w-3.5 h-3.5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    TVBS 财经节目受邀嘉宾
                  </a>
                  <a href="https://www.cmoney.tw/app/ItemContent.aspx?id=6643" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('cmoney', 'speaker_badge')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-neutral-400 hover:border-[#C9A962]/40 hover:text-neutral-300 transition-all">
                    <svg className="w-3.5 h-3.5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
                <a href="https://www.youtube.com/@mike1111" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('youtube', 'speaker_card')} className="group/card flex flex-col items-center justify-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#C9A962]/40 hover:bg-white/[0.07] p-5 transition-all duration-300 text-center">
                  <svg className="w-12 h-12 text-[#FF0000]" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  <div>
                    <p className="text-sm font-semibold text-neutral-200 group-hover/card:text-white transition-colors">YouTube</p>
                    <p className="text-xs text-neutral-500 mt-0.5">20万+ 订阅</p>
                  </div>
                </a>
                <a href="https://www.amazon.in/%E4%BA%BA%E7%94%9F%E9%87%8D%E5%95%9F%EF%BC%9A%E7%A7%BB%E6%B0%91%E7%BE%8E%E5%9C%8B%E8%B7%A8%E8%B6%8A%E8%B2%A1%E5%AF%8C%E9%AB%98%E7%89%86%EF%BC%8C%E5%BE%9E%E6%99%AE%E9%80%9A%E4%BA%BA%E5%88%B0%E4%B8%80%E5%80%8B%E6%9C%89%E9%8C%A2%E7%9A%84%E6%99%AE%E9%80%9A%E4%BA%BA-Traditional-Chinese-Mike-ebook/dp/B0FQRN9YKD" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('book', 'speaker_card')} className="group/card flex flex-col items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#C9A962]/40 hover:bg-white/[0.07] p-5 transition-all duration-300 text-center">
                  <div className="w-16 h-22 rounded overflow-hidden shadow-lg">
                    <Image src="/images/book-cover.jpg" alt="《人生重启》" width={64} height={88} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-200 group-hover/card:text-white transition-colors">《人生重启》</p>
                    <p className="text-xs text-neutral-500 mt-0.5">投资畅销书</p>
                  </div>
                </a>
                <a href="https://www.youtube.com/watch?v=cWsTo3Vp-Wc" target="_blank" rel="noopener noreferrer" onClick={() => trackExternalLink('tvbs', 'speaker_card')} className="group/card flex flex-col items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#C9A962]/40 hover:bg-white/[0.07] p-5 transition-all duration-300 text-center">
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
                      <Image src={photo.src} alt={photo.alt} width={320} height={192} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 9 chapters ===== */}
      <section id="chapters" className="py-16 md:py-24 px-6 lg:px-12 bg-[#0f0f0d]">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>9 章课程介绍</h2>
            <p className="text-neutral-400 text-center mb-12 text-sm md:text-base leading-relaxed">手把手带你建立投资框架<br />零基础也能上手</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CHAPTERS.map(([no, title, desc], idx) => (
              <ScrollReveal key={no} delay={(idx % 3) * 80}>
                <div className="bg-white/[0.04] rounded-lg border border-[#C9A962]/20 p-6 h-full">
                  <span className="text-base font-bold text-[#C9A962]">{no}</span>
                  <h3 className="text-xl font-bold text-neutral-100 mt-1.5 mb-2">{title}</h3>
                  <p className="text-base text-neutral-400 leading-relaxed">{desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* 免费试看 — Ch0 + Ch1 trailers */}
          <div className="mt-16">
            <ScrollReveal>
              <h3 className="text-xl md:text-2xl font-bold text-white text-center mb-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>先免费试看</h3>
              <p className="text-neutral-400 text-center mb-8 text-sm md:text-base">序章 + 第 1 章完整开放，先看再决定</p>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {TRAILERS.map((t) => (
                <ScrollReveal key={t.label}>
                  <div className="relative rounded-2xl overflow-hidden border border-[#C9A962]/25 shadow-[0_0_30px_rgba(201,169,98,0.1)] aspect-video bg-black">
                    <IntroVideoPlayer src={t.hls} poster={t.poster} lazy onPlay={() => trackVideoPlay(`trailer_${t.label.toLowerCase()}`, t.title)} />
                  </div>
                  <p className="text-center mt-3 text-base text-neutral-300">
                    <span className="text-[#C9A962] font-bold">{t.label}</span>
                    <span className="text-neutral-500 mx-1.5">|</span>
                    {t.title}
                  </p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== App VIP comparison ===== */}
      <section id="app" className="py-16 md:py-24 px-6 lg:px-12 bg-[#111318]">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>App VIP 功能一览</h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            {/* Mobile: per-feature cards (the 3-col table is too cramped at phone width) */}
            <div className="md:hidden space-y-3">
              {VIP_TABLE.map(([feat, pro, free]) => (
                <div key={feat} className="bg-white/[0.04] border border-[#C9A962]/20 rounded-xl px-4 py-4">
                  <p className="text-lg font-bold text-neutral-100 mb-3 text-center">{feat}</p>
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-lg bg-[#C9A962]/10 border border-[#C9A962]/20 px-3 py-2.5">
                      <p className="text-xs text-[#E8D5A3] mb-1">专业版</p>
                      <p className="text-base text-[#C9A962] leading-snug">{pro}</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-white/[0.02] border border-white/10 px-3 py-2.5">
                      <p className="text-xs text-neutral-500 mb-1">免费版</p>
                      <p className="text-base text-neutral-500 leading-snug">{free}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: comparison table */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-[#C9A962]/20">
              <table className="w-full text-lg">
                <thead>
                  <tr className="bg-[#C9A962]/10 text-[#E8D5A3]">
                    <th className="text-left px-4 py-3.5 font-semibold">功能</th>
                    <th className="text-center px-3 py-3.5 font-semibold">专业版</th>
                    <th className="text-center px-3 py-3.5 font-semibold text-neutral-500">免费版</th>
                  </tr>
                </thead>
                <tbody>
                  {VIP_TABLE.map(([feat, pro, free], idx) => (
                    <tr key={feat} className={idx % 2 ? 'bg-white/[0.02]' : ''}>
                      <td className="px-4 py-3.5 text-neutral-300">{feat}</td>
                      <td className="px-3 py-3.5 text-center text-[#C9A962]">{pro}</td>
                      <td className="px-3 py-3.5 text-center text-neutral-500">{free}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-center text-sm text-neutral-500 mt-4 leading-relaxed">3 天到期自动降回免费版<br />不自动扣款</p>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== Live replays ===== */}
      <section className="py-16 md:py-24 px-6 lg:px-12 bg-[#0f0f0d]">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center leading-snug" style={{ fontFamily: '"Noto Serif SC", serif' }}>满满干货的直播回放<br />在 App 内等你来看</h2>
            <p className="text-neutral-400 text-center mb-10 text-sm md:text-base">过去所有付费直播，3 天 VIP 内全部解锁</p>
          </ScrollReveal>
          <div className="space-y-3">
            {REPLAYS.map((title, idx) => (
              <ScrollReveal key={idx} delay={idx * 80}>
                <div className="flex items-center gap-4 bg-white/[0.04] rounded-lg px-5 py-4 border border-[#C9A962]/20">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#C9A962]/10 flex items-center justify-center text-[#C9A962] text-xs font-bold">{String(idx + 1).padStart(2, '0')}</span>
                  <p className="text-base md:text-lg text-neutral-300">{title}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 5-step onboarding ===== */}
      <section id="steps" className="py-16 md:py-24 px-6 lg:px-12 bg-[#111318]">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-12 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>如何开始？5 个步骤上手</h2>
          </ScrollReveal>
          <div className="relative">
            <div className="absolute left-5 md:left-6 top-0 bottom-6 w-px bg-[#C9A962]/30" />
            <div className="space-y-6">
              {STEPS.map(([no, title, desc]) => (
                <ScrollReveal key={no} delay={Number(no) * 60}>
                  <div className="flex gap-5 md:gap-7 relative">
                    <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#0f0f0d] border border-[#C9A962]/40 flex items-center justify-center z-10">
                      <span className="text-sm md:text-base font-bold text-[#C9A962]">{no}</span>
                    </div>
                    <div className="pt-1 pb-2 flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-neutral-200 mb-1">{title}</h3>
                      <p className="text-base md:text-lg text-neutral-400 leading-relaxed">{desc}</p>
                      {no === '4' && (
                        <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 bg-white/[0.03] border border-[#C9A962]/20 rounded-xl p-4 w-fit">
                          <div className="w-28 h-28 rounded-lg overflow-hidden bg-white p-1 flex-shrink-0">
                            <Image src={cfg.qr} alt="下载 Mike是麦克 App QRCode" width={400} height={400} className="w-full h-full object-contain" />
                          </div>
                          <div className="text-center sm:text-left">
                            <p className="text-xs text-neutral-400 mb-2">扫描 QRCode 下载，或</p>
                            <a
                              href={cfg.appUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackExternalLink('app_download', `steps_${angle}`)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#B8953F] text-white text-sm font-semibold hover:bg-[#A6842F] transition-colors"
                            >
                              点此下载 App →
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-16 md:py-24 px-6 lg:px-12 bg-[#0f0f0d]">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>常见问题</h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <FAQAccordion items={FAQ_ITEMS} />
          </ScrollReveal>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="py-16 md:py-20 px-6 lg:px-12 bg-[#0a0a08] border-t border-[#C9A962]/30">
        <div className="max-w-2xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: '"Noto Serif SC", serif' }}>$1 开始，给自己一张投资地图</h2>
            <p className="text-base text-neutral-400 mb-8 leading-relaxed max-w-lg mx-auto">9 章课程永久持有 + 赠送 3 天 App VIP 权限</p>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <button
              ref={finalCtaRef}
              onClick={() => goCheckout('footer')}
              className="px-12 py-5 rounded-2xl bg-[#B8953F] text-white text-xl font-bold tracking-widest cursor-pointer transition-all duration-500 shadow-[0_0_20px_rgba(184,149,63,0.5)] hover:bg-[#A6842F] hover:scale-105 active:scale-95"
            >
              US$1 立即购买 →
            </button>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="py-10 px-6 bg-[#060606] border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image src="/icon.png" alt="Mike是麦克" width={32} height={32} className="rounded-lg" />
            <span className="text-base font-semibold text-[#E8D5A3]" style={{ fontFamily: '"Noto Serif SC", serif' }}>Mike是麦克</span>
          </div>
          <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed mb-4">
            本课程内容仅为知识分享与经验探讨，不构成任何投资建议或收益保证。
          </p>
          <p className="text-xs text-neutral-700">&copy; {new Date().getFullYear()} Mike是麦克. All rights reserved.</p>
        </div>
      </footer>

      {/* ===== Sticky mobile CTA — hidden while an inline CTA is on screen ===== */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a08]/95 backdrop-blur-sm border-t border-[#C9A962]/20 px-4 py-3 transition-transform duration-300 ${showSticky ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <button
          onClick={() => goCheckout('sticky')}
          className="w-full bg-[#B8953F] text-white py-3 rounded-lg hover:bg-[#A6842F] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5"
        >
          <span className="text-xs text-white/70">原价 <span className="line-through">US$49</span></span>
          <span className="text-xl font-extrabold leading-none">US$1</span>
          <span className="text-base font-bold">立即购买 →</span>
        </button>
      </div>

      {/* ===== Desktop floating offer card — price + buy + CS, unified width ===== */}
      <div className="hidden md:flex fixed right-5 bottom-8 z-50 flex-col gap-2.5 w-44 bg-[#1a1508]/80 backdrop-blur-md border border-[#C9A962]/40 rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.55),0_0_24px_rgba(201,169,98,0.12)]">
        <div className="text-center">
          <p className="text-xs text-neutral-400">原价 <span className="line-through">US$49</span></p>
          <p className="text-xl font-bold text-[#ef4444] leading-tight">限时特价 US$1</p>
          <p className="text-[11px] text-[#E8D5A3] mt-1.5 pt-1.5 border-t border-[#C9A962]/20">🎁 赠送 App 3 天 VIP 权限</p>
        </div>
        <button
          onClick={() => goCheckout('floating')}
          className="w-full bg-[#B8953F] text-white py-2.5 rounded-lg text-sm font-bold hover:bg-[#A6842F] transition-colors"
        >
          立即购买 →
        </button>
        <a
          href={WHATSAPP_CS_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackCsClick('floating')}
          className="w-full flex items-center justify-center gap-1.5 bg-[#25D366] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#20BD5A] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d={WA_PATH} /></svg>
          咨询客服
        </a>
      </div>

      {/* ===== Mobile floating WhatsApp CS — appears on scroll, won't block the first screen ===== */}
      <a
        href={WHATSAPP_CS_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackCsClick('floating_mobile')}
        aria-label="WhatsApp 咨询客服"
        className={`md:hidden fixed right-4 bottom-24 z-50 ${scrolledDown ? 'flex' : 'hidden'} items-center justify-center w-[52px] h-[52px] rounded-full bg-[#25D366] text-white shadow-[0_4px_20px_rgba(37,211,102,0.5)] active:scale-95 transition-transform`}
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d={WA_PATH} /></svg>
      </a>
    </div>
  );
}
