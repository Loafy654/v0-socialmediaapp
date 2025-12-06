import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] Doctor verification API - User:", user?.id, "Email:", user?.email)

    if (!user || !user.email) {
      console.log("[v0] User not found in auth or no email")
      return NextResponse.json(
        { error: "Unauthorized - User not found. Please sign up again or log in." },
        { status: 401 },
      )
    }

    const profileData = await supabase.from("profiles").select("id, role").eq("id", user.id).single()

    if (profileData.error && profileData.error.code === "PGRST116") {
      // Profile doesn't exist, create it
      console.log("[v0] Creating profile for doctor user:", user.id)
      const { error: createError } = await supabase.from("profiles").insert({
        id: user.id,
        username: user.user_metadata?.username || user.email.split("@")[0],
        full_name: user.user_metadata?.full_name || user.email,
        role: user.user_metadata?.role || "doctor",
        specialization: user.user_metadata?.specialization || null,
        license_number: user.user_metadata?.license_number || null,
        avatar_url: null,
        bio: null,
      })

      if (createError && !createError.message.includes("duplicate")) {
        console.log("[v0] Failed to create profile:", createError)
        return NextResponse.json({ error: "Failed to create profile" }, { status: 400 })
      }
    } else if (profileData.error) {
      console.log("[v0] Error fetching profile:", profileData.error)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 400 })
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

    console.log("[v0] Uploading doctor verification file:", file.name, "Size:", file.size)

    const fileName = `doctor-verifications/${user.id}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from("doctor-verifications").upload(fileName, file, {
      upsert: true,
    })

    if (error) {
      console.log("[v0] Storage upload error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("[v0] File uploaded successfully:", data.path)

    const { error: insertError } = await supabase.from("doctor_verifications").insert({
      user_id: user.id,
      doctor_id_image_url: data.path,
      status: "pending",
    })

    if (insertError) {
      console.log("[v0] Doctor verification insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    try {
      // Send to admin email
      const adminEmail = process.env.ADMIN_EMAIL || "vincentclarkmpase@gmail.com"
      console.log("[v0] Attempting to send email to:", adminEmail)

      // You can implement Resend email here in the future
      // For now, we'll just log it
      console.log("[v0] Doctor verification submitted by:", user.email, "Document:", data.path)
    } catch (emailError) {
      console.log("[v0] Email sending failed (non-critical):", emailError)
      // Don't fail the request if email fails
    }

    console.log("[v0] Doctor verification successful for user:", user.id)
    return NextResponse.json({
      success: true,
      message:
        "Verification submitted successfully! Your doctor ID has been received. You will be notified once our team reviews it.",
      userId: user.id,
      email: user.email,
    })
  } catch (error: unknown) {
    console.log("[v0] Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred. Please try again." },
      { status: 500 },
    )
  }
}
