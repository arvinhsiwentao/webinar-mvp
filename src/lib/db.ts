// JSON-based database for MVP
import fs from 'fs';
import path from 'path';
import { Webinar, Registration, ChatMessageData, Order } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Generic read/write functions
function readJsonFile<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Webinar operations
export function getAllWebinars(): Webinar[] {
  initializeSampleData();
  return readJsonFile<Webinar[]>('webinars.json', []);
}

export function getWebinarById(id: string): Webinar | null {
  const webinars = getAllWebinars();
  
  // Try to find by id field first
  const byId = webinars.find(w => w.id === id);
  if (byId) return byId;
  
  // If id is numeric, try to use as array index (1-based for user-friendliness)
  const numericId = parseInt(id, 10);
  if (!isNaN(numericId) && numericId >= 1 && numericId <= webinars.length) {
    return webinars[numericId - 1];
  }
  
  return null;
}

export function createWebinar(webinar: Omit<Webinar, 'id' | 'createdAt' | 'updatedAt'>): Webinar {
  const webinars = getAllWebinars();
  const now = new Date().toISOString();
  const newWebinar: Webinar = {
    ...webinar,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  webinars.push(newWebinar);
  writeJsonFile('webinars.json', webinars);
  return newWebinar;
}

export function updateWebinar(id: string, updates: Partial<Webinar>): Webinar | null {
  const webinars = getAllWebinars();
  const index = webinars.findIndex(w => w.id === id);
  if (index === -1) return null;
  
  webinars[index] = {
    ...webinars[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeJsonFile('webinars.json', webinars);
  return webinars[index];
}

export function deleteWebinar(id: string): boolean {
  const webinars = getAllWebinars();
  const index = webinars.findIndex(w => w.id === id);
  if (index === -1) return false;
  
  webinars.splice(index, 1);
  writeJsonFile('webinars.json', webinars);
  return true;
}

// Registration operations
export function getAllRegistrations(): Registration[] {
  return readJsonFile<Registration[]>('registrations.json', []);
}

export function getRegistrationsByWebinar(webinarId: string): Registration[] {
  return getAllRegistrations().filter(r => r.webinarId === webinarId);
}

export function getRegistrationCount(webinarId: string): number {
  return getRegistrationsByWebinar(webinarId).length;
}

export function getRegistrationByEmail(webinarId: string, email: string): Registration | null {
  return getAllRegistrations().find(r => r.webinarId === webinarId && r.email === email) || null;
}

export function createRegistration(registration: Omit<Registration, 'id' | 'registeredAt'>): Registration {
  const registrations = getAllRegistrations();
  const newReg: Registration = {
    ...registration,
    id: generateId(),
    registeredAt: new Date().toISOString(),
  };
  registrations.push(newReg);
  writeJsonFile('registrations.json', registrations);
  return newReg;
}

export function updateRegistration(id: string, updates: Partial<Registration>): Registration | null {
  const registrations = readJsonFile<Registration[]>('registrations.json', []);
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) return null;
  registrations[idx] = { ...registrations[idx], ...updates };
  writeJsonFile('registrations.json', registrations);
  return registrations[idx];
}

// Chat operations
export function getChatMessages(webinarId: string): ChatMessageData[] {
  const allMessages = readJsonFile<ChatMessageData[]>('chat-messages.json', []);
  return allMessages.filter(m => m.webinarId === webinarId);
}

export function addChatMessage(message: Omit<ChatMessageData, 'id' | 'createdAt'>): ChatMessageData {
  const allMessages = readJsonFile<ChatMessageData[]>('chat-messages.json', []);
  const newMessage: ChatMessageData = {
    ...message,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  allMessages.push(newMessage);
  writeJsonFile('chat-messages.json', allMessages);
  return newMessage;
}

// Tracking events
export function appendEvent(event: unknown): void {
  const events = readJsonFile<unknown[]>('events.json', []);
  events.push(event);
  writeJsonFile('events.json', events);
}

// Order operations
export function getAllOrders(): Order[] {
  return readJsonFile<Order[]>('orders.json', []);
}

export function getOrderBySessionId(stripeSessionId: string): Order | null {
  return getAllOrders().find(o => o.stripeSessionId === stripeSessionId) || null;
}

export function getOrdersByEmail(email: string, webinarId: string): Order[] {
  return getAllOrders().filter(o => o.email === email && o.webinarId === webinarId);
}

export function createOrder(order: Omit<Order, 'id' | 'createdAt'>): Order {
  const orders = getAllOrders();
  const newOrder: Order = {
    ...order,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  orders.push(newOrder);
  writeJsonFile('orders.json', orders);
  return newOrder;
}

export function updateOrder(id: string, updates: Partial<Order>): Order | null {
  const orders = getAllOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...updates };
  writeJsonFile('orders.json', orders);
  return orders[idx];
}

export function getOrderByActivationCode(code: string): Order | null {
  return getAllOrders().find(o => o.activationCode === code) || null;
}

// Initialize with sample data if empty
let _sampleDataInitialized = false;

export function initializeSampleData(): void {
  if (_sampleDataInitialized) return;
  _sampleDataInitialized = true;

  const webinars = readJsonFile<Webinar[]>('webinars.json', []);
  if (webinars.length > 0) return;

  const sampleWebinar: Omit<Webinar, 'id' | 'createdAt' | 'updatedAt'> = {
    title: 'AIC 双风口机遇讲座',
    subtitle: '2026年最新趋势分析 - 掌握 AI 与加密货币的投资机会',
    speakerName: '王大明',
    speakerTitle: '资深投资顾问',
    speakerBio: '拥有15年金融市场经验，曾任职于多家知名投资机构。专注于新兴科技与数字资产投资研究，已帮助超过10,000名学员建立正确的投资观念。',
    speakerImage: '/images/mike-speaker.jpg',
    speakerAvatar: '/images/mike-avatar.jpg',
    videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
    duration: 90,
    highlights: [
      '了解 2026 年最具潜力的投资趋势',
      '学习 AI 产业的核心投资逻辑',
      '掌握数字资产配置的黃金比例',
      '获取限时优惠的独家课程折扣',
    ],
    autoChat: [
      { id: 'ac1', timeSec: 3, name: 'Alex', message: '开始了！🎉' },
      { id: 'ac2', timeSec: 8, name: '小美', message: '期待这堂课很久了' },
      { id: 'ac3', timeSec: 15, name: 'David', message: '笔记中 📝' },
      { id: 'ac4', timeSec: 22, name: '阿明', message: '畫面很清楚！' },
      { id: 'ac5', timeSec: 30, name: 'Emma', message: '+1 这观点很棒' },
      { id: 'ac6', timeSec: 40, name: 'Kevin', message: '讲得太好了 👏' },
      { id: 'ac7', timeSec: 50, name: '小芳', message: '这个概念很新颖' },
      { id: 'ac8', timeSec: 60, name: 'Jason', message: '终于等到这堂课了' },
      { id: 'ac9', timeSec: 75, name: 'Linda', message: '想问哪里可以购买？' },
      { id: 'ac10', timeSec: 90, name: 'Mike', message: '优惠链接出來了！' },
      { id: 'ac11', timeSec: 100, name: '小雨', message: '已购买 ✅' },
    ],
    ctaEvents: [
      {
        id: 'cta1',
        showAtSec: 80,
        hideAtSec: 180,
        buttonText: '🔥 立即购买限时优惠',
        url: 'https://example.com/checkout',
        promoText: '原价 $9,900 → 直播限定 $4,900 (50% OFF)',
        showCountdown: true,
        position: 'on_video' as const,
        color: '#16a34a',
        secondaryText: '前 20 名加入的学员，免费获赠一对一专属指导',
      },
    ],
    subtitleCues: [
      {
        id: 'sub-1',
        start: 4,
        end: 7.2,
        text: '欢迎来到今天的直播课程。',
        lines: ['欢迎来到今天的直播课程。'],
        cps: 3.8,
        cpl: 12,
      },
      {
        id: 'sub-2',
        start: 8,
        end: 12.4,
        text: '我们会用真实案例讲解 AI 与投资策略。',
        lines: ['我们会用真实案例讲解', 'AI 与投资策略。'],
        cps: 4.6,
        cpl: 12,
      },
    ],
    subtitleLanguage: 'zh',
    subtitleLastGeneratedAt: new Date().toISOString(),
    viewerBaseCount: 100,
    viewerMultiplier: 3,
    viewerPeakTarget: 60,
    viewerRampMinutes: 15,
    status: 'published',
    heroImageUrl: '/images/mike-speaker.jpg',
    heroEyebrowText: '限时公开 · 免费席位有限',
    promoImageUrl: '',
    disclaimerText: '本次讲座内容仅为知识分享与经验探讨，不构成任何形式的投资建议、理财推荐或收益保证。',
    endPageSalesCopy: '',
    endPageCtaText: '限时特惠购买课程',
    endPageCtaUrl: 'https://example.com/checkout',
    endPageCtaColor: '#7C3AED',
    sidebarDescription: '90分钟精彩讲座，专家分享投资策略与见解。',
    missedWebinarUrl: '',
    prerollVideoUrl: '',
  };

  createWebinar(sampleWebinar);
}
