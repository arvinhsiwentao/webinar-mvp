// FAQ data for the floating chatbot
// Edit questions/answers here — the chatbot component reads from this file.

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    id: 'what-included',
    question: '课程套餐包含什么内容？',
    answer:
      '套餐包含三大核心内容：\n' +
      '1. 《震荡行情的美股期权操作解析》完整课程\n' +
      '2. 《ETF 进阶资产放大术》完整课程\n' +
      '3. 「MIKE是麦克」APP 一年完整权限（含 VIP 聊天室、语音直播、即时选股逻辑分享）\n\n' +
      '另外还有 3,000+ 人美股操作社群 及 Mike 亲自录制的独家选股教学。',
  },
  {
    id: 'how-to-use',
    question: '购买后怎么开始使用？',
    answer:
      '付款成功后，你会立即收到一封确认邮件，里面有你的专属启用序号。\n\n' +
      '步骤：\n' +
      '1. 在 App Store / Google Play 下载「MIKE是麦克」APP\n' +
      '2. 注册帐号并输入启用序号\n' +
      '3. 即可观看所有课程内容并加入社群',
  },
  {
    id: 'refund',
    question: '可以退款吗？',
    answer:
      '可以！我们提供 30 天无理由退款保证。\n\n' +
      '如果你觉得课程不适合你，30 天内联系客服即可全额退款，不需要任何理由。\n' +
      '退款请联系：cmoney_overseas@cmoney.com.tw',
  },
  {
    id: 'beginner',
    question: '我是投资新手，适合这个课程吗？',
    answer:
      'Mike 的课程从基础观念讲起，不需要任何投资经验。\n\n' +
      'ETF 课程适合完全零基础的新手，期权课程则是进阶内容。建议先从 ETF 课程开始，' +
      '搭配 APP 社群里 Mike 每天的实战分享，循序渐进地学习。',
  },
  {
    id: 'app-features',
    question: 'APP 里有什么功能？',
    answer:
      '「MIKE是麦克」APP 是你的学习 + 实战平台：\n\n' +
      '• VIP 聊天室 — 可以直接向 Mike 提问\n' +
      '• 语音直播 — Mike 每日盘势分析，通勤也能听\n' +
      '• 即时动态 — 选股逻辑、配置思路即时更新\n' +
      '• 完整课程 — 所有课程内容随时观看、无限回放',
  },
  {
    id: 'course-validity',
    question: '课程有效期多久？',
    answer:
      '课程影片内容可以无限回放，没有到期限制。\n\n' +
      'APP 权限为一年期（自启用日起算），到期后可续费继续使用社群和直播功能。',
  },
  {
    id: 'payment-methods',
    question: '支持哪些付款方式？',
    answer:
      '我们通过 Stripe 安全支付，支持：\n\n' +
      '• 信用卡 / 借记卡（Visa, MasterCard, AMEX 等）\n' +
      '• Apple Pay / Google Pay\n\n' +
      '所有交易都经过 SSL 加密，安全有保障。',
  },
  {
    id: 'who-is-mike',
    question: 'Mike 是谁？',
    answer:
      'Mike 是北美知名的华人投资教育者，以精准判断美股走势闻名。\n\n' +
      '他专注于 ETF 资产配置和期权策略，透过系统化的教学方法，' +
      '帮助超过 3,000 位学员建立被动收入。他每天在 APP 社群分享即时盘势分析和操作逻辑。',
  },
];

export const WHATSAPP_NUMBER = '886981159288';
export const WHATSAPP_DEFAULT_MESSAGE = '你好，我想咨询课程相关问题';
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`;
