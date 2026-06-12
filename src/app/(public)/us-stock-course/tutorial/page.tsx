import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: '启用图文教学｜US$1 美股入门课',
  description: '购买后如何启用课程与 Mike是麦克 App VIP 权限的图文教学',
};

const COURSE_LINK = 'https://www.cmoney.tw/course-media/17781/chapters';
const APP_LINK = 'https://cmoneymike.onelink.me/ZEaW/hqq09hla';
const SUPPORT_EMAIL = 'cmoney_overseas@cmoney.com.tw';
const WHATSAPP_URL = 'https://wa.me/886917642752?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E5%92%A8%E8%AF%A2%E8%AF%BE%E7%A8%8B%E7%9B%B8%E5%85%B3%E9%97%AE%E9%A2%98';

const STEPS = [
  {
    n: '1',
    title: '前往 CMoney 官网，登入 / 注册',
    desc: '前往 cmoney.tw，点击右上角「登入 / 注册」，完成登入或注册理财宝帐号（你已完成付款，仅需登入即可领取）。',
  },
  {
    n: '2',
    title: '启用两组序号',
    desc: '登入后，将鼠标移到右上角，在下拉选单中选择「启用序号」。把确认邮件里的「课程启用序号」与「App 3 天 VIP 启用序号」分别输入并启用，看到「序号启用成功！」即完成。',
  },
  {
    n: '3',
    title: '观看 9 章线上课程',
    desc: '课程序号启用后，即可在课程页观看 9 章 Mike 亲录教学。',
    link: { label: '点此观看课程', url: COURSE_LINK },
  },
  {
    n: '4',
    title: '下载 App，登入启用 3 天 VIP',
    desc: '下载 Mike是麦克 App，用同一个 CMoney 帐号登入，App 序号启用后 3 天 VIP 全功能自动生效（到期自动降回免费版，不扣款）。',
    link: { label: '点此下载 Mike是麦克 App', url: APP_LINK },
  },
];

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-[#0a0a08] text-neutral-200">
      {/* Header */}
      <header className="border-b border-[#C9A962]/15 bg-[#0a0a08]/95">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-2.5">
          <Image src="/icon.png" alt="Mike是麦克" width={28} height={28} className="rounded" />
          <span className="text-[15px] font-semibold text-[#E8D5A3]" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            Mike是麦克
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-3" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          启用图文教学
        </h1>
        <p className="text-neutral-400 text-center mb-12 text-sm md:text-base">
          购买后，跟着以下步骤启用你的课程与 App VIP 权限
        </p>

        {/* Steps */}
        <div className="space-y-10">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-5">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#C9A962]/15 border border-[#C9A962]/40 flex items-center justify-center">
                <span className="text-base md:text-lg font-bold text-[#C9A962]">{s.n}</span>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-lg md:text-xl font-bold text-neutral-100 mb-2">{s.title}</h3>
                <p className="text-base text-neutral-400 leading-relaxed">{s.desc}</p>
                {s.link && (
                  <a
                    href={s.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg bg-[#B8953F] text-white text-sm font-semibold hover:bg-[#A6842F] transition-colors"
                  >
                    {s.link.label} →
                  </a>
                )}
                {/* TODO: 图文教学截图占位 — replace with real screenshots */}
                <div className="mt-4 rounded-xl border border-dashed border-[#C9A962]/25 bg-white/[0.02] h-40 flex items-center justify-center text-neutral-600 text-sm">
                  教学截图待补
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Support */}
        <div className="bg-white/[0.03] rounded-xl border border-white/10 p-6 text-center mt-14">
          <p className="text-sm text-neutral-400 mb-3">※ 启用过程遇到任何问题，欢迎联系客服</p>
          <div className="flex flex-col items-center gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-medium transition-colors">
              WhatsApp 咨询客服
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#E8D5A3] underline underline-offset-2 text-sm">{SUPPORT_EMAIL}</a>
          </div>
          <p className="text-xs text-neutral-500 mt-3">服务时间：北京时间周一到周五 8:30 ~ 17:30</p>
        </div>
      </main>
    </div>
  );
}
