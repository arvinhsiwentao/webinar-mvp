'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function WaitingRedirect() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(`/webinar/${params.id}/lobby${query ? `?${query}` : ''}`);
  }, [params.id, searchParams, router]);

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
