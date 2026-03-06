'use client';

import { useState, useRef, useEffect } from 'react';

interface CountryOption {
  code: string;
  dial: string;
  name: string;
  iso: string;
}

const COUNTRIES: CountryOption[] = [
  { code: 'US', dial: '+1', name: '美国/加拿大', iso: 'us' },
  { code: 'CN', dial: '+86', name: '中国', iso: 'cn' },
  { code: 'TW', dial: '+886', name: '台湾', iso: 'tw' },
  { code: 'HK', dial: '+852', name: '香港', iso: 'hk' },
  { code: 'SG', dial: '+65', name: '新加坡', iso: 'sg' },
  { code: 'MY', dial: '+60', name: '马来西亚', iso: 'my' },
  { code: 'JP', dial: '+81', name: '日本', iso: 'jp' },
  { code: 'KR', dial: '+82', name: '韩国', iso: 'kr' },
  { code: 'GB', dial: '+44', name: '英国', iso: 'gb' },
  { code: 'AU', dial: '+61', name: '澳大利亚', iso: 'au' },
];

function FlagImg({ iso, size = 20 }: { iso: string; size?: number }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      srcSet={`https://flagcdn.com/w80/${iso}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt=""
      className="inline-block rounded-[2px] object-cover"
      style={{ width: size, height: Math.round(size * 0.75) }}
      loading="eager"
    />
  );
}

interface CountryCodeSelectProps {
  value: string;
  onChange: (dial: string) => void;
}

export default function CountryCodeSelect({ value, onChange }: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find((c) => c.dial === value) || COUNTRIES[0];

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-[50px] px-3 bg-white border border-[#E8E5DE] border-r-0 rounded-l transition-colors hover:bg-[#FAFAF7]"
        style={{ minWidth: '100px' }}
      >
        <FlagImg iso={selected.iso} size={22} />
        <span className="text-sm font-medium text-neutral-700 tracking-wide">
          {selected.dial}
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={`ml-auto text-neutral-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-[220px] bg-white border border-[#E8E5DE] rounded-lg shadow-lg overflow-hidden"
          style={{
            animation: 'countryDropdownIn 150ms ease-out',
          }}
        >
          <style>{`
            @keyframes countryDropdownIn {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {COUNTRIES.map((country) => {
              const isSelected = country.dial === value;
              return (
                <button
                  key={country.dial}
                  type="button"
                  onClick={() => {
                    onChange(country.dial);
                    setOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                    ${isSelected
                      ? 'bg-[#B8953F]/8'
                      : 'hover:bg-[#FAFAF7]'
                    }
                  `}
                >
                  <FlagImg iso={country.iso} size={22} />
                  <span className={`text-sm flex-1 ${isSelected ? 'text-[#B8953F] font-medium' : 'text-neutral-700'}`}>
                    {country.name}
                  </span>
                  <span className={`text-sm tabular-nums ${isSelected ? 'text-[#B8953F] font-medium' : 'text-neutral-400'}`}>
                    {country.dial}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
