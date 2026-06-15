import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'US$1 美股入门课启用教学｜Mike是麦克',
  description: '购买后如何兑换课程、下载 Mike是麦克 App 并确认 3 天 VIP 权限的图文教学',
};

const COURSE_LINK = 'https://www.cmoney.tw/course-media/17781/chapters?platform=5';
const APP_LINK = 'https://cmoneymike.onelink.me/ZEaW/hqq09hla';
const CMONEY_LINK = 'https://www.cmoney.tw/app/';
const SUPPORT_EMAIL = 'cmoney_overseas@cmoney.com.tw';
const WHATSAPP_URL = 'https://wa.me/886917642752?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E6%83%B3%E5%92%A8%E8%AF%A2%E8%AF%BE%E7%A8%8B%E7%9B%B8%E5%85%B3%E9%97%AE%E9%A2%98';

const BASE = '/images/us-stock/tutorial';

type Step = {
  n: string;
  title: string;
  desc: string;
  img: string;
  orient: 'wide' | 'tall';
  note?: string;
  link?: { label: string; url: string };
};

// Section A — redeem the course + App VIP serials on the CMoney website
const WEB_STEPS: Step[] = [
  { n: '1', title: '进入台湾最大财经平台 CMoney', desc: '打开浏览器前往 cmoney.tw，进入 CMoney 理财宝首页，点击右上角「登入 / 注册」。', img: `${BASE}/01.webp`, orient: 'wide', link: { label: '点此前往 CMoney 官网', url: CMONEY_LINK } },
  { n: '2', title: '注册 / 登入帐号', desc: '注册 / 登入你的理财宝帐号，可以使用第三方快速登入。', img: `${BASE}/02.webp`, orient: 'wide' },
  { n: '3', title: '前往「启用序号」', desc: '登入后，将鼠标移到右上角头像，在下拉选单中选择「启用序号」。', img: `${BASE}/03.webp`, orient: 'wide' },
  { n: '4', title: '输入两组启用序号', desc: '依序输入确认邮件里的「课程启用序号」与「App 3 天 VIP 启用序号」，分别送出启用，看到「启用成功」即完成。', note: '💡 两组序号都没有使用期限，App 3 天 VIP 权限可以等到你想使用时再兑换启用。', img: `${BASE}/04.webp`, orient: 'wide' },
  { n: '5', title: '进入会员中心', desc: '点击右上角，进入「会员中心」。', img: `${BASE}/05.webp`, orient: 'wide' },
  { n: '6', title: '找到我的影音课程', desc: '在会员中心点选「我的影音课程」，找到本课程。', img: `${BASE}/06.webp`, orient: 'wide' },
  { n: '7', title: '开始观看课程', desc: '点击课程即可进入播放页，随时随地观看。', img: `${BASE}/07.webp`, orient: 'wide', link: { label: '或是点此到达课程页', url: COURSE_LINK } },
  { n: '8', title: '9 章单元任你回看', desc: '完整 9 章单元列表，永久观看权限，看不懂可随时倒回重看。', img: `${BASE}/08.webp`, orient: 'wide' },
];

// Section B — download the App, log in, confirm the 3-day VIP
const APP_STEPS: Step[] = [
  { n: '9', title: '打开 App，进入登入页', desc: '下载并打开「Mike是麦克」App，进入登入页。', img: `${BASE}/09.webp`, orient: 'tall' },
  { n: '10', title: '用同一帐号登入', desc: '用「与网站相同的 CMoney 帐号」登入 App。', img: `${BASE}/10.webp`, orient: 'tall' },
  { n: '11', title: '进入 App 首页', desc: '登入后即进入 App 首页，序号已于网站启用，VIP 权限会自动套用。点击右下方进入「更多」页。', img: `${BASE}/11.webp`, orient: 'tall' },
  { n: '12', title: '确认 3 天 VIP 已生效', desc: '在权限页确认 3 天 VIP 全功能已生效（到期自动降回免费版，不扣款）。', img: `${BASE}/12.webp`, orient: 'tall' },
];

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center mb-10">
      <span className="inline-block bg-[#B8953F] text-white text-sm md:text-base font-bold tracking-wide rounded-full px-5 py-1.5 mb-4">
        {eyebrow}
      </span>
      <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">{title}</h2>
      <div className="w-16 h-1 bg-[#B8953F] rounded-full mx-auto mt-5" />
    </div>
  );
}

