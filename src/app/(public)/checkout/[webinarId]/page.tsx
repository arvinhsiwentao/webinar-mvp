'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

function ValueItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-neutral-700">
      <span className="text-[#B8953F] mt-0.5 shrink-0">&#10003;</span>
      <span>{text}</span>
    </li>
  );
}

function CountdownTimer({ initialSeconds }: { initialSeconds: number }) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  if (remaining <= 0) {
    return (
      <div className="bg-[#1A1A1A] text-white text-center py-3 px-4 rounded-md text-sm font-medium">
        限时优惠
      </div>
    );
  }

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="bg-[#1A1A1A] text-white text-center py-3 px-4 rounded-md">
      <span className="text-sm">限时优惠倒计时 </span>
      <span className="text-[#B8953F] font-mono font-bold text-lg">
        {hours > 0 ? `${pad(hours)}:` : ''}{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const webinarId = params.webinarId as string;

  const email = searchParams.get('email') || '';
  const source = searchParams.get('source') || 'direct';
  const countdownSeconds = parseInt(searchParams.get('t') || '0', 10);
  const name = searchParams.get('name') || '';

  const [error, setError] = useState('');
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);

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

  if (alreadyPurchased) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">&#10004;</div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">你已购买过此课程</h1>
          <p className="text-neutral-500">
            激活码已发送至 {email}，请检查你的邮箱（包括垃圾邮件文件夹）。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* Header */}
      <header className="border-b border-[#E8E5DE] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            安全结账
          </div>
        </div>
      </header>

      {/* Countdown banner */}
      {countdownSeconds > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <CountdownTimer initialSeconds={countdownSeconds} />
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12">
          {/* Left column — Marketing */}
          <div className="lg:sticky lg:top-8 lg:self-start space-y-6">
            {/* Headline */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">
                你离财务自由，只差一个决定
              </h1>
              <p className="text-neutral-500 text-sm">
                加入 2,000+ 学员，跟着 Mike 用美股抄底存股双策略打造被动收入
              </p>
            </div>

            {/* Product summary card */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">课程套餐内容</h3>
              <ul className="space-y-3">
                <ValueItem text="震盪行情的美股期權操作解析 (价值 USD $312)" />
                <ValueItem text="ETF 進階資產放大術 (价值 USD $384)" />
                <ValueItem text="MIKE是麥克 APP 完整权限 (年费价值 USD $1,000)" />
                <ValueItem text="2,000+ 人美股操作社群 (独家福利)" />
                <ValueItem text="Mike 亲自录制选股逻辑教学 (独家内容)" />
              </ul>
            </div>

            {/* Price display */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-neutral-400 line-through text-lg">USD $1,696</span>
                <span className="text-3xl font-bold text-neutral-900">USD $599</span>
              </div>
              <div className="inline-block bg-[rgba(184,149,63,0.08)] text-[#B8953F] text-sm font-medium px-3 py-1 rounded-md">
                立省 USD $1,097 (65% OFF)
              </div>
            </div>

            {/* Testimonials */}
            <div className="space-y-4">
              <div className="border-l-4 border-[#B8953F] bg-white rounded-r-lg p-5">
                <p className="text-sm text-neutral-600 italic mb-2">
                  "跟着 Mike 学了三个月，现在每个月被动收入已经超过生活费了。课程内容非常实用！"
                </p>
                <p className="text-xs text-neutral-400">— 学员 Jason T.</p>
              </div>

              <div className="border-l-4 border-[#B8953F] bg-white rounded-r-lg p-5">
                <p className="text-sm text-neutral-600 italic mb-2">
                  "以前只会定期定额买 VOO，跌了就慌、涨了又不敢加。上完 ETF 课才知道原来可以用结构性主题去选不同类型的 ETF 做攻守配置；再上期权课学会 Sell Put，现在大跌反而是我收保费＋低接的机会。"
                </p>
                <p className="text-xs text-neutral-400">— 学员 Kevin L.</p>
              </div>

              <div className="border-l-4 border-[#B8953F] bg-white rounded-r-lg p-5">
                <p className="text-sm text-neutral-600 italic mb-2">
                  "说实话我之前买了 ETF 课但一直没有行动，后来加了期权课学了资金配置 SOP，又在 App 社团里看到 Mike 即时发的长短线配置思路，课堂学的理论，配上 Mike 每天在社团的实战判断，逻辑清晰了不少。"
                </p>
                <p className="text-xs text-neutral-400">— 学员 Wendy C.</p>
              </div>

              <div className="border-l-4 border-[#B8953F] bg-white rounded-r-lg p-5">
                <p className="text-sm text-neutral-600 italic mb-2">
                  "我是上班族，没时间整天研究，平常就靠 App 语音直播通勤时听 Mike 的盘势分析，有什么变动社团也会即时更新，还挺方便。"
                </p>
                <p className="text-xs text-neutral-400">— 学员 David W.</p>
              </div>

              <div className="border-l-4 border-[#B8953F] bg-white rounded-r-lg p-5">
                <p className="text-sm text-neutral-600 italic mb-2">
                  "课程教的是框架，但市场每天在变，光靠课程你还是会犹豫。App 里 Mike 社团即时发的配置逻辑，算是有帮我把课堂的框架套到当下的盘势上，记得上週他在社团就有提短线帐户某板块的 Sell Put 逻辑。"
                </p>
                <p className="text-xs text-neutral-400">— 学员 Eric H.</p>
              </div>

              <div className="border-l-4 border-[#B8953F] bg-white rounded-r-lg p-5">
                <p className="text-sm text-neutral-600 italic mb-2">
                  "我先生之前炒个股亏了不少，两个人因为投资的事吵过好几次，后来一起看 Mike 的视频才渐渐培养起投资观。"
                </p>
                <p className="text-xs text-neutral-400">— 学员 Amy Z.</p>
              </div>

              <div className="border-l-4 border-[#B8953F] bg-white rounded-r-lg p-5">
                <p className="text-sm text-neutral-600 italic mb-2">
                  "App VIP 聊天室能直接问 Mike 问题，有一次我问 Sell Put 的履约价怎么选，Mike 隔天语音直播还专门讲了这个。"
                </p>
                <p className="text-xs text-neutral-400">— 学员 Linda Y.</p>
              </div>

              <div className="border-l-4 border-[#B8953F] bg-white rounded-r-lg p-5">
                <p className="text-sm text-neutral-600 italic mb-2">
                  "老实说以前对 Mike 的印象还停留在看准 Tesla 的眼光，上了课才懂...原来背后靠的是一套扎实的 ETF 的策略，帮助心态更稳。自己现在遇到市场震荡，也能相对冷静了。"
                </p>
                <p className="text-xs text-neutral-400">— 学员 Steven K.</p>
              </div>
            </div>

            {/* Guarantee */}
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>30 天无理由退款保证</span>
            </div>
          </div>

          {/* Right column — Stripe Checkout */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-1 min-h-[400px]">
              {error ? (
                <div className="p-6 text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={() => { setError(''); window.location.reload(); }}
                    className="text-[#B8953F] underline text-sm"
                  >
                    重新结账
                  </button>
                </div>
              ) : (
                <EmbeddedCheckoutProvider
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
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
        </div>
      </main>
    </div>
  );
}
