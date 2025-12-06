import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] Doctor verification API - User:", user?.id)

    if (!user) {
      console.log("[v0] User not found in auth")
      return NextResponse.json({ error: "Unauthorized - User not found" }, { status: 401 })
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    console.log("[v0] Profile check - Data:", profileData, "Error:", profileError)

    if (profileError || !profileData) {
      // Create profile if it doesn't exist
      const { error: createError } = await supabase.from("profiles").insert({
        id: user.id,
        username: user.email?.split("@")[0] || "user",
        full_name: user.user_metadata?.full_name || "",
        role: user.user_metadata?.role || "doctor",
      })

      if (createError && !createError.message.includes("duplicate")) {
        console.log("[v0] Failed to create profile:", createError)
        return NextResponse.json({ error: "Failed to create profile" }, { status: 400 })
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role: "doctor",
        specialization: user.user_metadata?.specialization || null,
        license_number: user.user_metadata?.license_number || null,
      })
      .eq("id", user.id)

    if (updateError) {
      console.log("[v0] Failed to update profile:", updateError)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Upload file to Supabase Storage
    const fileName = `doctor-verifications/${user.id}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from("doctor-verifications").upload(fileName, file, {
      upsert: true,
    })

    if (error) {
      console.log("[v0] Storage upload error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create doctor verification record
    const { error: insertError } = await supabase.from("doctor_verifications").insert({
      user_id: user.id,
      doctor_id_image_url: data.path,
      status: "pending",
    })

    if (insertError) {
      console.log("[v0] Doctor verification insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    console.log("[v0] Doctor verification successful for user:", user.id)
    return NextResponse.json({ success: true, message: "Verification submitted successfully" })
  } catch (error: unknown) {
    console.log("[v0] Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 })
  }
}
