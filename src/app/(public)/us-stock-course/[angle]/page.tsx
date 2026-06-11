import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { US_STOCK_ANGLES, isValidAngle, ANGLE_CONFIG } from '@/lib/usStockCourse';
import UsStockCourseBody from '@/components/us-stock-course/UsStockCourseBody';

// Pre-render the 3 valid angles; anything else 404s.
export function generateStaticParams() {
  return US_STOCK_ANGLES.map((angle) => ({ angle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ angle: string }>;
}): Promise<Metadata> {
  const { angle } = await params;
  if (!isValidAngle(angle)) return {};
  const cfg = ANGLE_CONFIG[angle];
  return {
    title: `${cfg.heroHeadline}｜$1 美股入门套餐`,
    description: cfg.heroSub,
    openGraph: {
      title: `${cfg.heroHeadline}｜$1 美股入门套餐`,
      description: cfg.heroSub,
    },
  };
}

export default async function UsStockCourseAnglePage({
  params,
}: {
  params: Promise<{ angle: string }>;
}) {
  const { angle } = await params;
  if (!isValidAngle(angle)) notFound();

  return <UsStockCourseBody angle={angle} />;
}
