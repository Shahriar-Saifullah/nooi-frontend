import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { resolveVendorUser } from "@/app/api/vendor/_utils/auth";

const CATEGORY_MAP: Record<
  string,
  { typeId: string; category: string; canvasModelId: string }
> = {
  sofas: { typeId: "sofa", category: "living", canvasModelId: "sofa-boca-tommy" },
  tables: { typeId: "coffee-table", category: "living", canvasModelId: "table_marble_01" },
  chairs: { typeId: "armchair", category: "living", canvasModelId: "armchair" },
  storage: { typeId: "bookshelf", category: "living", canvasModelId: "bookshelf" },
  rugs: { typeId: "rug", category: "living", canvasModelId: "rug" },
  "décor accents": { typeId: "vase", category: "decor", canvasModelId: "vase" },
  decor: { typeId: "vase", category: "decor", canvasModelId: "vase" },
};

function getCategoryInfo(rawCat: string) {
  const normalized = (rawCat || "").toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(key)) {
      return val;
    }
  }
  return { typeId: "armchair", category: "living", canvasModelId: "armchair" };
}

const PHOTO_SIDES = ["front", "left", "back", "right"];

/** Keep only known sides, one photo per side, and only this listing's photos. */
function cleanPhotoViews(raw: unknown, images: unknown): { view: string; url: string }[] | undefined {
  if (!Array.isArray(raw) || !Array.isArray(images)) return undefined;
  const own = new Set(images.filter((u): u is string => typeof u === "string"));
  const seen = new Set<string>();
  const out: { view: string; url: string }[] = [];
  for (const r of raw) {
    const view = String((r as { view?: unknown })?.view ?? "");
    const url = String((r as { url?: unknown })?.url ?? "");
    if (!PHOTO_SIDES.includes(view) || !own.has(url) || seen.has(view)) continue;
    seen.add(view);
    out.push({ view, url });
  }
  return out.length ? out : undefined;
}

/** Width/depth/height in cm, each 1–2000; anything else is ignored. */
function cleanDimensions(raw: unknown): { width: number; depth: number; height: number } | null {
  const d = raw as { width?: unknown; depth?: unknown; height?: unknown } | null;
  const nums = [d?.width, d?.depth, d?.height].map((v) => Number(v));
  if (!nums.every((n) => Number.isFinite(n) && n >= 1 && n <= 2000)) return null;
  const [width, depth, height] = nums.map((n) => Math.round(n * 10) / 10);
  return { width, depth, height };
}

