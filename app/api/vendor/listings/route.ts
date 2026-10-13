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
    // route around.
    const { userId, role } = await resolveVendorUser(req);

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

    const { userId, role } = await resolveVendorUser(req);

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

    // 1. Only an approved vendor may list.
    //
    // This route previously created a storefront for any signed-in user with no
    // status check, so a vendor could register, skip the approval queue
    // entirely and have a live product minutes later. That makes the approval
    // screen decorative: it reviews applications for vendors who are already
    // trading.
    const { data: vendorProfile, error: vpErr } = await adminClient
      .from("vendor_profiles")
      .select("status, business_name, store_name")
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
      return NextResponse.json(
        { success: false, error: "Complete your vendor registration before listing." },
        { status: 403 }
      );
    }
    if (vendorProfile.status !== "approved") {
      const reason =
        vendorProfile.status === "pending"
          ? "Your application is still being reviewed. You can list products once it is approved."
          : vendorProfile.status === "rejected"
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
        vendorProfile.store_name || vendorProfile.business_name || "Vendor Store";
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

    // 3. Insert product
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
        specs_json: {
          kind: type || "Made to order",
          stock: stock || "4",
          // Not a gate. products has no approval_status column yet, so every
          // listing is live on insert. Deliberate for now while all vendors are
          // seeded; must change before a real vendor exists.
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

    // 4. Insert variants
    const validVariants =
      Array.isArray(variants) && variants.length > 0
        ? variants
        : [{ id: "1", name: "Standard", sku: "", stock: stock || "10" }];

    const variantRows = validVariants.map((v: any, idx: number) => {
      const vSku =
        (v.sku && v.sku.trim()) ||
        `SKU-${Date.now().toString().slice(-6)}-${idx + 1}`;
      const vStock =
        type === "In stock"
          ? parseInt(v.stock || stock || "10", 10) || 10
          : 99;

      const validImgs =
        Array.isArray(images) && images.length > 0
          ? images
          : ["https://picsum.photos/seed/" + encodeURIComponent(title) + "/800/600"];

      return {
        product_id: newProduct.id,
        sku: vSku,
        color: v.name || "Standard",
        material: "Wood / Fabric",
        dimensions_cm: { width: 120, height: 75, depth: 80 },
        stock_quantity: vStock,
        price: parsedPrice,
        images: validImgs,
        is_active: true,
      };
    });

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