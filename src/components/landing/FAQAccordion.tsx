'use client';

import { useState } from 'react';
import { trackGA4 } from '@/lib/analytics';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className="border border-[#C9A962]/20 rounded-lg bg-white/[0.04] overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_12px_rgba(201,169,98,0.08)]"
          >
            <button
              onClick={() => {
                if (!isOpen) trackGA4('c_faq_click', { question_index: idx, question_text: item.question });
                setOpenIndex(isOpen ? null : idx);
              }}
              className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer"
            >
              <span className="text-base md:text-lg font-medium text-neutral-200 pr-4">
                {item.question}
              </span>
              <span
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-[#C9A962] transition-transform duration-300"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: isOpen ? '200px' : '0',
                opacity: isOpen ? 1 : 0,
              }}
            >
              <div className="px-6 pb-5 text-sm md:text-base text-neutral-400 leading-relaxed">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
