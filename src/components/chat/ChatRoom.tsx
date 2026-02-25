'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatElapsedTime } from '@/lib/utils';

export interface AutoChatMessage {
  timeSec: number;
  name: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  name: string;
  message: string;
  timestamp: number; // video time in seconds
  wallTime?: number; // real wall-clock epoch ms (for display)
  isAuto?: boolean;
  isSystem?: boolean;
}

export interface ChatRoomProps {
  /** Current video playback time in seconds */
  currentTime: number;
  /** Pre-configured auto-chat messages triggered by video time */
  autoMessages?: AutoChatMessage[];
  /** Randomize auto-message send time by +/- this many seconds */
  timeVariance?: number;
  /** Current user's display name */
  userName?: string;
  /** Called when user sends a message */
  onSendMessage?: (message: ChatMessage) => void;
  /** Webinar ID for real-time SSE chat subscription */
  webinarId?: string;
  /** For late join — backfill messages up to this time */
  initialTime?: number;
  /** ISO start time of the session — used to compute wall-clock display times */
  sessionStartTime?: string;
}

let msgIdCounter = 0;
function nextId(): string {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

export default function ChatRoom({
  currentTime,
  autoMessages = [],
  timeVariance = 5,
  userName = '匿名用户',
  onSendMessage,
  webinarId,
  initialTime,
  sessionStartTime,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const firedAutoIds = useRef<Set<number>>(new Set());

  // Format wall-clock epoch ms as HH:MM, falling back to video-time-based display
  const formatWallClock = useCallback((wallTime: number | undefined, videoSeconds: number) => {
    if (wallTime) {
      return new Date(wallTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    // Fallback for messages without wallTime (e.g., legacy data)
    if (!sessionStartTime) return formatElapsedTime(videoSeconds);
    const startMs = new Date(sessionStartTime).getTime();
    if (isNaN(startMs)) return formatElapsedTime(videoSeconds);
    const displayDate = new Date(startMs + videoSeconds * 1000);
    return displayDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [sessionStartTime]);

  const currentTimeRef = useRef(currentTime);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  // Pre-compute randomized trigger times on first render
  const randomizedTimes = useRef<Map<number, number>>(new Map());
  useEffect(() => {
    if (randomizedTimes.current.size === 0 && autoMessages.length > 0) {
      autoMessages.forEach((msg, idx) => {
        const variance = (Math.random() * 2 - 1) * timeVariance;
        randomizedTimes.current.set(idx, Math.max(0, msg.timeSec + variance));
      });
    }
  }, [autoMessages, timeVariance]);

  // Fire auto-chat messages based on video time
  useEffect(() => {
    autoMessages.forEach((msg, idx) => {
      if (firedAutoIds.current.has(idx)) return;
      const triggerTime = randomizedTimes.current.get(idx) ?? msg.timeSec;
      if (currentTime >= triggerTime) {
        firedAutoIds.current.add(idx);
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            name: msg.name,
            message: msg.message,
            timestamp: currentTime,
            wallTime: Date.now(),
            isAuto: true,
          },
        ]);
      }
    });
  }, [currentTime, autoMessages]);

  // Backfill auto-chat messages for late join (runs once on mount)
  const hasBackfilled = useRef(false);
  useEffect(() => {
    if (hasBackfilled.current || !initialTime || initialTime <= 0) return;
    hasBackfilled.current = true;

    const now = Date.now();
    const backfillMsgs: ChatMessage[] = autoMessages
      .filter(msg => msg.timeSec <= initialTime)
      .map((msg, idx) => ({
        id: `backfill-${idx}`,
        name: msg.name,
        message: msg.message,
        timestamp: msg.timeSec,
        wallTime: now - (initialTime - msg.timeSec) * 1000,
        isAuto: true,
      }));

    if (backfillMsgs.length > 0) {
      setMessages(prev => [...backfillMsgs, ...prev]);
      // Mark as fired so they don't trigger again during playback
      autoMessages.forEach((msg, idx) => {
        if (msg.timeSec <= initialTime) {
          firedAutoIds.current.add(idx);
        }
      });
    }
  }, [initialTime, autoMessages]);

  // Auto-scroll to bottom on new messages — only if user is already near the bottom.
  // Uses scrollTop directly instead of scrollIntoView to avoid scrolling ancestor
  // containers (which causes the whole page to shift/glitch).
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    if (isNearBottom) {
      container.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Load persisted user messages on mount (survives page refresh)
  useEffect(() => {
    if (!webinarId) return;

    fetch(`/api/webinar/${webinarId}/chat`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.messages?.length) return;
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs: ChatMessage[] = data.messages
            .filter((m: { id: string }) => !existingIds.has(m.id))
            .map((m: { id: string; name: string; message: string; timestamp: number; createdAt: string }) => ({
              id: m.id,
              name: m.name,
              message: m.message,
              timestamp: m.timestamp,
              wallTime: new Date(m.createdAt).getTime(),
            }));
          return [...prev, ...newMsgs];
        });
      })
      .catch(err => console.warn('[ChatRoom] Failed to load history:', err));
  }, [webinarId]);

  // Subscribe to real-time chat messages via SSE
  useEffect(() => {
    if (!webinarId) return;

    const eventSource = new EventSource(`/api/webinar/${webinarId}/chat/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          const msg = data.message;
          setMessages(prev => {
            // Deduplicate by id
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, {
              id: msg.id,
              name: msg.name,
              message: msg.message,
              timestamp: msg.timestamp,
              wallTime: Date.now(),
            }];
          });
        }
      } catch (err) {
        console.warn('[ChatRoom] Failed to parse SSE message:', err);
      }
    };

    return () => eventSource.close();
  }, [webinarId]);

  // Personal join message — "你已加入直播" after a short delay
  const hasShownJoin = useRef(false);
  useEffect(() => {
    if (hasShownJoin.current) return;
    hasShownJoin.current = true;

    const delay = 2000 + Math.random() * 1500; // 2-3.5s
    const timerId = setTimeout(() => {
      setMessages(prev => [...prev, {
        id: nextId(),
        name: '',
        message: '你已加入直播',
        timestamp: currentTimeRef.current,
        wallTime: Date.now(),
        isSystem: true,
      }]);
    }, delay);

    return () => clearTimeout(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simulate viewer join notifications
  useEffect(() => {
    if (!sessionStartTime) return;

    const joinNames = [
      '小美', '阿明', 'David', 'Emma', 'Kevin', '小芳', 'Jason', 'Linda',
      'Alex', '小雨', 'Tom', '阿华', 'Jenny', '小李', 'Michael', '小张',
    ];
    let timerId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = 15000 + Math.random() * 30000; // 15-45 seconds
      timerId = setTimeout(() => {
        const name = joinNames[Math.floor(Math.random() * joinNames.length)];
        setMessages(prev => [...prev, {
          id: nextId(),
          name: '',
          message: `${name} 加入了直播`,
          timestamp: currentTimeRef.current,
          wallTime: Date.now(),
          isSystem: true,
        }]);
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(timerId);
  }, [sessionStartTime]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const msg: ChatMessage = {
      id: nextId(),
      name: userName,
      message: text,
      timestamp: currentTime,
      wallTime: Date.now(),
    };
    // Don't add to local state — let the message arrive via SSE echo
    // to avoid duplication (client ID ≠ server ID).
    onSendMessage?.(msg);
    setInput('');
  }, [input, userName, currentTime, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex flex-col h-full bg-white text-[#1A1A1A] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E8E5DE] bg-[#FAFAF7]">
        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-semibold text-[#1A1A1A]">实时聊天</span>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-neutral-400 text-sm text-center mt-8">
            聊天消息将显示在这里...
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            {msg.isSystem ? (
              <span className="text-neutral-400 text-xs italic">{msg.message}</span>
            ) : (
              <>
                <span className="text-neutral-400 text-xs mr-2">{formatWallClock(msg.wallTime, msg.timestamp)}</span>
                <span className="font-semibold text-[#B8953F]">{msg.name}</span>
                <span className="text-neutral-600 ml-1">{msg.message}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-[#E8E5DE] bg-[#FAFAF7]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          className="flex-1 bg-white text-[#1A1A1A] text-sm px-3 py-2 rounded-md outline-none border border-[#E8E5DE] placeholder-[#9CA3AF] focus:ring-1 focus:ring-[#B8953F]"
          maxLength={200}
        />
        <button
          onClick={handleSend}
          className="bg-[#B8953F] hover:bg-[#A6842F] text-white text-sm px-4 py-2 rounded-md transition-colors"
        >
          发送
        </button>
      </div>
    </div>
  );
}