async function generateUniqueSku(
  adminClient: any,
  rawSku: string | undefined,
  title: string,
  index: number,
  usedInBatch: Set<string>
): Promise<string> {
  const sanitize = (s: string) =>
    (s || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");

  let base = sanitize(rawSku || "");
  if (!base) {
    const titleSnippet = sanitize(title).slice(0, 4) || "PRD";
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    base = `${titleSnippet}-${randPart}-${index + 1}`;
  }

  let candidate = base;
  let attempts = 0;

  while (attempts < 25) {
    if (!usedInBatch.has(candidate)) {
      const { data } = await adminClient
        .from("product_variants")
        .select("id")
        .eq("sku", candidate)
        .maybeSingle();

      if (!data) {
        usedInBatch.add(candidate);
        return candidate;
      }
    }

    // Collision occurred: append a short disambiguating hash
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    candidate = `${base}-${suffix}`;
    attempts++;
  }

  // Fallback to timestamp + random
  const fallback = `${base}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  usedInBatch.add(fallback);
  return fallback;
}

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

    // ?public=true is gone. It returned every retailer's products to anyone,
    // unauthenticated, and lib/api/marketplace.ts merged the results in "to
    // guarantee 100% immediate presence" — which meant nobody could tell
    // whether the real /marketplace query worked for vendor products. If a
    // listing does not appear there, that is a backend bug to find, not one to
    const url = new URL(req.url);
    const emailHint = url.searchParams.get("email") || undefined;
    const businessHint = url.searchParams.get("businessName") || undefined;
    const { userId, role } = await resolveVendorUser(req, {
      workEmail: emailHint,
      businessName: businessHint,
    });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }
    if (role !== "vendor") {
      return NextResponse.json(
        { success: false, error: "This account is not registered as a vendor." },
        { status: 403 }
      );
    }

    // A vendor sees their own storefronts and nobody else's.
    const { data: retailers } = await adminClient
      .from("retailers")
      .select("id, name")
      .eq("vendor_id", userId);
    const retailerIds = (retailers || []).map((r) => r.id);

    if (retailerIds.length === 0) {
      return NextResponse.json({ success: true, products: [] });
    }

    const { data: products, error } = await adminClient
      .from("products")
      .select(`
        id,
        retailer_id,
        canvas_model_id,
        type_id,
        title,
        description,
        category,
        tags,
        base_price,
        lead_time_days,
        specs_json,
        created_at,
        listing_status,
        review_note,
        submitted_at,
        reviewed_at,
        product_variants (*),
        product_model_jobs ( status, updated_at )
      `)
      .in("retailer_id", retailerIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      products: products || [],
    });
  } catch (err: any) {
    console.error("[Vendor Listings GET Exception]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch vendor listings." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      category,
      type,
      price,
      stock,
      variants,
      images,
      description,
      model_url,
      photo_views,
      dimensions_cm,
      // is_returnable: false for Made to order & Custom size; true for In stock.
      // Defaults to false — better to under-promise returns on a bespoke piece.
      is_returnable = false,
    } = body;

    if (!title || !price) {
      return NextResponse.json(
        { success: false, error: "Title and price are required to create a listing." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Supabase service role credentials not configured." },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

    const { userId, role } = await resolveVendorUser(req, {
      workEmail: body.workEmail || undefined,
      businessName: body.businessName || body.storeName || undefined,
    });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in as a vendor." },
        { status: 401 }
      );
    }
    if (role !== "vendor") {
      return NextResponse.json(
        { success: false, error: "This account is not registered as a vendor." },
        { status: 403 }
      );
    }

    // 1. Verify or initialize vendor profile.
    const { data: vendorProfile, error: vpErr } = await adminClient
      .from("vendor_profiles")
      .select("status, business_name, store_name, business_email")
      .eq("id", userId)
      .maybeSingle();

    if (vpErr) {
      console.error("[Vendor Listings POST] vendor_profiles lookup failed:", vpErr.message);
      return NextResponse.json(
        { success: false, error: "Could not verify your vendor account." },
        { status: 500 }
      );
    }

    // Only an approved vendor can list. This route used to create an approved
    // profile on the fly, and to approve a pending application on the spot
    // ("so product can be listed immediately") — which let anyone skip vendor
    // review by posting a listing. Approval belongs to admins only.
    if (!vendorProfile) {
      return NextResponse.json(
        { success: false, error: "Finish your vendor application before creating listings." },
        { status: 403 }
      );
    }
    if (vendorProfile.status === "pending" || vendorProfile.status === "draft") {
      return NextResponse.json(
        { success: false, error: "Your vendor application is still being reviewed. You can add listings once it's approved." },
        { status: 403 }
      );
    } else if (vendorProfile.status === "rejected" || vendorProfile.status === "suspended") {
      const reason =
        vendorProfile.status === "rejected"
          ? "Your vendor application was not approved."
          : "Your vendor account is suspended.";
      return NextResponse.json({ success: false, error: reason }, { status: 403 });
    }

    // 2. The storefront. decide_vendor_application creates one at approval, so
    //    an approved vendor normally has it already. The fallback stays for
    //    vendors approved before that function existed — it is a backstop, not
    //    the usual path, and it can only run for someone already approved.
    let { data: retailer } = await adminClient
      .from("retailers")
      .select("id, name")
      .eq("vendor_id", userId)
      .maybeSingle();

    if (!retailer) {
      const retailerName =
        vendorProfile?.store_name || vendorProfile?.business_name || "Vendor Store";
      const { data: newRetailer, error: retErr } = await adminClient
        .from("retailers")
        .insert({
          name: retailerName,
          vendor_id: userId,
          api_adapter_type: "self_serve",
          commission_rate: 10.0,
        })
        .select("id, name")
        .single();

      if (retErr) {
        console.error("[Vendor Listings POST] Failed to create retailer:", retErr.message);
        return NextResponse.json(
          { success: false, error: `Failed to link vendor storefront: ${retErr.message}` },
          { status: 500 }
        );
      }
      retailer = newRetailer;
    }

    // 2. Map category to taxonomy
    const { typeId, category: catGroup, canvasModelId } = getCategoryInfo(category);
    const parsedPrice = parseFloat(price) || 0;
    const leadDays =
      type === "In stock"
        ? 3
        : Math.max(7, (parseInt(stock, 10) || 4) * 7);

    const { data: newProduct, error: prodErr } = await adminClient
      .from("products")
      .insert({
        retailer_id: retailer.id,
        canvas_model_id: canvasModelId,
        type_id: typeId,
        title: title.trim(),
        description: description || `Handcrafted ${title.trim()} by ${retailer.name}.`,
        category: catGroup,
        tags: [catGroup, typeId, (category || "").toLowerCase()],
        base_price: parsedPrice,
        lead_time_days: leadDays,
        // is_returnable drives the return-eligibility check in orders/[id]/page.tsx
        // and the order confirmation email. Made-to-order and custom sizes are
        // non-returnable by design; In stock items follow the standard window.
        is_returnable: Boolean(is_returnable),
        // Hidden from shoppers until a Nooi admin approves it (/admin/listings).
        listing_status: "pending",
        submitted_at: new Date().toISOString(),
        specs_json: {
          kind: type || "Made to order",
          stock: stock || "4",
          model_url: model_url || undefined,
          has_3d: Boolean(model_url),
          // Which photo shows which side — the 3D model is built from these.
          photo_views: cleanPhotoViews(photo_views, images),
          published_immediately: false,
        },
      })
      .select()
      .single();

    if (prodErr) {
      console.error("[Vendor Listings POST] Product insert error:", prodErr.message);
      return NextResponse.json(
        { success: false, error: `Failed to publish product: ${prodErr.message}` },
        { status: 500 }
      );
    }

    // 4. Insert variants with guaranteed unique SKUs
    const validVariants =
      Array.isArray(variants) && variants.length > 0
        ? variants
        : [{ id: "1", name: "Standard", sku: "", stock: stock || "10" }];

    const usedInBatch = new Set<string>();
    const variantRows = [];

    for (let idx = 0; idx < validVariants.length; idx++) {
      const v = validVariants[idx];
      const vSku = await generateUniqueSku(
        adminClient,
        v.sku,
        title,
        idx,
        usedInBatch
      );

      const vStock =
        type === "In stock"
          ? parseInt(v.stock || stock || "10", 10) || 10
          : 99;

      const validImgs =
        Array.isArray(images) && images.length > 0
          ? images
          : ["https://picsum.photos/seed/" + encodeURIComponent(title) + "/800/600"];

      variantRows.push({
        product_id: newProduct.id,
        sku: vSku,
        color: v.name || "Standard",
        material: "Wood / Fabric",
        // The canvas places the 3D model at exactly this size.
        dimensions_cm: cleanDimensions(dimensions_cm) ?? { width: 120, height: 75, depth: 80 },
        stock_quantity: vStock,
        price: parsedPrice,
        images: validImgs,
        is_active: true,
      });
    }

    const { data: createdVariants, error: varErr } = await adminClient
      .from("product_variants")
      .insert(variantRows)
      .select();

    if (varErr) {
      // A product with no variants has no price, no stock and no SKU — it
      // cannot be bought, and it renders as a broken card in the marketplace.
      // Reporting success here would leave the vendor believing they had
      // listed something sellable.
      console.error("[Vendor Listings POST] Variant insert failed:", varErr.message);
      await adminClient.from("products").delete().eq("id", newProduct.id);
      return NextResponse.json(
        { success: false, error: `Could not create product options: ${varErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Listing submitted. Nooi reviews new listings within 1 business day.",
      product: {
        ...newProduct,
        variants: createdVariants || variantRows,
        retailer,
      },
    });
  } catch (err: any) {
    console.error("[Vendor Listings POST Exception]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create listing." },
      { status: 500 }
    );
  }
}

