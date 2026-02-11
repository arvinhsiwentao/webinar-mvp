import { chatBroker } from '@/lib/chat-broker';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channel = `webinar-${id}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const countData = JSON.stringify({
        type: 'viewers',
        count: chatBroker.getConnectionCount(channel) + 1,
      });
      controller.enqueue(encoder.encode(`data: ${countData}\n\n`));

      const unsubscribe = chatBroker.subscribe(channel, (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          unsubscribe();
        }
      });

      const broadcastCount = () => {
        const count = chatBroker.getConnectionCount(channel);
        chatBroker.publish(channel, JSON.stringify({ type: 'viewers', count }));
      };
      broadcastCount();

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeat);
        setTimeout(broadcastCount, 100);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
