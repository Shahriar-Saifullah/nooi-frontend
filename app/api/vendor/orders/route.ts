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

    // 3. Group order items by order_id
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

        orderMap.set(order.id, {
          id: order.order_number || `NOOI-${order.id.slice(0, 6)}`,
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
          status: mapStatus(it.item_status || order.status),
          overdue: false,
          tracking: "",
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
