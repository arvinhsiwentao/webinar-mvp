'use client';

import { useState } from 'react';
import Image from 'next/image';
import IntroVideoPlayer from '@/components/us-stock-course/IntroVideoPlayer';

const COURSE_LINK = 'https://www.cmoney.tw/course-media/17781/chapters?platform=5';
const APP_LINK = 'https://cmoneymike.onelink.me/ZEaW/hqq09hla';
// 序号开通页「直链」。理财宝官网手机版没有明显的启用序号入口，所以桌机 / 手机
// 都统一引导到这条直链：注册 / 登入后会自动回到序号页，填完序号再自动跳转。
const ACTIVATION_URL = 'https://www.cmoney.tw/app/serialactivestart.aspx';
const SUPPORT_EMAIL = 'cmoney_overseas@cmoney.com.tw';
const WHATSAPP_URL = 'https://wa.me/886917642752?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E5%92%A8%E8%AF%A2%E8%AF%BE%E7%A8%8B%E7%9B%B8%E5%85%B3%E9%97%AE%E9%A2%98';

const BASE = '/images/us-stock/tutorial';

type DeviceKey = 'computer' | 'phone';

type CompStep = { title: string; img: string; note?: string; warn?: string; tall?: boolean; cta?: boolean };
type CompSection = { eyebrow: string; title: string; appDownload?: boolean; steps: CompStep[] };

type Device = {
  key: DeviceKey;
  label: string;
  hint: string;
  /** Screen-recording tutorial video (Mux HLS). null → no video (computer). */
  videoUrl: string | null;
  videoPoster?: string;
  /** Portrait clip (phone screen recording) → taller container, no crop. */
  videoPortrait?: boolean;
  /** Phone: step screenshots with captions baked into each image (bare gallery). */
  shots?: { dir: string; count: number };
  /** Computer: production-style sections (caption + screenshot per step). */
  sections?: CompSection[];
  icon: React.ReactNode;
};

// Phone activation tutorial — Mux asset (portrait, 65.7s).
const PHONE_VIDEO = 'https://stream.mux.com/BuKIBZUumm2AT259pZvpew12TchqMU3Duvo6RWT8UxY.m3u8';
const PHONE_POSTER = 'https://image.mux.com/BuKIBZUumm2AT259pZvpew12TchqMU3Duvo6RWT8UxY/thumbnail.webp?time=1';

// Computer activation tutorial — two parts, mirroring the production page.
const COMPUTER_DIR = '/images/us-stock/tutorial/computer';
const COMPUTER_SECTIONS: CompSection[] = [
  {
    eyebrow: '第一部分',
    title: '如何兑换课程与 App VIP 权限？',
    steps: [
      {
        title: '进入台湾最大财经平台 CMoney 的「序号开通页」，点击右上角「登入 / 注册」',
        img: `${COMPUTER_DIR}/1.webp`,
        cta: true,
      },
      { title: '注册 / 登入 CMoney 帐号（可用第三方快速登入）', img: `${COMPUTER_DIR}/2.webp`, tall: true },
      {
        title: '依序输入确认邮件里的「课程启用序号」与「App 3 天 VIP 启用序号」，分别送出启用，看到「启用成功」即完成。',
        note: '两组序号都没有使用期限，App 3 天 VIP 权限可以等到想使用时再启用。',
        img: `${COMPUTER_DIR}/3.webp`,
      },
      { title: '点右上角头像，进入「会员中心」', img: `${COMPUTER_DIR}/4.webp` },
      { title: '在会员中心点「我的影音课程」，找到本课程', img: `${COMPUTER_DIR}/5.webp` },
      { title: '点击课程，进入播放页开始观看', img: `${COMPUTER_DIR}/6.webp` },
      { title: '完整 9 章单元列表，永久观看、随时回看', img: `${COMPUTER_DIR}/7.webp` },
    ],
  },
  {
    eyebrow: '第二部分',
    title: '如何下载 App、确认 App VIP 到期日？',
    appDownload: true,
    steps: [
      { title: '打开「Mike是麦克」App，进入登入页', img: `${COMPUTER_DIR}/8.webp`, tall: true },
      {
        title: '使用「在 CMoney 平台注册的帐号」登入 App；App VIP 权限是跟 CMoney 平台帐号绑定的',
        warn: '常见问题：登入到「不同的帐号」就会没有 VIP 权限！请务必用与网站相同的 CMoney 帐号登入 App。',
        img: `${COMPUTER_DIR}/9.webp`,
        tall: true,
      },
      {
        title: '在「更多」页确认权限为「专业版」、3 天 VIP 已生效；确认启用成功后，尽情体验 App 所有 VIP 功能！',
        img: `${COMPUTER_DIR}/10.webp`,
        tall: true,
      },
    ],
  },
];

