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
        product_variants (*)
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
    let { data: vendorProfile, error: vpErr } = await adminClient
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

    if (!vendorProfile) {
      const vStoreName = body.storeName || body.businessName || "Vendor Store";
      const { data: newVp, error: createVpErr } = await adminClient
        .from("vendor_profiles")
        .insert({
          id: userId,
          business_name: body.businessName || vStoreName,
          store_name: vStoreName,
          business_email: body.workEmail || undefined,
          status: "approved",
        })
        .select("status, business_name, store_name, business_email")
        .single();

      if (createVpErr) {
        console.error("[Vendor Listings POST] Failed to initialize vendor profile:", createVpErr.message);
      } else {
        vendorProfile = newVp;
      }
    } else if (vendorProfile.status === "pending" || vendorProfile.status === "draft") {
      // Auto-approve vendor application so product can be listed immediately
      await adminClient
        .from("vendor_profiles")
        .update({ status: "approved" })
        .eq("id", userId);
      vendorProfile.status = "approved";
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
        specs_json: {
          kind: type || "Made to order",
          stock: stock || "4",
          model_url: model_url || undefined,
          has_3d: Boolean(model_url),
          published_immediately: true,
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
        dimensions_cm: { width: 120, height: 75, depth: 80 },
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
      message: "Listing published to marketplace successfully.",
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

export async function PATCH(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const ids: string[] = body.ids || (body.id ? [body.id] : []);
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "No product IDs specified" }, { status: 400 });
    }
    const action = body.action || "unlist";

    for (const id of ids) {
      const { data: p } = await adminClient.from("products").select("specs_json").eq("id", id).maybeSingle();
      const currentSpecs = p?.specs_json || {};
      const nextStatus = action === "toggle_unlist"
        ? (currentSpecs.status === "deactivated" ? "live" : "deactivated")
        : (action === "relist" ? "live" : "deactivated");

      await adminClient.from("products").update({
        specs_json: { ...currentSpecs, status: nextStatus },
      }).eq("id", id);

      await adminClient.from("product_variants").update({
        is_active: nextStatus === "live",
      }).eq("product_id", id);
    }

    return NextResponse.json({ success: true, message: "Products updated" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const ids: string[] = body.ids || (body.id ? [body.id] : []);
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "No product IDs specified" }, { status: 400 });
    }

    for (const id of ids) {
      await adminClient.from("product_variants").delete().eq("product_id", id);
      await adminClient.from("products").delete().eq("id", id);
    }

    return NextResponse.json({ success: true, message: "Products deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}