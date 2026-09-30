/**
 * Orders API client
 * ----------------------------------------------------------------------------
 * These endpoints return a flat body — { success: true, orders: [...] } — so
 * they use requestJson and unwrap here, the same reason checkout.ts does. See
 * the note in that file.
 *
 * The status vocabulary is worth stating once, because three tables use the
 * word "status" for different things:
 *
 *   orders.status            the order as a whole (paid, cancelled, refunded)
 *   order_items.item_status  one line (processing, shipped, delivered)
 *   order_shipments.shipment_status
 *                            one vendor's parcel — this is what a shopper
 *                            actually tracks, and what the dashboard shows
 *
 * An order with three shipments has no single shipment status, so the list
 * derives one: the least-progressed shipment decides, because an order is only
 * as complete as its slowest parcel.
 */

import { requestJson, ApiError, ApiResponse } from './http';

export interface OrderItem {
  id: string;
  order_id: string;
  retailer_id: string;
  product_id: string;
  variant_id: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  item_status: string;
  product_variants?: {
    id: string;
    sku: string;
    color: string | null;
    material?: string | null;
    images: string[];
    products?: { id: string; title: string; canvas_model_id?: string | null };
  } | null;
}

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  status: string;
  location: string | null;
  description: string | null;
  timestamp: string;
}

export interface OrderShipment {
  id: string;
  order_id: string;
  retailer_id: string;
  carrier_code: string | null;
  tracking_number: string | null;
  shipment_status: string;
  estimated_delivery: string | null;
  proof_of_delivery_url: string | null;
  retailers?: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string | null;
    country: string | null;
  } | null;
  order_tracking_events?: TrackingEvent[];
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  promotion_code: string | null;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  shipping_address: {
    fullName?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  } | null;
  payment_intent_id: string | null;
  payment_status: string | null;
  invoice_url: string | null;
  created_at: string;
  order_items?: OrderItem[];
  order_shipments?: OrderShipment[];
}

/** Ordered least to most progressed. Used to derive an order-level status. */
export const SHIPMENT_PROGRESSION = [
  'label_pending',
  'label_created',
  'in_transit',
  'out_for_delivery',
  'delivered',
] as const;

export type ShipmentStage = typeof SHIPMENT_PROGRESSION[number];

/**
 * One status for an order with many shipments: the least-progressed one.
 *
 * An order is only as complete as its slowest parcel — telling someone their
 * order is "delivered" when two of three boxes are still in transit is the kind
 * of thing that generates a support ticket and a refund request.
 */
export function deriveOrderStage(order: Order): ShipmentStage {
  const shipments = order.order_shipments ?? [];
  if (shipments.length === 0) return 'label_pending';

  let lowest = SHIPMENT_PROGRESSION.length - 1;
  for (const s of shipments) {
    const idx = SHIPMENT_PROGRESSION.indexOf(s.shipment_status as ShipmentStage);
    // An unrecognised status is treated as the earliest stage rather than
    // ignored, so a new vendor status can never make an order look finished.
    lowest = Math.min(lowest, idx === -1 ? 0 : idx);
  }
  return SHIPMENT_PROGRESSION[lowest];
}

function wrap<T extends { success: boolean; error?: string; message?: string }>(
  body: T | null,
): ApiResponse<T> {
  if (!body) return { success: false, error: 'Empty response from server' };
  if (!body.success) {
    return { success: false, error: body.error ?? body.message ?? 'Request failed' };
  }
  return { success: true, data: body };
}

function toFailure(err: unknown): ApiResponse<never> {
  if (err instanceof ApiError) return { success: false, error: err.message };
  const message =
    err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : 'Network error';
  return { success: false, error: message };
}

export async function getUserOrders(): Promise<ApiResponse<{ success: boolean; orders: Order[] }>> {
  try {
    const body = await requestJson<{ success: boolean; orders: Order[] }>({
      path: '/orders',
      method: 'GET',
    });
    return wrap(body);
  } catch (err) {
    return toFailure(err);
  }
}

export async function getOrderById(
  id: string,
): Promise<ApiResponse<{ success: boolean; order: Order }>> {
  try {
    const body = await requestJson<{ success: boolean; order: Order }>({
      path: `/orders/${encodeURIComponent(id)}`,
      method: 'GET',
    });
    return wrap(body);
  } catch (err) {
    return toFailure(err);
  }
}

export async function submitReturnRequest(
  orderId: string,
  payload: { order_item_id: string; reason: string; photo_urls?: string[] },
): Promise<ApiResponse<{ success: boolean; return_request: any }>> {
  try {
    const body = await requestJson<{ success: boolean; return_request: any }>({
      path: `/orders/${encodeURIComponent(orderId)}/returns`,
      method: 'POST',
      body: payload,
    });
    return wrap(body);
  } catch (err) {
    return toFailure(err);
  }
}