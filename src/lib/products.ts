/**
 * Product catalog — maps product IDs to Stripe prices, Google Sheet tabs, and display info.
 *
 * When switching from test to live:
 * - Update stripePriceId values to live Price IDs
 * - Or use environment variables (see getStripePriceId)
 */

export interface ProductConfig {
  id: string;
  name: string;
  shortName: string;
  price: number; // USD
  originalPrice?: number; // USD — official website price for comparison
  stripePriceId: string;
  sheetName: string; // Google Sheet tab name for activation codes
  productPackageId: string; // 商品包編號 — for fulfillment tracking
  salesCode: string; // 銷售代碼 — for fulfillment tracking
  description: string;
  includes: string[]; // What's included (for display)
  bonus?: string; // e.g., "送1个月APP权限"
  isBundle: boolean;
}

// Product IDs — used throughout the app
export const PRODUCT_IDS = {
  OPTIONS: 'options',
  ETF_OPTIONS: 'etf-options',
  APP_QUARTERLY: 'app-quarterly',
  BUNDLE: 'bundle',
} as const;

export type ProductId = typeof PRODUCT_IDS[keyof typeof PRODUCT_IDS];

/**
 * Product catalog.
 * stripePriceId: uses env var override if set, otherwise falls back to test mode IDs.
 */
export const PRODUCTS: Record<ProductId, ProductConfig> = {
  [PRODUCT_IDS.OPTIONS]: {
    id: PRODUCT_IDS.OPTIONS,
    name: '期权策略课程',
    shortName: '期权课程',
    price: 99,
    stripePriceId: process.env.STRIPE_PRICE_OPTIONS || 'price_1TKLLiGXZySy2dKhqUbjD9h4',
    sheetName: '期權+App(月)',
    productPackageId: '8892',
    salesCode: '13198',
    description: '震荡行情的美股期权操作解析',
    includes: ['期权策略课程（无期限回看）', 'Sell Put / Sell Call 完整教学'],
    bonus: '送1个月APP权限',
    isBundle: false,
  },
  [PRODUCT_IDS.ETF_OPTIONS]: {
    id: PRODUCT_IDS.ETF_OPTIONS,
    name: 'ETF+期权课程组合',
    shortName: 'ETF+期权',
    price: 249,
    stripePriceId: process.env.STRIPE_PRICE_ETF_OPTIONS || 'price_1TKLLiGXZySy2dKh7DKleiYU',
    sheetName: '期權+ETF+App(月)',
    productPackageId: '8891',
    salesCode: '13196',
    description: 'ETF 进阶资产放大术 + 期权操作解析',
    includes: ['ETF 实战课程（无期限回看）', '期权策略课程（无期限回看）', '攻守框架完整教学'],
    bonus: '送1个月APP权限',
    isBundle: false,
  },
  [PRODUCT_IDS.APP_QUARTERLY]: {
    id: PRODUCT_IDS.APP_QUARTERLY,
    name: 'MIKE是麦克 APP 季度方案',
    shortName: 'APP季方案',
    price: 249,
    stripePriceId: process.env.STRIPE_PRICE_APP_QUARTERLY || 'price_1TKLLjGXZySy2dKhHUDFHsIz',
    sheetName: 'App(季)',
    productPackageId: '8893',
    salesCode: '13199',
    description: 'APP 3个月完整权限',
    includes: ['价值灯号', 'Mike 关注清单', '语音直播', '学员聊天室', '付费内容文章'],
    isBundle: false,
  },
  [PRODUCT_IDS.BUNDLE]: {
    id: PRODUCT_IDS.BUNDLE,
    name: '美股二加一实战组合包',
    shortName: '完整组合包',
    price: 599,
    originalPrice: 1696,
    stripePriceId: process.env.STRIPE_PRICE_BUNDLE || 'price_1TKLLjGXZySy2dKhfTh6ojrv',
    sheetName: '工作表1',
    productPackageId: '8764',
    salesCode: '12991',
    description: 'ETF课程 + 期权课程 + APP一年权限',
    includes: ['ETF 实战课程（无期限回看）', '期权策略课程（无期限回看）', 'APP 一年完整权限'],
    isBundle: true,
  },
};

/** Get product by ID */
export function getProduct(id: string): ProductConfig | undefined {
  return PRODUCTS[id as ProductId];
}

/** Get all products as array (bundle first) */
export function getAllProducts(): ProductConfig[] {
  return [
    PRODUCTS[PRODUCT_IDS.BUNDLE],
    PRODUCTS[PRODUCT_IDS.APP_QUARTERLY],
    PRODUCTS[PRODUCT_IDS.ETF_OPTIONS],
    PRODUCTS[PRODUCT_IDS.OPTIONS],
  ];
}

/**
 * Exclusion rules: selecting one product disables others.
 * Returns product IDs that should be disabled when the given product is selected.
 */
export function getExcludedProducts(selectedId: ProductId): ProductId[] {
  switch (selectedId) {
    case PRODUCT_IDS.BUNDLE:
      // Bundle includes everything — disable all others
      return [PRODUCT_IDS.OPTIONS, PRODUCT_IDS.ETF_OPTIONS, PRODUCT_IDS.APP_QUARTERLY];
    case PRODUCT_IDS.ETF_OPTIONS:
      // ETF+Options includes Options — disable Options and Bundle
      return [PRODUCT_IDS.OPTIONS, PRODUCT_IDS.BUNDLE];
    case PRODUCT_IDS.OPTIONS:
      // Options conflicts with ETF+Options and Bundle
      return [PRODUCT_IDS.ETF_OPTIONS, PRODUCT_IDS.BUNDLE];
    case PRODUCT_IDS.APP_QUARTERLY:
      // APP quarterly conflicts with Bundle (which has APP annual)
      return [PRODUCT_IDS.BUNDLE];
    default:
      return [];
  }
}

/**
 * Calculate which products are disabled given current selection.
 */
export function getDisabledProducts(selectedIds: ProductId[]): Set<ProductId> {
  const disabled = new Set<ProductId>();
  for (const id of selectedIds) {
    for (const excluded of getExcludedProducts(id)) {
      disabled.add(excluded);
    }
  }
  return disabled;
}

/**
 * Calculate total price for selected products.
 */
export function calculateTotal(selectedIds: ProductId[]): number {
  return selectedIds.reduce((sum, id) => {
    const product = PRODUCTS[id];
    return sum + (product?.price || 0);
  }, 0);
}