function StepCard({ s }: { s: Step }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-3 mb-2">
        <span className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#B8953F]/12 border border-[#B8953F]/40 flex items-center justify-center text-base md:text-lg font-bold text-[#B8953F]">
          {s.n}
        </span>
        <h3 className="text-lg md:text-xl font-bold text-neutral-900">{s.title}</h3>
      </div>
      <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-xl">{s.desc}</p>
      {s.note && (
        <div className="mt-3 rounded-lg bg-[#FBF7EC] border border-[#E8D9B0] px-4 py-3 text-sm md:text-base text-[#8A6D24] leading-relaxed max-w-xl">
          {s.note}
        </div>
      )}
      {s.link && (
        <a
          href={s.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 px-5 py-2.5 rounded-lg bg-[#B8953F] text-white text-sm md:text-base font-semibold hover:bg-[#A6842F] transition-colors"
        >
          {s.link.label} →
        </a>
      )}
      <div className={`mt-4 mx-auto ${s.orient === 'tall' ? 'max-w-[280px]' : 'w-full'}`}>
        <Image
          src={s.img}
          alt={s.title}
          width={s.orient === 'tall' ? 663 : 1440}
          height={s.orient === 'tall' ? 1440 : 810}
          className="w-full h-auto rounded-xl border border-[#E8E5DE] shadow-sm"
        />
      </div>
    </div>
  );
}

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-700">
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 text-center mb-3 leading-tight" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          US$1 美股入门课<br />启用教学
        </h1>
        <p className="text-neutral-500 text-center mb-12 text-base md:text-lg">
          购买后，跟着以下步骤启用你的课程与 App VIP 权限
        </p>

        {/* Section A — redeem on website */}
        <section className="bg-white rounded-2xl border border-[#E8E5DE] shadow-sm p-6 md:p-10 mb-10">
          <SectionHeader eyebrow="第一部分" title="如何兑换课程与 App VIP 权限？" />
          <div className="space-y-12">
            {WEB_STEPS.map((s) => <StepCard key={s.n} s={s} />)}
          </div>
        </section>

        {/* Section B — App */}
        <section className="bg-white rounded-2xl border border-[#E8E5DE] shadow-sm p-6 md:p-10 mb-10">
          <SectionHeader eyebrow="第二部分" title="如何下载 App、确认 App VIP 到期日？" />

        {/* Download App — standalone block before the steps */}
        <div className="bg-[#FAF8F3] rounded-xl border border-[#E8E5DE] p-6 md:p-8 text-center mb-12 flex flex-col items-center">
          <h3 className="text-lg md:text-xl font-bold text-neutral-900 mb-2">下载「Mike是麦克」App</h3>
          <p className="text-base md:text-lg text-neutral-500 mb-5">点击下方链接 或 扫描 QR Code 下载</p>
          <Image src={`${BASE}/qr.webp`} alt="下载 Mike是麦克 App QR Code" width={600} height={600} className="w-36 h-36 md:w-44 md:h-44 rounded-lg border border-[#E8E5DE]" />
          <a
            href={APP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-6 px-6 py-3 rounded-lg bg-[#B8953F] text-white text-base font-semibold hover:bg-[#A6842F] transition-colors"
          >
            点此下载 Mike是麦克 App →
          </a>
        </div>

          <div className="space-y-12">
            {APP_STEPS.map((s) => <StepCard key={s.n} s={s} />)}
          </div>
        </section>

        {/* Support */}
        <div className="bg-white rounded-xl border border-[#E8E5DE] shadow-sm p-6 md:p-7 text-center mt-14">
          <p className="text-base md:text-lg text-neutral-600 mb-4">※ 启用过程遇到任何问题，欢迎联系客服</p>
          <div className="flex flex-col items-center gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#25D366] hover:bg-[#20BD5A] text-white text-base font-medium transition-colors">
              WhatsApp 咨询客服
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#B8953F] underline underline-offset-2 text-base">{SUPPORT_EMAIL}</a>
          </div>
          <p className="text-sm text-neutral-400 mt-4">服务时间：北京时间周一到周五 8:30 ~ 17:30</p>
        </div>
      </main>
    </div>
  );
}