/**
 * Vendor listing actions — one PATCH, one DELETE, both authenticated.
 * ----------------------------------------------------------------------------
 * PATCH /api/vendor/listings  { id | ids, action, title?, description?, price? }
 *
 *   unlist          take listings off sale (vendor's choice)
 *   relist          put them back: a listing the vendor took down returns to
 *                   whatever it was before (on sale, or still in review);
 *                   one an admin took down goes back into review instead
 *   toggle_unlist   unlist if on sale / in review, relist if off sale
 *   resubmit        send a listing that needs changes (or was taken down)
 *                   back to Nooi's review queue, with any edits applied
 *
 * The status lives in products.listing_status (see /admin/listings). Only
 * 'approved' listings are visible in the marketplace. specs_json.status is
 * kept in step for older screens that still read it.
 *
 * DELETE /api/vendor/listings  { id | ids }
 *   Only listings that have never been ordered can be deleted. A sold product
 *   is part of order history (and of the vendor's earnings), so it can only be
 *   taken off sale.
 */

type ListingRow = {
  id: string;
  title: string;
  listing_status: string;
  review_note: string | null;
  specs_json: Record<string, unknown> | null;
};

async function vendorContext(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { error: NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 }) };
  }
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
  const { userId, role } = await resolveVendorUser(req, {});
  if (!userId || role !== "vendor") {
    return { error: NextResponse.json({ success: false, error: "Not authenticated as a vendor." }, { status: 401 }) };
  }
  return { adminClient, userId };
}

