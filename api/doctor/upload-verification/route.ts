import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create doctor verification record
    const { error: insertError } = await supabase.from("doctor_verifications").insert({
      user_id: user.id,
      doctor_id_image_url: data.path,
      status: "pending",
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Verification submitted successfully" })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 })
  }
}
