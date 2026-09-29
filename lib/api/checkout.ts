import { requestJson, ApiError, ApiResponse } from './http';

/**
 * Checkout API client
 * ----------------------------------------------------------------------------
 * These two endpoints return a FLAT body:
 *
 *   { success: true, client_secret, checkout_attempt_id, summary }
 *
 * requestApi's isApiResponse() sees a boolean `success` and passes the object
 * straight through as ApiResponse<T> — but ApiSuccess<T> promises the payload
 * under `.data`, and there is no `data` key. Callers then destructure
 * `response.data.client_secret` and get "Cannot destructure property
 * 'client_secret' of 't.data' as it is undefined."
 *
 * So these use requestJson (raw body, throws on non-2xx) and wrap the result
 * into the ApiResponse shape here. Normalising at this seam rather than
 * changing the backend keeps the contract that /checkout/success and any other
 * reader already depends on.
 */

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

/** Wrap a flat `{ success, ...payload }` body into ApiResponse<T>. */
function wrap<T extends { success: boolean; error?: string; message?: string }>(
  body: T | null,
): ApiResponse<T> {
  if (!body) {
    return { success: false, error: 'Empty response from server' };
  }
  if (!body.success) {
    return { success: false, error: body.error ?? body.message ?? 'Request failed' };
  }
  return { success: true, data: body };
}

function toFailure(err: unknown): ApiResponse<never> {
  if (err instanceof ApiError) {
    return { success: false, error: err.message };
  }
  const message =
    err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : 'Network error';
  return { success: false, error: message };
}

/**
 * Start a payment.
 *
 * `promoCode` is the code only — never a discount amount. The server re-derives
 * the figure from a subtotal it calculates itself, using the same validator the
 * cart quote uses, so what the shopper was shown and what the card is charged
 * come from one place. An invalid or expired code is not an error: the returned
 * `summary.discount_amount` is simply 0, and the checkout page says so rather
 * than quietly keeping the cart's figure on screen.
 */
export async function createPaymentIntent(
  shippingAddress: ShippingAddress,
  promoCode?: string | null,
): Promise<ApiResponse<CreatePaymentIntentResponse>> {
  try {
    const body = await requestJson<CreatePaymentIntentResponse>({
      path: '/orders/create-payment-intent',
      method: 'POST',
      body: {
        shipping_address: shippingAddress,
        promo_code: promoCode ?? null,
      },
    });
    return wrap(body);
  } catch (err) {
    return toFailure(err);
  }
}

export async function getOrderByPaymentIntent(
  paymentIntentId: string,
): Promise<ApiResponse<OrderResponse>> {
  try {
    const body = await requestJson<OrderResponse>({
      path: `/orders/by-payment-intent/${paymentIntentId}`,
      method: 'GET',
    });
    return wrap(body);
  } catch (err) {
    return toFailure(err);
  }
}