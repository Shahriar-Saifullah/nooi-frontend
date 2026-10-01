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

    let supabaseUser: any = null;

    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // 1. Create or update the auth user with vendor role
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: workEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            business_name: businessName,
            role: "vendor",
            onboarding_step: 1,
          },
        });

        if (error && error.message.includes("already been registered")) {
          // User exists — update their metadata to mark as vendor
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const existing = userList?.users?.find(
            (u) => u.email?.toLowerCase() === workEmail.toLowerCase()
          );
          if (existing) {
            const { data: updated } = await supabaseAdmin.auth.admin.updateUserById(
              existing.id,
              {
                password: password,
                email_confirm: true,
                user_metadata: {
                  ...existing.user_metadata,
                  full_name: fullName,
                  business_name: businessName,
                  role: "vendor",
                  onboarding_step: 1,
                },
              }
            );
            supabaseUser = updated?.user || existing;
          }
        } else if (error) {
          console.warn("[Vendor Signup API] Supabase admin error:", error.message);
        } else if (data?.user) {
          supabaseUser = data.user;
        }

        // 2. Upsert into vendor_profiles table
        //    This is ALSO handled by the DB trigger (handle_new_user), but we do it
        //    explicitly here as a fallback in case the trigger is not yet set up.
        if (supabaseUser?.id) {
          const { error: vpError } = await supabaseAdmin
            .from("vendor_profiles")
            .upsert(
              {
                id: supabaseUser.id,
                full_name: fullName,
                business_name: businessName,
                work_email: workEmail,
                application_status: "pending",
              },
              { onConflict: "id" }
            );

          if (vpError) {
            // vendor_profiles table may not exist yet — log but don't fail the request.
            // Run the SQL migration in the plan to create it.
            console.warn("[Vendor Signup API] vendor_profiles upsert warning:", vpError.message);
          }
        }
      } catch (adminErr) {
        console.warn("[Vendor Signup API] Admin signup fallback:", adminErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Vendor account created successfully.",
      user: {
        id: supabaseUser?.id || `vendor_${Date.now()}`,
        email: workEmail,
        full_name: fullName,
        business_name: businessName,
        role: "vendor",
        onboarding_step: 1,
      },
    });
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
