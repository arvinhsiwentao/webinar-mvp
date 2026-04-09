// FAQ data for the floating chatbot
// Edit questions/answers here — the chatbot component reads from this file.

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    id: 'what-plans',
    question: '有哪些方案可以选？',
    answer:
      '我们提供 4 种方案，你可以根据自己的需求选择：\n\n' +
      '1. 完整组合包 $599 — ETF 课程 + 期权课程 + APP 一年权限，最划算的选择。直播后 2 小时内购买还加赠 Mike 一对一持仓分析。\n\n' +
      '2. APP 季度方案 $249 — APP 3 个月完整权限，适合想先试用工具的人。\n\n' +
      '3. ETF+期权课程组合 $249 — 两门课一起买比单买划算，还送 1 个月 APP 权限。\n\n' +
      '4. 期权课程 $99 — 适合已有 ETF 基础、只想补防守策略的人，也送 1 个月 APP 权限。\n\n' +
      '你也可以自由搭配（如期权课 + APP 季方案），结帐页会自动计算总价。',
  },
  {
    id: 'what-included',
    question: '完整组合包包含什么？',
    answer:
      '组合包是最划算的方案，包含三大核心：\n\n' +
      '1.「MIKE是麦克」APP 一年完整权限\n' +
      '包含价值灯号、Mike 关注清单、语音直播、学员 & Mike 即时文字聊天室、APP 专属付费内容文章等功能。\n\n' +
      '2. 震荡行情的美股期权操作解析（线上课程）\n' +
      '教你用 Sell Put、Sell Call 在市场波动时收保费。无期限、无限次数观看。\n\n' +
      '3. ETF 进阶资产放大术（线上课程）\n' +
      '教你四类 ETF 组合配置、从退休目标倒推配比。无期限、无限次数观看。\n\n' +
      '直播后 2 小时内购买，额外加赠 Mike 一对一持仓分析。',
  },
  {
    id: 'app-features',
    question: 'APP 里有什么功能？',
    answer:
      '「MIKE是麦克」APP 是你的投资学习 + 实战平台：\n\n' +
      '• 价值灯号 — 红/黄/绿灯判断个股估值，5 分钟扫完，不用花三小时看盘\n' +
      '• Mike 关注清单 — Mike 正在研究、追踪的股票即时更新\n' +
      '• 语音直播 — 约每两周一场，至少一小时，可直接提问交流\n' +
      '• 学员 & Mike 即时文字聊天室 — 随时提问、分享持仓、讨论操作逻辑\n' +
      '• APP 专属付费内容文章 — Mike 对最新趋势的深度分析\n\n' +
      '不只是工具，是有 Mike 在、有学员在、持续更新的投资学习社群。',
  },
  {
    id: 'options-course',
    question: '期权课程教什么？',
    answer:
      '《震荡行情的美股期权操作解析》教你在市场波动时也能赚钱的防守策略：\n\n' +
      '• Sell Put 低接收保费 — 像等房价跌到理想价才买，等待期间还能收租\n' +
      '• Sell Call 持仓收租 — 手上有 ETF 就能额外收保费，不卖股票也有现金流\n' +
      '• 风险控制 SOP — 保证金怎么算、什么时候该做什么时候不该做\n\n' +
      '无期限、无限次数观看。',
  },
  {
    id: 'etf-course',
    question: 'ETF 课程教什么？',
    answer:
      '《ETF 进阶资产放大术》教你从定期定额升级到有系统的主动配置：\n\n' +
      '• 四类 ETF 组合 — 成长型做加速、防御型做安全垫、收益型提供现金流、进阶型博超额回报\n' +
      '• 从退休目标倒推配比 — 你的目标决定你该偏攻还是偏守\n' +
      '• 长短线账户策略 + 动态再平衡 — 每季度花十分钟调整，用纪律替代情绪\n\n' +
      '无期限、无限次数观看。',
  },
  {
    id: 'how-to-use',
    question: '购买后怎么开始使用？',
    answer:
      '1. 完成付款（支持信用卡、Apple Pay、Google Pay）\n' +
      '2. 付款成功后页面自动显示启用序号，同时发送至你的邮箱\n' +
      '3. 前往商品官网输入启用序号，登入或注册理财宝帐号\n' +
      '4. 在 App Store / Google Play 下载「MIKE是麦克」APP 并登入\n' +
      '5. 开始学习 — APP 内观看课程、加入社群、使用全部工具',
  },
  {
    id: 'beginner',
    question: '我是投资新手，适合吗？',
    answer:
      '适合。ETF 课程从基础配置讲起，不需要任何投资经验。\n\n' +
      '期权课程是进阶内容，建议先从 ETF 课程开始，搭配 APP 社群里 Mike 每天的实战分享，循序渐进地学习。\n\n' +
      '很多学员也是从零基础开始，透过框架和社群陪伴，逐步建立自己的投资系统。',
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
    id: 'payment-methods',
    question: '支持哪些付款方式？',
    answer:
      '我们通过 Stripe 安全支付，支持：\n\n' +
      '• 信用卡 / 借记卡（Visa, MasterCard, AMEX 等）\n' +
      '• Apple Pay / Google Pay\n\n' +
      '所有交易都经过 SSL 加密，安全有保障。',
  },
  {
    id: 'course-validity',
    question: '课程和 APP 有效期多久？',
    answer:
      '两门线上课程可以无期限、无限次数回放，没有到期限制。\n\n' +
      'APP 权限根据方案不同：组合包为一年期，季度方案为 3 个月，单买期权或 ETF+期权课程赠送 1 个月。到期后均可续费继续使用。',
  },
];

export const WHATSAPP_NUMBER = '886981159288';
export const WHATSAPP_DEFAULT_MESSAGE = '你好，我想咨询课程相关问题';
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`;
