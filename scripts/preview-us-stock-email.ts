/**
 * Render the current purchase-confirmation email for a us-stock order to an HTML file.
 * Run: npx tsx scripts/preview-us-stock-email.ts  → open scripts/us-stock-email-preview.html
 */
import { writeFileSync } from 'fs';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { purchaseConfirmationEmail } = await import('../src/lib/email');
  const params = purchaseConfirmationEmail({
    to: 'test@example.com',
    name: '测试用户',
    activationCodes: [
      { productId: 'us-stock-1plus3', productName: '课程启用序号', code: 'COURSE-AB12-CD34' },
      { productId: 'us-stock-1plus3', productName: 'App 3 天 VIP 启用序号', code: 'APPVIP-EF56-GH78' },
    ],
    orderDate: '2026/06/12',
    orderId: 'pi_3TestSandbox1234567890',
    email: 'test@example.com',
    tutorialUrl: 'http://localhost:3000/us-stock-course/tutorial',
  });
  console.log('Subject:', params.subject);
  writeFileSync('scripts/us-stock-email-preview.html', params.html, 'utf-8');
  console.log('Wrote scripts/us-stock-email-preview.html');
}
main().catch((e) => { console.error(e); process.exit(1); });
