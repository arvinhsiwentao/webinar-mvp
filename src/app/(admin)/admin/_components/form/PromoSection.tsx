'use client';

interface PromoFormFields {
  promoImageUrl: string;
  disclaimerText: string;
  sidebarDescription: string;
  endPageSalesCopy: string;
  endPageCtaText: string;
}

interface PromoSectionProps {
  formData: PromoFormFields;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFormData: (v: any) => void;
}

export default function PromoSection({ formData, setFormData }: PromoSectionProps) {
  return (
    <>
      {/* Promotional Content */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">推广内容</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-2">推广图片 URL</label>
            <input
              type="text"
              value={formData.promoImageUrl}
              onChange={(e) => setFormData({ ...formData, promoImageUrl: e.target.value })}
              placeholder="https://example.com/promo.jpg"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">免责声明</label>
            <textarea
              value={formData.disclaimerText}
              onChange={(e) => setFormData({ ...formData, disclaimerText: e.target.value })}
              rows={3}
              placeholder="投资有风险，入市需谨慎..."
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">侧边栏描述</label>
            <textarea
              value={formData.sidebarDescription}
              onChange={(e) => setFormData({ ...formData, sidebarDescription: e.target.value })}
              rows={3}
              placeholder="关于此次直播的详细描述..."
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* End Page Settings */}
      <section className="bg-white rounded-lg p-6 border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4">结束页设置</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-2">销售文案</label>
            <textarea
              value={formData.endPageSalesCopy}
              onChange={(e) => setFormData({ ...formData, endPageSalesCopy: e.target.value })}
              rows={4}
              placeholder="限时优惠，立即行动..."
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-500 mb-2">CTA 按钮文字</label>
            <input
              type="text"
              value={formData.endPageCtaText}
              onChange={(e) => setFormData({ ...formData, endPageCtaText: e.target.value })}
              placeholder="立即报名"
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
            />
          </div>
        </div>
      </section>
    </>
  );
}