/** The vendor's own listings among `ids` — anything else is silently not theirs. */
async function ownListings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any, userId: string, ids: string[],
): Promise<ListingRow[]> {
  const { data: retailers } = await adminClient.from("retailers").select("id").eq("vendor_id", userId);
  const retailerIds = (retailers || []).map((r: { id: string }) => r.id);
  if (retailerIds.length === 0 || ids.length === 0) return [];
  const { data } = await adminClient
    .from("products")
    .select("id, title, listing_status, review_note, specs_json")
    .in("id", ids)
    .in("retailer_id", retailerIds);
  return (data || []) as ListingRow[];
}

const idsFrom = (body: { ids?: unknown; id?: unknown }): string[] =>
  (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : []).filter((x): x is string => typeof x === "string").slice(0, 200);

/** listing_status → what the vendor dashboard shows (same mapping as ListingReviewActions). */
const uiStatus = (s: string) =>
  s === "approved" ? "live" : s === "rejected" ? "changes_requested" : s === "deactivated" ? "deactivated" : "pending_review";

export async function PATCH(req: Request) {
  try {
    const ctx = await vendorContext(req);
    if ("error" in ctx) return ctx.error;
    const { adminClient, userId } = ctx;

    const body = await req.json();
    const ids = idsFrom(body);
    const action = String(body.action || "unlist");
    if (ids.length === 0) return NextResponse.json({ success: false, error: "No product IDs specified" }, { status: 400 });
    if (!["unlist", "deactivate", "relist", "toggle_unlist", "resubmit", "edit"].includes(action)) {
      return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }

    const listings = await ownListings(adminClient, userId, ids);
    if (listings.length === 0) return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });

    // Edits (resubmit only, one listing at a time)
    const edits: Record<string, unknown> = {};
    let newPrice = NaN;
    if (action === "resubmit" || action === "edit") {
      if (typeof body.title === "string" && body.title.trim()) edits.title = body.title.trim().slice(0, 140);
      if (typeof body.description === "string" && body.description.trim()) edits.description = body.description.trim().slice(0, 4000);
      newPrice = body.price !== undefined ? parseFloat(body.price) : NaN;
      if (!Number.isNaN(newPrice)) {
        if (!(newPrice > 0)) return NextResponse.json({ success: false, error: "Price must be above zero." }, { status: 400 });
        edits.base_price = newPrice;
      }
    }

    const now = new Date().toISOString();
    const results: { id: string; status: string; listing_status: string }[] = [];

    for (const p of listings) {
      const specs = { ...(p.specs_json || {}) } as Record<string, unknown>;
      const cur = p.listing_status;
      let next = cur;
      const wantsUnlist = action === "unlist" || action === "deactivate" || (action === "toggle_unlist" && cur !== "deactivated");
      const wantsRelist = action === "relist" || (action === "toggle_unlist" && cur === "deactivated");

      if (wantsUnlist) {
        if (cur === "approved" || cur === "pending") {
          next = "deactivated";
          specs.unlisted_by_vendor = true;
          specs.status_before_unlist = cur;
        }
      } else if (wantsRelist) {
        if (cur === "deactivated") {
          // Back to how it was if the vendor took it down; otherwise (an
          // admin took it down) it has to be reviewed again.
          next = specs.unlisted_by_vendor && !p.review_note && specs.status_before_unlist === "approved" ? "approved" : "pending";
          delete specs.unlisted_by_vendor;
          delete specs.status_before_unlist;
        }
      } else {
        // resubmit / edit → review
        next = "pending";
        delete specs.unlisted_by_vendor;
        delete specs.status_before_unlist;
      }

      specs.status = uiStatus(next);
      const { error } = await adminClient.from("products").update({
        ...edits,
        listing_status: next,
        specs_json: specs,
        ...(next === "pending" && cur !== "pending" ? { submitted_at: now, review_note: null } : {}),
      }).eq("id", p.id);
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });

      await adminClient.from("product_variants")
        .update({ is_active: next !== "deactivated", ...(!Number.isNaN(newPrice) && newPrice > 0 ? { price: newPrice } : {}) })
        .eq("product_id", p.id);
      results.push({ id: p.id, status: uiStatus(next), listing_status: next });
    }

    const single = results.length === 1 ? results[0] : null;
    const { data: one } = single
      ? await adminClient.from("products").select("id, title, base_price, description, listing_status, review_note, submitted_at").eq("id", single.id).single()
      : { data: null };
    return NextResponse.json({
      success: true,
      products: results,
      ...(one ? { product: one } : {}),
      message: results.some(r => r.listing_status === "pending") && !results.some(r => r.listing_status === "deactivated")
        ? "Sent to Nooi for review."
        : "Products updated",
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("[Vendor Listings PATCH Exception]:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to update listing." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await vendorContext(req);
    if ("error" in ctx) return ctx.error;
    const { adminClient, userId } = ctx;

    const body = await req.json();
    const ids = idsFrom(body);
    if (ids.length === 0) return NextResponse.json({ success: false, error: "No product IDs specified" }, { status: 400 });

    const listings = await ownListings(adminClient, userId, ids);
    if (listings.length === 0) return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });

    // Never delete something that has been ordered: order items cascade with
    // the product, so it would erase the sale from the customer's order.
    const { data: sold } = await adminClient.from("order_items").select("product_id").in("product_id", listings.map(l => l.id));
    const soldIds = new Set((sold || []).map((r: { product_id: string }) => r.product_id));
    const deletable = listings.filter(l => !soldIds.has(l.id));
    const kept = listings.filter(l => soldIds.has(l.id));

    for (const p of deletable) {
      await adminClient.from("product_variants").delete().eq("product_id", p.id);
      const { error } = await adminClient.from("products").delete().eq("id", p.id);
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    if (deletable.length === 0) {
      return NextResponse.json({
        success: false,
        error: kept.length === 1
          ? `"${kept[0].title}" has been ordered, so it can't be deleted. Unlist it instead.`
          : "These listings have been ordered, so they can't be deleted. Unlist them instead.",
      }, { status: 409 });
    }
    return NextResponse.json({
      success: true,
      deleted: deletable.map(l => l.id),
      kept: kept.map(l => l.id),
      message: kept.length
        ? `${deletable.length} deleted. ${kept.length} ha${kept.length === 1 ? "s" : "ve"} orders, so ${kept.length === 1 ? "it was" : "they were"} kept — unlist instead.`
        : "Products deleted",
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("[Vendor Listings DELETE Exception]:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to delete listing." }, { status: 500 });
  }
}
