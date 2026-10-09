import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, workEmail, businessName, password } = body;

    if (!fullName || !workEmail || !businessName || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Full name, work email, business name, and password are required.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase service role credentials not configured.",
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const cleanEmail = workEmail.trim().toLowerCase();

    // 1. Check if user already exists in auth.users
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this work email already exists. Please sign in instead.",
        },
        { status: 400 }
      );
    }

    // 2. Create auth user with vendor role in user_metadata and auto-confirm email
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        business_name: businessName.trim(),
        role: "vendor",
        onboarding_step: 1,
      },
    });

    if (createError || !authData?.user) {
      return NextResponse.json(
        {
          success: false,
          error: createError?.message || "Failed to create vendor account in Auth system.",
        },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 3. Atomically initialize profiles and vendor_profiles with rollback protection
    try {
      // Set profiles.role = 'vendor' (the authoritative role)
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            full_name: fullName.trim(),
            role: "vendor",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // Initialize vendor_profiles record
      const { error: vpError } = await supabaseAdmin
        .from("vendor_profiles")
        .upsert(
          {
            id: userId,
            business_name: businessName.trim(),
            store_name: businessName.trim(),
            business_email: cleanEmail,
            phone: "",
            category: "general",
            status: "pending",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (vpError) {
        // Fallback for schema variants without business_email/phone/business_name columns
        console.warn("[Vendor Signup API] Detailed vendor_profiles error, attempting resilient payload:", vpError.message);
        const { error: vpFallbackError } = await supabaseAdmin
          .from("vendor_profiles")
          .upsert(
            {
              id: userId,
              store_name: businessName.trim(),
              category: "general",
              status: "pending",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (vpFallbackError) {
          throw new Error(`Vendor profile creation failed: ${vpFallbackError.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Vendor account created successfully.",
        user: {
          id: userId,
          email: cleanEmail,
          full_name: fullName.trim(),
          business_name: businessName.trim(),
          role: "vendor",
          onboarding_step: 1,
        },
      });
    } catch (err: any) {
      // ROLLBACK: Delete orphan user in auth.users so database stays clean and user can retry
      console.error("[Vendor Signup API] Database setup failed. Rolling back created user:", err.message);
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          error: err.message || "Failed to initialize vendor profile.",
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[Vendor Signup API] Exception:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error during vendor signup.",
      },
      { status: 500 }
    );
  }
}

