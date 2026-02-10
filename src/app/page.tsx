import { redirect } from 'next/navigation';

// Single-purpose site for Mike是麥克's webinar
// Homepage redirects directly to the landing page
export default function HomePage() {
  redirect('/webinar/1');
}
