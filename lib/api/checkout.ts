import { requestApi, ApiResponse } from './http';

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CheckoutItemSnapshot {
  cart_item_id: string;
  variant_id: string;
  product_id: string;
  retailer_id: string;
  title: string;
  sku?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface RetailerGroupSnapshot {
  retailer_id: string;
  retailer_name: string;
  items: CheckoutItemSnapshot[];
  subtotal: number;
  shipping: {
    shipping_amount: number;
    estimated_delivery: string;
    policy_applied: string;
  };
  tax: {
    tax_amount: number;
    provider: string;
    note: string;
  };
}

export interface CheckoutSummary {
  user_id: string;
  cart_snapshot_hash: string;
  retailers: RetailerGroupSnapshot[];
  items: CheckoutItemSnapshot[];
  subtotal: number;
  shipping_total: number;
  tax_total: number;
  /** Taken off the goods subtotal only. Zero when no code applied. */
  discount_amount: number;
  promotion_id: string | null;
  promotion_code: string | null;
  grand_total: number;
  grand_total_cents: number;
  currency: string;
  shipping_address: ShippingAddress;
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  client_secret: string;
  checkout_attempt_id: string;
  summary: CheckoutSummary;
  error?: string;
}

export interface OrderResponse {
  success: boolean;
  status: 'succeeded' | 'processing' | 'stock_failed' | 'payment_failed' | 'not_found';
  order?: any;
  message?: string;
  error?: string;
}

/**
 * Start a payment.
 *
 * `promoCode` is the code only — never a discount amount. The server re-derives
 * the figure from a subtotal it calculates itself, using the same validator the
 * cart quote uses, so what the shopper was shown and what the card is charged
 * come from one place. An invalid or expired code is not an error: the returned
 * `summary.discount_amount` will simply be 0, which the checkout page should
 * reflect rather than silently keeping the cart's figure on screen.
 */
export async function createPaymentIntent(
  shippingAddress: ShippingAddress,
  promoCode?: string | null
): Promise<ApiResponse<CreatePaymentIntentResponse>> {
  return requestApi<CreatePaymentIntentResponse>({
    path: '/orders/create-payment-intent',
    method: 'POST',
    body: {
      shipping_address: shippingAddress,
      promo_code: promoCode ?? null,
    },
  });
}

export async function getOrderByPaymentIntent(
  paymentIntentId: string
): Promise<ApiResponse<OrderResponse>> {
  return requestApi<OrderResponse>({
    path: `/orders/by-payment-intent/${paymentIntentId}`,
    method: 'GET',
  });
}