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
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || undefined;
    const businessName = searchParams.get("businessName") || undefined;
    // ?public=true → return all vendor-submitted products (for marketplace display)
    const isPublic = searchParams.get("public") === "true";

    const { userId } = await resolveVendorUser(req, {
      workEmail: email,
      businessName,
    });

    let retailerIds: string[] = [];

    if (!userId) {
      if (!isPublic) {
        return NextResponse.json(
          { success: false, error: "Not authenticated. Please sign in." },
          { status: 401 }
        );
      }
      // Public mode: fetch all retailers → all vendor products for the marketplace
      const { data: allRetailers } = await adminClient
        .from("retailers")
        .select("id");
      retailerIds = (allRetailers || []).map((r) => r.id);
    } else {
      // Authenticated vendor: only their own retailer(s)
      const { data: retailers } = await adminClient
        .from("retailers")
        .select("id, name")
        .eq("vendor_id", userId);
      retailerIds = (retailers || []).map((r) => r.id);
    }

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
      workEmail,
      email,
      businessName,
      storeName,
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

    const { userId, businessName: resolvedName } = await resolveVendorUser(req, {
      workEmail: workEmail || email,
      businessName: businessName || storeName,
    });

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated. Please sign in as a vendor." },
        { status: 401 }
      );
    }

    // 1. Locate or automatically create retailer record for this vendor
    let { data: retailer } = await adminClient
      .from("retailers")
      .select("id, name")
      .eq("vendor_id", userId)
      .maybeSingle();

    if (!retailer) {
      const retailerName =
        storeName || businessName || resolvedName || "Vendor Store";
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
      console.warn("[Vendor Listings POST] Variant insert warning:", varErr.message);
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