const DesktopIcon = (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const PhoneIcon = (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2.5" /><line x1="12" y1="18" x2="12" y2="18" />
  </svg>
);

const DEVICES: Device[] = [
  { key: 'computer', label: '电脑', hint: '桌机 / 笔电 / 平板', videoUrl: null, sections: COMPUTER_SECTIONS, icon: DesktopIcon },
  {
    key: 'phone',
    label: '手机',
    hint: '用手机启用',
    videoUrl: PHONE_VIDEO,
    videoPoster: PHONE_POSTER,
    videoPortrait: true,
    shots: { dir: '/images/us-stock/tutorial/phone', count: 19 },
    icon: PhoneIcon,
  },
];

/* ─────────────────────────  Device picker (start screen)  ───────────────────────── */

function DeviceSelect({ onPick }: { onPick: (key: DeviceKey) => void }) {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-700 flex flex-col">
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-14 md:py-20 flex flex-col justify-center">
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 text-center mb-3 leading-tight" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          US$1 美股入门课<br />启用教学
        </h1>
        <p className="text-neutral-500 text-center mb-10 text-base md:text-lg">
          先选择你现在使用的装置，我们会带你一步步完成启用
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              onClick={() => onPick(d.key)}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-white border border-[#E8E5DE] shadow-sm px-6 py-8 md:py-10 transition-all hover:border-[#B8953F] hover:shadow-md active:scale-[0.99]"
            >
              <span className="text-[#B8953F] transition-transform group-hover:scale-110">{d.icon}</span>
              <span className="text-xl md:text-2xl font-bold text-neutral-900">{d.label}</span>
              <span className="text-sm md:text-base text-neutral-500">{d.hint}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#B8953F]">
                选择此装置 →
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────  Per-device tutorial  ───────────────────────── */

function BackBar({ onBack, deviceLabel }: { onBack: () => void; deviceLabel: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#E8E5DE] bg-white/95 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm md:text-base text-neutral-600 hover:text-[#B8953F] transition-colors font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          返回（重新选择装置）
        </button>
        <span className="ml-auto text-sm text-neutral-400">{deviceLabel}版教学</span>
      </div>
    </header>
  );
}

function VideoSlot({ device }: { device: Device }) {
  if (device.videoUrl) {
    const portrait = device.videoPortrait;
    return (
      <div className={portrait ? 'mx-auto w-full max-w-[360px]' : 'w-full'}>
        <div className={`relative ${portrait ? 'aspect-[600/1300]' : 'aspect-video'} rounded-2xl overflow-hidden border border-[#E8E5DE] shadow-sm bg-black`}>
          <IntroVideoPlayer src={device.videoUrl} poster={device.videoPoster || ''} objectFit="contain" />
        </div>
      </div>
    );
  }
  // Placeholder until the screen-recording is ready.
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#D8D2C4] bg-[#FBF9F4] aspect-video flex flex-col items-center justify-center text-center px-6">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-70">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      <p className="text-base md:text-lg font-semibold text-neutral-500">{device.label}版教学影片准备中</p>
      <p className="text-sm text-neutral-400 mt-1">影片上线前，可先依照下方步骤完成启用</p>
    </div>
  );
}

function ActivationFlow() {
  return (
    <div className="bg-white rounded-2xl border-2 border-[#B8953F]/35 shadow-sm p-6 md:p-9 text-center">
      <a
        href={ACTIVATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#B8953F] text-white text-lg md:text-xl font-bold hover:bg-[#A6842F] transition-colors shadow-[0_4px_14px_rgba(184,149,63,0.35)]"
      >
        前往序号开通页 →
      </a>
      <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-xl mx-auto mt-4">
        点击按钮，前往台湾最大财经平台 CMoney 的「序号开通页」
      </p>
    </div>
  );
}

function ScreenshotSteps({ shots }: { shots: { dir: string; count: number } }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DE] shadow-sm p-5 md:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-neutral-900 text-center mb-2">图文步骤</h2>
      <p className="text-sm md:text-base text-neutral-500 text-center mb-6">看不清影片，也可以照着下方截图一步步操作</p>
      <div className="space-y-5">
        {Array.from({ length: shots.count }, (_, i) => i + 1).map((n) => (
          <Image
            key={n}
            src={`${shots.dir}/${n}.webp`}
            alt={`启用步骤 ${n}`}
            width={600}
            height={1300}
            className="w-full max-w-[360px] mx-auto h-auto rounded-xl border border-[#E8E5DE] shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center mb-8">
      <span className="inline-block bg-[#B8953F] text-white text-sm md:text-base font-bold tracking-wide rounded-full px-5 py-1.5 mb-4">
        {eyebrow}
      </span>
      <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">{title}</h2>
      <div className="w-16 h-1 bg-[#B8953F] rounded-full mx-auto mt-5" />
    </div>
  );
}

function AppDownloadBlock() {
  return (
    <div className="bg-[#FAF8F3] rounded-xl border border-[#E8E5DE] p-6 md:p-8 text-center flex flex-col items-center mb-12">
      <h3 className="text-lg md:text-xl font-bold text-neutral-900 mb-2">下载「Mike是麦克」App</h3>
      <p className="text-base md:text-lg text-neutral-500 mb-5">点击下方链接 或 扫描 QR Code 下载</p>
      <Image src={`${BASE}/qr.webp`} alt="下载 Mike是麦克 App QR Code" width={600} height={600} className="w-36 h-36 md:w-44 md:h-44 rounded-lg border border-[#E8E5DE]" />
      <a href={APP_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-6 px-6 py-3 rounded-lg bg-[#B8953F] text-white text-base font-semibold hover:bg-[#A6842F] transition-colors">
        点此下载 Mike是麦克 App →
      </a>
    </div>
  );
}

function StepCard({ n, step }: { n: number; step: CompStep }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-start gap-2.5 max-w-xl mb-1 text-left">
        <span className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#B8953F]/12 border border-[#B8953F]/40 flex items-center justify-center text-sm md:text-base font-bold text-[#B8953F]">
          {n}
        </span>
        <p className="text-base md:text-lg font-semibold text-neutral-800 leading-relaxed pt-1">{step.title}</p>
      </div>
      {step.cta && (
        <a
          href={ACTIVATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-3 px-7 py-3.5 rounded-xl bg-[#B8953F] text-white text-base md:text-lg font-bold hover:bg-[#A6842F] transition-colors shadow-[0_4px_14px_rgba(184,149,63,0.35)]"
        >
          前往序号开通页 →
        </a>
      )}
      {step.note && (
        <div className="mt-3 rounded-lg bg-[#FBF7EC] border border-[#E8D9B0] px-4 py-3 text-sm md:text-base text-[#8A6D24] leading-relaxed max-w-xl">
          💡 {step.note}
        </div>
      )}
      {step.warn && (
        <div className="mt-3 rounded-lg bg-[#FDECEC] border border-[#F2B8B8] px-4 py-3 text-sm md:text-base text-[#B42318] leading-relaxed max-w-xl font-medium">
          ⚠️ {step.warn}
        </div>
      )}
      <div className={`mt-4 mx-auto ${step.tall ? 'max-w-[360px]' : 'w-full'}`}>
        <Image
          src={step.img}
          alt={step.title}
          width={step.tall ? 600 : 1500}
          height={step.tall ? 1300 : 850}
          className="w-full h-auto rounded-xl border border-[#E8E5DE] shadow-sm"
        />
      </div>
    </div>
  );
}

function ComputerSections({ sections }: { sections: CompSection[] }) {
  let n = 0;
  return (
    <>
      {sections.map((sec, si) => (
        <section key={si} className="bg-white rounded-2xl border border-[#E8E5DE] shadow-sm p-6 md:p-10">
          <SectionHeader eyebrow={sec.eyebrow} title={sec.title} />
          {sec.appDownload && <AppDownloadBlock />}
          <div className="space-y-12">
            {sec.steps.map((step) => {
              n += 1;
              return <StepCard key={n} n={n} step={step} />;
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function QuickLinks() {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DE] shadow-sm p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-neutral-900 text-center mb-1">已完成启用？</h2>
      <p className="text-sm md:text-base text-neutral-500 text-center mb-6">立即观看课程、下载 App</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href={COURSE_LINK} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 rounded-xl bg-[#FAF8F3] border border-[#E8E5DE] px-6 py-6 hover:border-[#B8953F] transition-colors text-center">
          <span className="text-base md:text-lg font-bold text-neutral-900">前往课程页</span>
          <span className="text-sm text-neutral-500">直接观看 9 章课程</span>
          <span className="mt-1 text-sm font-semibold text-[#B8953F]">打开课程 →</span>
        </a>
        <a href={APP_LINK} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 rounded-xl bg-[#FAF8F3] border border-[#E8E5DE] px-6 py-6 hover:border-[#B8953F] transition-colors text-center">
          <span className="text-base md:text-lg font-bold text-neutral-900">下载 Mike是麦克 App</span>
          <span className="text-sm text-neutral-500">登入同一帐号即享 3 天 VIP</span>
          <span className="mt-1 text-sm font-semibold text-[#B8953F]">下载 App →</span>
        </a>
      </div>
    </div>
  );
}

function SupportBlock() {
  return (
    <div className="bg-white rounded-xl border border-[#E8E5DE] shadow-sm p-6 md:p-7 text-center">
      <p className="text-base md:text-lg text-neutral-600 mb-4">※ 启用过程遇到任何问题，欢迎联系客服</p>
      <div className="flex flex-col items-center gap-3">
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#25D366] hover:bg-[#20BD5A] text-white text-base font-medium transition-colors">
          WhatsApp 咨询客服
        </a>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#B8953F] underline underline-offset-2 text-base">{SUPPORT_EMAIL}</a>
      </div>
      <p className="text-sm text-neutral-400 mt-4">服务时间：北京时间周一到周五 8:30 ~ 17:30</p>
    </div>
  );
}

function DeviceTutorial({ device, onBack }: { device: Device; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-700">
      <BackBar onBack={onBack} deviceLabel={device.label} />
      <main className="max-w-4xl mx-auto px-6 py-10 md:py-14">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 text-center mb-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          {device.label}版・启用教学
        </h1>
        <p className="text-neutral-500 text-center mb-8 text-base md:text-lg">
          {device.videoUrl ? '跟着影片或下方步骤，1分钟完成启用' : '跟着下方步骤，1分钟完成启用'}
        </p>

        <div className="space-y-8">
          {/* 1) Screen-recording video (phone only) */}
          {device.videoUrl && <VideoSlot device={device} />}

          {/* 2) Go to activation page — phone keeps the standalone card; computer folds it into Step 1 */}
          {!device.sections && <ActivationFlow />}

          {/* 3) Steps — phone: video + baked-caption gallery; computer: 2-part sections */}
          {device.shots && <ScreenshotSteps shots={device.shots} />}
          {device.sections && <ComputerSections sections={device.sections} />}

          {/* 4) Closing block — course + App links (both devices) */}
          <QuickLinks />

          {/* 5) Support */}
          <SupportBlock />
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────  Entry  ───────────────────────── */

export default function TutorialFlow() {
  const [device, setDevice] = useState<DeviceKey | null>(null);

  if (!device) return <DeviceSelect onPick={setDevice} />;

  const selected = DEVICES.find((d) => d.key === device)!;
  return <DeviceTutorial device={selected} onBack={() => setDevice(null)} />;
}
