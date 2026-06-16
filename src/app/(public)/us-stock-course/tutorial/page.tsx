import type { Metadata } from 'next';
import TutorialFlow from '@/components/us-stock-course/TutorialFlow';

export const metadata: Metadata = {
  title: 'US$1 美股入门课启用教学｜Mike是麦克',
  description: '购买后如何兑换课程、下载 Mike是麦克 App 并确认 3 天 VIP 权限的图文 / 影片教学',
};

export default function TutorialPage() {
  return <TutorialFlow />;
}
