import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { resolveVendorUser } from "@/app/api/vendor/_utils/auth";

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Supabase service role credentials not configured." },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || undefined;
    const businessName = searchParams.get("businessName") || undefined;

    const { userId } = await resolveVendorUser(req, {
      workEmail: email,
      businessName,
    });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }

    // 1. Find all retailers belonging to this vendor
    const { data: retailers } = await adminClient
      .from("retailers")
      .select("id, name")
      .eq("vendor_id", userId);

    const retailerIds = (retailers || []).map((r) => r.id);

    if (retailerIds.length === 0) {
      return NextResponse.json({ success: true, orders: [] });
    }

    // 2. Fetch all order_items belonging to these retailers
    const { data: items, error: itemsErr } = await adminClient
      .from("order_items")
      .select(`
        id,
        order_id,
        retailer_id,
        product_id,
        variant_id,
        unit_price,
        quantity,
        total_price,
        item_status,
        production_stage,
        orders (
          id,
          order_number,
          user_id,
          status,
          total_amount,
          currency,
          shipping_address,
          created_at
        ),
        product_variants (
          id,
          sku,
          color,
          material,
          images,
          products (
            id,
            title,
            canvas_model_id
          )
        )
      `)
      .in("retailer_id", retailerIds)
      .order("order_id", { ascending: false });

    if (itemsErr) {
      console.error("[Vendor Orders GET] DB error:", itemsErr.message);
      return NextResponse.json({ success: false, error: itemsErr.message }, { status: 500 });
    }

    // 3. Fetch shipments for all distinct orders
    const distinctOrderIds = Array.from(
      new Set(
        ((items || []) as any[])
          .map((it: any) => (Array.isArray(it.orders) ? it.orders[0]?.id : it.orders?.id) || it.order_id)
          .filter(Boolean)
      )
    );

    let shipments: any[] = [];
    if (distinctOrderIds.length > 0) {
      const { data: shipData } = await adminClient
        .from("order_shipments")
        .select("id, order_id, retailer_id, tracking_number, shipment_status, carrier_code")
        .in("order_id", distinctOrderIds);
      shipments = shipData || [];
    }

    // 4. Group order items by order_id
    const orderMap = new Map<string, any>();

    for (const it of (items || []) as any[]) {
      const order = Array.isArray(it.orders) ? it.orders[0] : it.orders;
      if (!order) continue;

      if (!orderMap.has(order.id)) {
        const address =
          typeof order.shipping_address === "object" && order.shipping_address !== null
            ? order.shipping_address
            : {};

        const placedDate = new Date(order.created_at);
        const placedFormatted =
          placedDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }) +
          " · " +
          placedDate.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });

        const dueDate = new Date(placedDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        const dueFormatted = dueDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });

        const ship =
          shipments.find((s) => s.order_id === order.id && retailerIds.includes(s.retailer_id)) ||
          shipments.find((s) => s.order_id === order.id);

        const isShipped =
          ship?.shipment_status === "dispatched" ||
          ship?.shipment_status === "in_transit" ||
          it.item_status === "shipped" ||
          order.status === "shipped";

        const isDelivered =
          ship?.shipment_status === "delivered" ||
          it.item_status === "delivered" ||
          order.status === "delivered";

        let resolvedStatus = mapStatus(it.item_status || order.status);
        if (isDelivered) {
          resolvedStatus = "delivered";
        } else if (isShipped) {
          resolvedStatus = "shipped";
        }

        // Restore production_stage from DB so factory orders survive a refresh.
        // production_stage is only set on order_items. The first item with a
        // non-null value wins.  For pre-dispatch factory stages we override
        // resolvedStatus so the UI badge matches the persisted stage.
        const dbProductionStage: string | null = (it as any).production_stage || null;
        const PRE_DISPATCH = ["materials", "production", "qc", "ready"];
        if (dbProductionStage && PRE_DISPATCH.includes(dbProductionStage) && !isShipped && !isDelivered) {
          resolvedStatus = dbProductionStage as string;
        }

        orderMap.set(order.id, {
          id: order.order_number || `NOOI-${order.id.slice(0, 6)}`,
          shipmentId: ship?.id || order.id,
          orderNumber: order.order_number || `NOOI-${order.id.slice(0, 6)}`,
          rawOrderId: order.id,
          placed: placedFormatted,
          cust: address.fullName || "Customer",
          city: address.city || "Riyadh",
          email: address.email || "shopper@nooi.com",
          phone: address.phone || "+966 50 123 4567",
          addr: address.street || "Main Boulevard",
          postcode: address.zipCode || address.postal || "12211",
          notes: address.notes || "",
          value: 0,
          due: dueFormatted,
          dueDays: 14,
          status: resolvedStatus,
          productionStage: dbProductionStage,
          overdue: false,
          carrierCode: ship?.carrier_code || undefined,
          tracking: ship?.tracking_number || "",
          trackingUrl: ship?.tracking_url || undefined,
          history: [
            {
              at: placedFormatted,
              text: "Order placed by customer via Nooi Marketplace",
            },
            {
              at: placedFormatted,
              text: "Payment authorized & ready for fulfillment",
            },
          ],
          lines: [],
        });
      }

      const entry = orderMap.get(order.id);
      entry.value += Number(it.total_price) || 0;

      // If a later item in the same order has a production_stage, prefer it
      // over the null we seeded (first-item sets it, later items update if non-null).
      const laterStage: string | null = (it as any).production_stage || null;
      if (laterStage && !entry.productionStage) {
        entry.productionStage = laterStage;
        const PRE_D = ["materials", "production", "qc", "ready"];
        if (PRE_D.includes(laterStage) && entry.status !== "shipped" && entry.status !== "delivered") {
          entry.status = laterStage;
        }
      }

      const variant = Array.isArray(it.product_variants) ? it.product_variants[0] : it.product_variants;
      const product = variant && (Array.isArray(variant.products) ? variant.products[0] : variant.products);

      const pTitle = product?.title || "Furniture Item";
      const pColor = variant?.color || "Standard";
      const pMaterial = variant?.material || "Standard finish";

      entry.lines.push({
        n: pTitle,
        q: it.quantity,
        p: Number(it.unit_price),
        d: entry.due,
        m: pMaterial,
        c: pColor,
      });
    }

    const ordersList = Array.from(orderMap.values());

    return NextResponse.json({
      success: true,
      orders: ordersList,
    });
  } catch (err: any) {
    console.error("[Vendor Orders GET Exception]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch orders." },
      { status: 500 }
    );
  }
}

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const {
//       shippingAddress,
//       items,
//       totalAmount,
//       currency,
//       userId: shopperId,
//     } = body;

//     if (!Array.isArray(items) || items.length === 0) {
//       return NextResponse.json(
//         { success: false, error: "Items array is required to create an order." },
//         { status: 400 }
//       );
//     }

//     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
//     const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
//     if (!supabaseUrl || !serviceRoleKey) {
//       return NextResponse.json(
//         { success: false, error: "Supabase service role credentials not configured." },
//         { status: 500 }
//       );
//     }

//     const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

//     // 1. Generate order number
//     const orderNumber = `NOOI-${Math.floor(100000 + Math.random() * 900000)}`;
//     const calcSubtotal = items.reduce(
//       (sum: number, it: any) => sum + (Number(it.price || it.unit_price) * Number(it.quantity || 1)),
//       0
//     );
//     const finalTotal = Number(totalAmount) || calcSubtotal;

//     // Get an auth user if possible or use null/first user
//     let assignedUserId = shopperId || null;
//     if (!assignedUserId) {
//       const { data: users } = await adminClient.auth.admin.listUsers({ perPage: 1 });
//       assignedUserId = users?.users?.[0]?.id || null;
//     }

//     // 2. Insert order
//     const { data: orderData, error: orderErr } = await adminClient
//       .from("orders")
//       .insert({
//         order_number: orderNumber,
//         user_id: assignedUserId,
//         status: "paid",
//         subtotal: calcSubtotal,
//         tax_amount: 0,
//         shipping_amount: 0,
//         total_amount: finalTotal,
//         currency: currency || "SAR",
//         shipping_address: shippingAddress || {
//           fullName: "Marketplace Shopper",
//           street: "King Fahd Road",
//           city: "Riyadh",
//           state: "Riyadh",
//           zipCode: "11564",
//           country: "SA",
//         },
//       })
//       .select()
//       .single();

//     if (orderErr) {
//       console.error("[Vendor Orders POST] Order insert error:", orderErr.message);
//       return NextResponse.json(
//         { success: false, error: `Failed to insert order: ${orderErr.message}` },
//         { status: 500 }
//       );
//     }

//     // 3. For each item, look up or verify retailer_id and product/variant
//     const orderItemRows = [];
//     const retailerSet = new Set<string>();

//     for (const it of items) {
//       let retailerId = it.retailerId || it.retailer_id || null;
//       let productId = it.productId || it.product_id || null;

//       // If only variantId is provided (cart-based order), look up product and retailer
//       if (it.variantId || it.variant_id) {
//         const vid = it.variantId || it.variant_id;
//         const { data: variantRow } = await adminClient
//           .from("product_variants")
//           .select("id, product_id, products(id, retailer_id)")
//           .eq("id", vid)
//           .maybeSingle();

//         if (variantRow) {
//           const productRow = Array.isArray(variantRow.products)
//             ? variantRow.products[0]
//             : variantRow.products;
//           if (!productId) productId = variantRow.product_id || productRow?.id || null;
//           if (!retailerId) retailerId = productRow?.retailer_id || null;
//         }
//       }

//       // Fallback: look up retailer_id from product table
//       if (!retailerId && productId) {
//         const { data: pRow } = await adminClient
//           .from("products")
//           .select("retailer_id")
//           .eq("id", productId)
//           .maybeSingle();
//         retailerId = pRow?.retailer_id || null;
//       }

//       // Final fallback: use the first available retailer
//       if (!retailerId) {
//         const { data: firstRet } = await adminClient
//           .from("retailers")
//           .select("id")
//           .limit(1)
//           .maybeSingle();
//         retailerId = firstRet?.id || null;
//       }

//       if (retailerId) retailerSet.add(retailerId);

//       const unitPrice = Number(it.price || it.unit_price) || 0;
//       const quantity = parseInt(it.quantity, 10) || 1;

//       orderItemRows.push({
//         order_id: orderData.id,
//         retailer_id: retailerId,
//         product_id: productId,
//         variant_id: it.variantId || it.variant_id || null,
//         unit_price: unitPrice,
//         quantity,
//         total_price: unitPrice * quantity,
//         item_status: "paid",
//       });
//     }

//     if (orderItemRows.length > 0) {
//       const { error: itemsInsertErr } = await adminClient
//         .from("order_items")
//         .insert(orderItemRows);

//       if (itemsInsertErr) {
//         console.warn("[Vendor Orders POST] Order items insert warning:", itemsInsertErr.message);
//       }
//     }

//     // 4. Create shipment records for each retailer
//     for (const rId of Array.from(retailerSet)) {
//       await adminClient.from("order_shipments").insert({
//         order_id: orderData.id,
//         retailer_id: rId,
//         carrier_code: "ARAMEX",
//         tracking_number: `NOOI-${Math.floor(10000000 + Math.random() * 90000000)}`,
//         shipment_status: "label_created",
//       });
//     }

//     return NextResponse.json({
//       success: true,
//       message: "Order placed successfully.",
//       order: {
//         id: orderData.id,
//         order_number: orderNumber,
//         total_amount: finalTotal,
//       },
//     });
//   } catch (err: any) {
//     console.error("[Vendor Orders POST Exception]:", err);
//     return NextResponse.json(
//       { success: false, error: err.message || "Failed to create order." },
//       { status: 500 }
//     );
//   }
// }

export async function PATCH(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Supabase service role credentials not configured." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { orderId, shipmentId, status, tracking, carrierCode } = body;

    if ((!orderId && !shipmentId) || !status) {
      return NextResponse.json(
        { success: false, error: "orderId or shipmentId, and status are required." },
        { status: 400 }
      );
    }

    const { userId } = await resolveVendorUser(req, {
      workEmail: body.workEmail,
      businessName: body.businessName,
    });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

    // 1. Find retailers belonging to this vendor
    const { data: retailers } = await adminClient
      .from("retailers")
      .select("id")
      .eq("vendor_id", userId);

    const retailerIds = (retailers || []).map((r) => r.id);

    // 2. Find matching order by shipmentId or orderId
    let order: any = null;
    let existingShip: any = null;

    if (shipmentId) {
      const { data: sRow } = await adminClient
        .from("order_shipments")
        .select("id, order_id, carrier_code, tracking_number, shipment_status")
        .eq("id", shipmentId)
        .maybeSingle();

      if (sRow) {
        existingShip = sRow;
        const { data: oRow } = await adminClient
          .from("orders")
          .select("id, order_number, status")
          .eq("id", sRow.order_id)
          .maybeSingle();
        order = oRow;
      }
    }

    if (!order && orderId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      let orderQuery = adminClient.from("orders").select("id, order_number, status");
      if (isUuid) {
        orderQuery = orderQuery.eq("id", orderId);
      } else {
        orderQuery = orderQuery.eq("order_number", orderId);
      }
      const { data: oRow, error: ordErr } = await orderQuery.maybeSingle();
      if (!ordErr) order = oRow;
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order or shipment not found." },
        { status: 404 }
      );
    }

    // 3. Update order_items status for this order
    let itemUpdateQuery = adminClient
      .from("order_items")
      .update({ item_status: status })
      .eq("order_id", order.id);

    if (retailerIds.length > 0) {
      itemUpdateQuery = itemUpdateQuery.in("retailer_id", retailerIds);
    }

    const { error: itemUpdateErr } = await itemUpdateQuery;
    if (itemUpdateErr) {
      console.warn("[Vendor Orders PATCH] order_items update warning:", itemUpdateErr.message);
    }

    // 4. Update orders status
    const mappedOrderStatus = status === "shipped" ? "shipped" : (status === "delivered" ? "delivered" : status);
    await adminClient
      .from("orders")
      .update({ status: mappedOrderStatus })
      .eq("id", order.id);

    // 5. Update or insert order_shipments if tracking or shipped
    if (status === "shipped" || status === "delivered" || tracking) {
      if (!existingShip) {
        const { data: sRow } = await adminClient
          .from("order_shipments")
          .select("id")
          .eq("order_id", order.id)
          .maybeSingle();
        existingShip = sRow;
      }

      const shipmentStatus = status === "delivered" ? "delivered" : "dispatched";
      const nowIso = new Date().toISOString();

      if (existingShip?.id) {
        const updatePayload: Record<string, any> = {
          shipment_status: shipmentStatus,
          updated_at: nowIso,
        };
        if (tracking) updatePayload.tracking_number = tracking;
        if (carrierCode) updatePayload.carrier_code = carrierCode;
        if (status === "shipped") updatePayload.dispatched_at = nowIso;
        if (status === "delivered") updatePayload.delivered_at = nowIso;

        await adminClient
          .from("order_shipments")
          .update(updatePayload)
          .eq("id", existingShip.id);
      } else {
        await adminClient.from("order_shipments").insert({
          order_id: order.id,
          retailer_id: retailerIds[0] || null,
          carrier_code: carrierCode || "ARAMEX",
          tracking_number: tracking || null,
          shipment_status: shipmentStatus,
          dispatched_at: status === "shipped" ? nowIso : null,
          delivered_at: status === "delivered" ? nowIso : null,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order ${order.order_number || order.id} status updated to ${status}.`,
      order: {
        id: order.order_number || order.id,
        rawOrderId: order.id,
        status,
        tracking: tracking || undefined,
      },
    });
  } catch (err: any) {
    console.error("[Vendor Orders PATCH Exception]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update order status." },
      { status: 500 }
    );
  }
}

function mapStatus(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("paid")) return "paid";
  if (s.includes("material")) return "materials";
  if (s.includes("prod")) return "production";
  if (s.includes("qc") || s.includes("quality")) return "qc";
  if (s.includes("ready")) return "ready";
  if (s.includes("process")) return "processing";
  if (s.includes("ship")) return "shipped";
  if (s.includes("deliver")) return "delivered";
  if (s.includes("rts") || s.includes("return")) return "rts";
  return "paid";
}
