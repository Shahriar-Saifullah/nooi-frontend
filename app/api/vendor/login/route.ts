import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { success: false, error: "Database configuration error." },
        { status: 500 }
      );
    }

    let adminClient: any = null;
    let existingUserRecord: any = null;

    // 1. Use admin client to find the user by email
    if (serviceRoleKey) {
      try {
        adminClient = createClient(supabaseUrl, serviceRoleKey);
        const { data: userListData } = await adminClient.auth.admin.listUsers();
        if (userListData?.users) {
          existingUserRecord = userListData.users.find(
            (u: any) => u.email?.toLowerCase() === cleanEmail
          );
        }
      } catch (adminErr) {
        console.warn("[Vendor Login API] Admin lookup warning:", adminErr);
      }
    }

    // If admin lookup ran and no account found at all:
    if (adminClient && !existingUserRecord) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No account found with this email. Please check your credentials or register as a vendor.",
        },
        { status: 404 }
      );
    }

    // 2. Check vendor_profiles table — this is the authoritative check
    //    (more reliable than checking user_metadata which can be bypassed)
    if (adminClient && existingUserRecord?.id) {
      const { data: vendorProfile, error: vpError } = await adminClient
        .from("vendor_profiles")
        .select("id, full_name, business_name, work_email, application_status")
        .eq("id", existingUserRecord.id)
        .single();

      if (vpError || !vendorProfile) {
        // Not in vendor_profiles → fall back to checking metadata role
        const isVendorByMeta =
          existingUserRecord.user_metadata?.role === "vendor" ||
          existingUserRecord.app_metadata?.role === "vendor" ||
          !!existingUserRecord.user_metadata?.business_name;

        if (!isVendorByMeta) {
          return NextResponse.json(
            {
              success: false,
              error:
                "This account is not registered as a vendor. Please switch to User sign in or register your store.",
            },
            { status: 403 }
          );
        }

        // Metadata says vendor, but no DB row yet — create it now (post-migration scenario)
        if (adminClient && isVendorByMeta) {
          await adminClient.from("vendor_profiles").upsert(
            {
              id: existingUserRecord.id,
              full_name: existingUserRecord.user_metadata?.full_name || "",
              business_name: existingUserRecord.user_metadata?.business_name || "",
              work_email: existingUserRecord.email,
              application_status: "pending",
            },
            { onConflict: "id" }
          );
        }
      }
    } else if (existingUserRecord) {
      // No admin client — fall back to metadata check only
      const isVendor =
        existingUserRecord.user_metadata?.role === "vendor" ||
        existingUserRecord.app_metadata?.role === "vendor" ||
        !!existingUserRecord.user_metadata?.business_name;

      if (!isVendor) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This account is not registered as a vendor. Please switch to User sign in.",
          },
          { status: 403 }
        );
      }
    }

    // 3. Authenticate the credentials
    const authClient = createClient(supabaseUrl, anonKey || serviceRoleKey!);
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: authError?.message || "Invalid email or password. Please try again.",
        },
        { status: 401 }
      );
    }

    const authedUser = authData.user;

    // Final check: ensure authenticated user is a vendor
    const isVendor =
      authedUser.user_metadata?.role === "vendor" ||
      authedUser.app_metadata?.role === "vendor" ||
      !!authedUser.user_metadata?.business_name;

    if (!isVendor) {
      await authClient.auth.signOut();
      return NextResponse.json(
        {
          success: false,
          error:
            "This account is not registered as a vendor. Please sign in as a user or register your store.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Vendor authenticated successfully.",
      user: {
        id: authedUser.id,
        email: authedUser.email,
        full_name:
          authedUser.user_metadata?.full_name ||
          authedUser.user_metadata?.name ||
          "Vendor Owner",
        business_name:
          authedUser.user_metadata?.business_name ||
          authedUser.user_metadata?.store_name ||
          "My Store",
        role: "vendor",
      },
    });
  } catch (error: any) {
    console.error("[Vendor Login API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error during vendor verification.",
      },
      { status: 500 }
    );
  }
}
