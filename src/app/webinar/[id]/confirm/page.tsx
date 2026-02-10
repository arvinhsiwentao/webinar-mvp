'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge, Card } from '@/components/ui';

export default function ConfirmPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const webinarId = params.id as string;
  const sessionId = searchParams.get('session') || '';
  const name = searchParams.get('name') || '你';

  return (
    <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center px-6">
      {/* Grain Overlay */}
      <div className="grain-overlay" />
      
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <Card className="relative z-10 max-w-md w-full text-center p-10 border-green-500/20">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <Badge variant="success" className="mb-6">報名成功</Badge>

        <h1 className="text-2xl font-bold mb-4">
          {name}，你已成功報名！
        </h1>

        <p className="text-gray-400 mb-8 leading-relaxed">
          我們已將直播資訊寄送到你的信箱。<br />
          請在直播開始前進入候場室。
        </p>

        {/* Action Cards */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-left">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <span>📅</span>
            </div>
            <div>
              <p className="text-sm text-gray-400">下一步</p>
              <p className="font-medium">加入行事曆提醒</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700 text-left">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <span>📧</span>
            </div>
            <div>
              <p className="text-sm text-gray-400">確認信</p>
              <p className="font-medium">檢查你的收件匣</p>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Link href={`/webinar/${webinarId}/waiting?session=${sessionId}&name=${encodeURIComponent(name)}`}>
          <Button variant="gold" size="lg" className="w-full">
            進入候場室
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
        </Link>

        <p className="text-gray-600 text-xs mt-6">
          直播開始前 10 分鐘可進入直播間
        </p>
      </Card>
    </div>
  );
}
