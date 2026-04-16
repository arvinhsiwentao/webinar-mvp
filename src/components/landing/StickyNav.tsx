'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { trackGA4 } from '@/lib/analytics';

interface NavItem {
  id: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'content', label: '讲座内容' },
  { id: 'speaker', label: '讲师介绍' },
  { id: 'testimonials', label: '学员反馈' },
  { id: 'schedule', label: '场次时间' },
  { id: 'faq', label: '常见问题' },
];

interface StickyNavProps {
  onCtaClick: () => void;
  logoSrc?: string;
}

export default function StickyNav({ onCtaClick, logoSrc }: StickyNavProps) {
  const [activeId, setActiveId] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const ids = NAV_ITEMS.map(item => item.id);
    const elements = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter(e => e.isIntersecting);
        if (visibleEntries.length > 0) {
          const sorted = visibleEntries.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          setActiveId(sorted[0].target.id);
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [menuOpen]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    trackGA4('c_nav_click', { nav_item: id });
    const navHeight = 56;
    const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top, behavior: 'smooth' });
    setMenuOpen(false);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40">
      <div className="bg-[#0a0a08]/95 backdrop-blur-md border-b border-[#C9A962]/15 shadow-[0_1px_8px_rgba(0,0,0,0.3)]">
        <div className="max-w-5xl mx-auto h-14 flex items-center justify-between px-4 md:px-6">
          {/* Logo + Brand name */}
          <div className="flex-shrink-0 mr-4 flex items-center gap-2.5">
            {logoSrc ? (
              <Image src={logoSrc} alt="Logo" width={120} height={32} className="h-7 md:h-8 w-auto object-contain rounded" />
            ) : (
              <div className="h-7 md:h-8 w-20 md:w-24 rounded bg-white/10 border border-white/10 flex items-center justify-center text-[10px] text-neutral-500">
                LOGO
              </div>
            )}
            <span className="text-[15px] md:text-base font-semibold tracking-wide text-[#E8D5A3]" style={{ fontFamily: '"Noto Serif SC", "Songti SC", "SimSun", serif' }}>
              Mike是麦克
            </span>
          </div>

          {/* Desktop: horizontal nav items */}
          <div className="hidden md:flex flex-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-max">
              {NAV_ITEMS.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`
                      relative px-4 py-2 text-[15px] font-semibold rounded-md
                      transition-colors duration-200 whitespace-nowrap cursor-pointer
                      ${isActive
                        ? 'text-[#C9A962]'
                        : 'text-neutral-500 hover:text-neutral-300'
                      }
                    `}
                    style={{ fontFamily: '"Noto Serif SC", "Songti SC", "SimSun", serif' }}
                  >
                    {item.label}
                    <span
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#C9A962] rounded-full transition-all duration-300"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile: hamburger button */}
          <div className="md:hidden flex-1 flex justify-end" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="p-2 text-neutral-400 hover:text-[#C9A962] transition-colors"
              aria-label="选单"
            >
              {menuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute top-14 right-4 bg-[#0a0a08]/95 backdrop-blur-md border border-[#C9A962]/20 rounded-lg shadow-xl py-2 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollTo(item.id)}
                      className={`
                        w-full text-left px-4 py-2.5 text-sm font-medium transition-colors
                        ${isActive
                          ? 'text-[#C9A962] bg-[#C9A962]/10'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                        }
                      `}
                      style={{ fontFamily: '"Noto Serif SC", "Songti SC", "SimSun", serif' }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop CTA button */}
          <div className="hidden md:block flex-shrink-0 ml-4">
            <button
              onClick={onCtaClick}
              className="text-sm font-semibold px-5 py-2 rounded-lg border border-[#C9A962]/50 text-[#E8D5A3] bg-[#C9A962]/10 hover:bg-[#C9A962]/20 hover:border-[#C9A962] transition-all duration-300 cursor-pointer"
              style={{ fontFamily: '"Noto Serif SC", serif' }}
            >
              免费报名
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
