'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  isAuto?: boolean;
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
  /** Session ID for the current viewer session */
  sessionId?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

let msgIdCounter = 0;
function nextId(): string {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

export default function ChatRoom({
  currentTime,
  autoMessages = [],
  timeVariance = 5,
  userName = 'Anonymous',
  onSendMessage,
  webinarId,
  sessionId,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firedAutoIds = useRef<Set<number>>(new Set());

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
            isAuto: true,
          },
        ]);
      }
    });
  }, [currentTime, autoMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
            }];
          });
        }
      } catch { /* ignore parse errors */ }
    };

    return () => eventSource.close();
  }, [webinarId]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const msg: ChatMessage = {
      id: nextId(),
      name: userName,
      message: text,
      timestamp: currentTime,
    };
    setMessages((prev) => [...prev, msg]);
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
    <div className="flex flex-col h-full bg-neutral-900 text-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-700 bg-neutral-800">
        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-semibold">Live Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-neutral-500 text-sm text-center mt-8">
            Chat messages will appear here...
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            <span className="text-neutral-500 text-xs mr-2">{formatTime(msg.timestamp)}</span>
            <span className="font-semibold text-[#C9A962]">{msg.name}</span>
            <span className="text-neutral-300 ml-1">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-neutral-700 bg-neutral-800">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-neutral-700 text-white text-sm px-3 py-2 rounded-md outline-none placeholder-neutral-500 focus:ring-1 focus:ring-[#C9A962]"
          maxLength={200}
        />
        <button
          onClick={handleSend}
          className="bg-[#C9A962] hover:bg-[#D4BA7A] text-neutral-950 text-sm px-4 py-2 rounded-md transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
