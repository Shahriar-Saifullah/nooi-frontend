import { NextResponse } from "next/server";
import { notifyUsers } from "@/app/api/_lib/notify";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { resolveVendorUser } from "@/app/api/vendor/_utils/auth";

/**
 * POST /api/vendor/orders/:shipmentId/stage
 * Body: { stage: "materials" | "production" | "qc" | "ready" }
 *
 * Persists a pre-dispatch production_stage advance for factory vendors.
 * Only the four pre-ship factory stages are accepted here; dispatch and
 * delivery are handled by their own dedicated endpoints.
 *
 * The stage is written to order_items.production_stage for every item
 * in the order that belongs to this vendor.  If the column does not yet
 * exist the query will surface a DB error with a clear message — add it
 * via a Supabase migration:
 *   ALTER TABLE order_items ADD COLUMN production_stage text;
 */

const VALID_STAGES = ["materials", "production", "qc", "ready"] as const;
type ProductionStage = (typeof VALID_STAGES)[number];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Supabase service role credentials not configured." },
        { status: 500 }
      );
    }

    const { shipmentId } = await params;
    const body = await req.json();
    const { stage } = body as { stage: string };

    if (!stage || !VALID_STAGES.includes(stage as ProductionStage)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid stage "${stage}". Must be one of: ${VALID_STAGES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // ── Auth ────────────────────────────────────────────────────────────────
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

    // ── Verify ownership: shipment must belong to this vendor ────────────────
    const { data: retailers } = await adminClient
      .from("retailers")
      .select("id")
      .eq("vendor_id", userId);

    const retailerIds = (retailers || []).map((r: any) => r.id);
    if (retailerIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No retailers found for this vendor." },
        { status: 403 }
      );
    }

    // Resolve order_id from the shipment
    const { data: shipment, error: shipErr } = await adminClient
      .from("order_shipments")
      .select("id, order_id, retailer_id")
      .eq("id", shipmentId)
      .maybeSingle();

    if (shipErr || !shipment) {
      return NextResponse.json(
        { success: false, error: "Shipment not found." },
        { status: 404 }
      );
    }

    // Ensure this shipment's retailer belongs to the authenticated vendor
    if (!retailerIds.includes(shipment.retailer_id)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: shipment does not belong to your account." },
        { status: 403 }
      );
    }

    // ── Persist production_stage ─────────────────────────────────────────────
    const { error: updateErr } = await adminClient
      .from("order_items")
      .update({ production_stage: stage })
      .eq("order_id", shipment.order_id)
      .in("retailer_id", retailerIds);

    if (updateErr) {
      console.error("[Stage POST] order_items update error:", updateErr.message);

      // Friendly hint if the column doesn't exist yet
      const hint =
        updateErr.message.includes("production_stage") || updateErr.code === "42703"
          ? " (Run the DB migration: ALTER TABLE order_items ADD COLUMN production_stage text;)"
          : "";

      return NextResponse.json(
        { success: false, error: updateErr.message + hint },
        { status: 500 }
      );
    }

    // Made-to-order pieces take weeks; tell the customer as theirs progresses.
    {
      const [{ data: order }, { data: retailer }] = await Promise.all([
        adminClient.from("orders").select("order_number, user_id").eq("id", shipment.order_id).maybeSingle(),
        adminClient.from("retailers").select("name").eq("id", shipment.retailer_id).maybeSingle(),
      ]);
      const from = retailer?.name ? ` by ${retailer.name}` : "";
      const copy: Record<string, { title: string; message: string }> = {
        materials: { title: "Materials are being prepared", message: `Work has started${from} on your made-to-order piece (order ${order?.order_number ?? ""}).` },
        production: { title: "Your piece is being made", message: `Your made-to-order item is in production${from} (order ${order?.order_number ?? ""}).` },
        qc: { title: "Your piece is in quality check", message: `It's almost ready — final checks${from} before it ships (order ${order?.order_number ?? ""}).` },
        ready: { title: "Your piece is ready to ship", message: `It's finished and will be dispatched soon (order ${order?.order_number ?? ""}). You'll get tracking when it leaves.` },
      };
      const c = copy[String(stage)];
      if (c && order?.user_id) {
        await notifyUsers(adminClient, [order.user_id], { ...c, type: "shipment", link: `/orders/${shipment.order_id}` });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Production stage advanced to "${stage}".`,
      data: {
        shipmentId,
        orderId: shipment.order_id,
        production_stage: stage,
      },
    });
  } catch (err: any) {
    console.error("[Stage POST Exception]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update production stage." },
      { status: 500 }
    );
  }
}
