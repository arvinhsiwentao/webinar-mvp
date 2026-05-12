'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Google 一鍵填寫按鈕。
 * 載入 Google Identity Services script，渲染官方按鈕。
 * 用戶選帳號後 → POST 到 /api/auth/google-verify → 觸發 onFilled。
 * 不發 session、不寫 cookie，只是「資料代填」。
 */

interface GoogleQuickFillButtonProps {
  clientId: string;
  onFilled: (data: { email: string; name: string }) => void;
  onError?: (message: string) => void;
}

// GIS 全域型別宣告
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'small' | 'medium' | 'large';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            }
          ) => void;
        };
      };
    };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let scriptLoadPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.google?.accounts?.id) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GIS script failed')));
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GIS script failed to load'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export default function GoogleQuickFillButton({
  clientId,
  onFilled,
  onError,
}: GoogleQuickFillButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            setVerifying(true);
            try {
              const res = await fetch('/api/auth/google-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
              });
              if (!res.ok) throw new Error('verify failed');
              const data = await res.json();
              if (!data.email) throw new Error('no email');
              onFilled({ email: data.email, name: data.name || '' });
            } catch (err) {
              console.error('[GoogleQuickFill] verify error:', err);
              onError?.('Google 登入驗證失敗，請改用手動填寫');
            } finally {
              setVerifying(false);
            }
          },
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
          locale: 'zh_CN',
        });
      })
      .catch((err) => {
        console.error('[GoogleQuickFill] script load error:', err);
        onError?.('无法加载 Google 登入');
      });

    return () => { cancelled = true; };
  }, [clientId, onFilled, onError]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={buttonRef} className="min-h-[44px]" />
      {verifying && (
        <p className="text-xs text-neutral-400">验证中...</p>
      )}
    </div>
  );
}
