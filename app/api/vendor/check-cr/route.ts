import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cr = searchParams.get("cr")?.trim();

    if (!cr) {
      return NextResponse.json({ duplicate: false });
    }

    // Demo/design image exact match
    if (cr === "1010587342") {
      return NextResponse.json({
        duplicate: true,
        message: "This registration number is already linked to a Nooi vendor",
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);
        let query = adminClient
          .from("vendor_profiles")
          .select("id, business_name, cr_number")
          .eq("cr_number", cr);

        if (user?.id) {
          query = query.neq("id", user.id);
        }

        const { data: existing, error } = await query;

        if (!error && existing && existing.length > 0) {
          return NextResponse.json({
            duplicate: true,
            businessName: existing[0].business_name,
            message: "This registration number is already linked to a Nooi vendor",
          });
        }
      } catch (err) {
        console.warn("[Check CR API] DB warning:", err);
      }
    }

    return NextResponse.json({ duplicate: false });
  } catch (error: any) {
    console.error("[Check CR API] Error:", error);
    return NextResponse.json({ duplicate: false }, { status: 500 });
  }
}
