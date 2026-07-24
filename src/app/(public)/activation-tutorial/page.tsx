import Image from 'next/image';
import IntroVideoPlayer from '@/components/us-stock-course/IntroVideoPlayer';

const TUTORIAL_PLAYBACK_ID = 'EmnKoBFw01JIwRVhNFc00xN8ZFvMQdMDJUkSMsF501tuhw';

const APP_LINK = 'https://cmoneymike.onelink.me/ZEaW/kkyo4oqs';
const SUPPORT_EMAIL = 'cmoney_overseas@cmoney.com.tw';
const WHATSAPP_URL = 'https://wa.me/886917642752?text=' + encodeURIComponent('你好，我想咨询课程相关问题');

const STEPS: { title: string; desc: string; img: string }[] = [
  {
    title: '开启、登入App',
    desc: '下载后打开，点「登入」，可以使用第三方快速登入或使用 Email 注册与登入。',
    img: '/images/activation-tutorial/1.webp',
  },
  {
    title: '登入后进入首页',
    desc: '登入成功后会看到 App 首页。接着点右下角的「更多」。',
    img: '/images/activation-tutorial/2.webp',
  },
  {
    title: '进入【更多】页，点「启用序号」',
    desc: '在「更多」页里，找到并点击「启用序号」。',
    img: '/images/activation-tutorial/3.webp',
  },
  {
    title: '输入启用序号',
    desc: '填入购买确认邮件里收到的启用序号，点「送出」。',
    img: '/images/activation-tutorial/4.webp',
  },
  {
    title: '确认App权限已开通',
    desc: '回到「更多」页，确认「权限」已变成「专业版」，代表 App 付费功能已开通。',
    img: '/images/activation-tutorial/5.webp',
  },
  {
    title: '确认课程已解锁',
    desc: '到「内容专区 → 课程」，确认课程显示「已付费课程」，就可以点击进入开始学习了。',
    img: '/images/activation-tutorial/6.webp',
  },
];

export default function ActivationTutorialPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-neutral-700">
      {/* Header — 邮件到达页，无返回 */}
      <header className="sticky top-0 z-20 border-b border-[#E8E5DE] bg-white/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-center">
          <span className="text-sm md:text-base font-semibold text-neutral-800">Mike App & 付费课程启用教学</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 text-center mb-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          购买后，这样启用
        </h1>
        <p className="text-neutral-500 text-center mb-8 text-base md:text-lg">
          全程在 App 内完成，跟着 7 步一次搞定
        </p>

        {/* 操作示范影片 */}
        <div className="mb-10">
          <div className="mx-auto max-w-[300px] aspect-[1080/2352] rounded-2xl overflow-hidden border border-[#E8E5DE] shadow-md bg-black">
            <IntroVideoPlayer
              src={`https://stream.mux.com/${TUTORIAL_PLAYBACK_ID}.m3u8`}
              poster={`https://image.mux.com/${TUTORIAL_PLAYBACK_ID}/thumbnail.jpg?time=1`}
              objectFit="contain"
              lazy
            />
          </div>
          <p className="text-center text-base md:text-lg font-medium text-neutral-700 mt-4">▲ 完整启用流程操作示范（约 40 秒）</p>
        </div>

        {/* App 下载 = 第 1 步 */}
        <div className="bg-white rounded-xl border border-[#E8E5DE] shadow-sm px-5 py-5 mb-5">
          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[#B8953F]/12 border border-[#B8953F]/40 flex items-center justify-center text-base font-bold text-[#B8953F]">1</span>
            <div>
              <p className="text-base md:text-lg font-bold text-neutral-900 mb-1">先下载「Mike是麦克」App</p>
              <p className="text-sm md:text-base text-neutral-500 leading-relaxed">扫描 QR Code，或点击下方连结下载。</p>
            </div>
          </div>
          <div className="text-center mt-4">
          <Image
            src="/images/app-download-qrcode.png"
            alt="下载 Mike是麦克 App QR Code"
            width={360}
            height={360}
            className="w-40 h-40 md:w-44 md:h-44 mx-auto rounded-lg border border-[#E8E5DE]"
          />
          <a
            href={APP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-6 px-7 py-3.5 rounded-lg bg-[#5E3E9E] text-white text-base font-bold hover:bg-[#4E3286] transition-colors"
          >
            📱 立即下载 App
          </a>
          <p className="text-xs text-neutral-400 mt-3">或到 App Store / Google Play 搜寻「Mike是麦克」</p>
          </div>
        </div>

        {/* 步骤 */}
        <div className="space-y-5">
          {STEPS.map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E8E5DE] shadow-sm px-5 py-5">
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[#B8953F]/12 border border-[#B8953F]/40 flex items-center justify-center text-base font-bold text-[#B8953F]">
                  {i + 2}
                </span>
                <div>
                  <p className="text-base md:text-lg font-bold text-neutral-900 mb-1">{s.title}</p>
                  <p className="text-sm md:text-base text-neutral-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
              <div className="mt-4">
                <Image
                  src={s.img}
                  alt={s.title}
                  width={720}
                  height={1564}
                  className="w-full max-w-[260px] mx-auto h-auto rounded-xl border border-[#E8E5DE] shadow-sm"
                />
              </div>
            </div>
          ))}
        </div>

        {/* 客服 */}
        <div className="bg-white rounded-xl border border-[#E8E5DE] shadow-sm p-6 md:p-7 text-center mt-8">
          <p className="text-base md:text-lg text-neutral-600 mb-4">※ 启用过程遇到任何问题，欢迎联系客服</p>
          <div className="flex flex-col items-center gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#25D366] hover:bg-[#20BD5A] text-white text-base font-medium transition-colors">
              💬 WhatsApp 咨询客服
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#B8953F] underline underline-offset-2 text-base">{SUPPORT_EMAIL}</a>
          </div>
          <p className="text-sm text-neutral-400 mt-4">服务时间：北京时间周一到周五 8:30 ~ 17:30</p>
        </div>
      </main>
    </div>
  );
}
