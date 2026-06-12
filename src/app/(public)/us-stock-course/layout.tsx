import type { Metadata } from 'next';

// Default title for the us-stock-course section. The LP ([angle]) and tutorial
// pages override this with their own metadata; the client-component checkout /
// return pages (which can't export metadata) inherit this — so they no longer
// fall back to the root layout's webinar title.
export const metadata: Metadata = {
  title: 'US$1 美股入门课｜Mike是麦克',
};

export default function UsStockCourseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
