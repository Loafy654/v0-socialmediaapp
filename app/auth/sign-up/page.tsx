"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { AlertCircle, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<"patient" | "doctor">("patient")
  const [specialization, setSpecialization] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [doctorIdFile, setDoctorIdFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (role === "doctor" && !specialization) {
      setError("Please select your specialization")
      return
    }

    const supabase = createClient()
    setIsLoading(true)

    try {
      const { data: existingUsers } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", email.split("@")[0])
        .limit(1)

      if (existingUsers && existingUsers.length > 0) {
        setError("This email is already registered. Please log in instead.")
        setIsLoading(false)
        return
      }

      let doctorIdUrl = null

      if (role === "doctor" && doctorIdFile) {
        try {
          const formData = new FormData()
          formData.append("file", doctorIdFile)

          const uploadResponse = await fetch("/api/upload-doctor-id", {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload doctor ID")
          }

          const uploadData = await uploadResponse.json()
          doctorIdUrl = uploadData.url
        } catch (uploadError) {
          console.error("Error uploading doctor ID:", uploadError)
          setError("Failed to upload doctor ID. Please try again.")
          setIsLoading(false)
          return
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: email.split("@")[0],
            role: role,
            specialization: role === "doctor" ? specialization : null,
            license_number: role === "doctor" ? licenseNumber : null,
          },
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("Failed to create user account")
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (role === "doctor") {
        const { error: verificationError } = await supabase.from("doctor_verifications").insert({
          user_id: authData.user.id,
          doctor_id_image_url: doctorIdUrl,
          status: doctorIdUrl ? "verified" : "none",
          submitted_at: doctorIdUrl ? new Date().toISOString() : null,
          verified_at: doctorIdUrl ? new Date().toISOString() : null,
        })

        if (verificationError) {
          console.error("Error creating doctor verification:", verificationError)
        }
      }

      router.push(role === "doctor" && !doctorIdUrl ? "/auth/doctor-verify" : "/feed")
    } catch (error: unknown) {
      console.error("Signup error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <CardTitle className="text-3xl flex items-center gap-2">
            <span className="text-2xl">⚕️</span> AIGYoo
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">Healthcare Social Network</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {role === "doctor" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select value={specialization} onValueChange={setSpecialization}>
                    <SelectTrigger id="specialization">
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General Practice">General Practice</SelectItem>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Dermatology">Dermatology</SelectItem>
                      <SelectItem value="Neurology">Neurology</SelectItem>
                      <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                      <SelectItem value="Oncology">Oncology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    placeholder="Your medical license number"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctorId">Doctor ID (Optional - for instant verification)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="doctorId"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setDoctorIdFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {doctorIdFile && <Upload className="h-4 w-4 text-green-600" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload your medical ID for instant verification. You can also do this later.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent" disabled={isLoading}>
              {isLoading ? "Creating account..." : `Sign Up as ${role === "doctor" ? "Doctor" : "Patient"}`}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
