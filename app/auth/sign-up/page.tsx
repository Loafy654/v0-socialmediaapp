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
import { AlertCircle, Upload, Sparkles } from "lucide-react"
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
        const verificationStatus = doctorIdUrl ? "verified" : "unverified"

        const { error: verificationError } = await supabase.from("doctor_verifications").insert({
          user_id: authData.user.id,
          doctor_id_image_url: doctorIdUrl,
          status: verificationStatus,
          submitted_at: doctorIdUrl ? new Date().toISOString() : null,
          verified_at: doctorIdUrl ? new Date().toISOString() : null,
        })

        if (verificationError) {
          console.error("Error creating doctor verification:", verificationError)
        }

        if (doctorIdUrl) {
          await supabase
            .from("profiles")
            .update({
              is_verified: true,
              verification_date: new Date().toISOString(),
            })
            .eq("id", authData.user.id)
        }
      }

      router.push("/feed")
    } catch (error: unknown) {
      console.error("Signup error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/20 p-4 animate-fade-in">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 animate-scale-in">
        <CardHeader className="bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground rounded-t-lg">
          <CardTitle className="text-3xl flex items-center gap-2 font-bold">
            <Sparkles className="h-8 w-8" /> AIGYoo
          </CardTitle>
          <CardDescription className="text-primary-foreground/90 text-lg">Healthcare Social Network</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role" className="text-base font-semibold">
                I am a
              </Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger id="role" className="border-2 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-base font-semibold">
                Full Name
              </Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="border-2 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 focus:border-primary"
              />
            </div>

            {role === "doctor" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="specialization" className="text-base font-semibold">
                    Specialization
                  </Label>
                  <Select value={specialization} onValueChange={setSpecialization}>
                    <SelectTrigger id="specialization" className="border-2 focus:border-primary">
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
                  <Label htmlFor="licenseNumber" className="text-base font-semibold">
                    License Number
                  </Label>
                  <Input
                    id="licenseNumber"
                    placeholder="Your medical license number"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="border-2 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctorId" className="text-base font-semibold">
                    Doctor ID (Optional - for instant verification ✓)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="doctorId"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setDoctorIdFile(e.target.files?.[0] || null)}
                      className="cursor-pointer border-2 focus:border-primary"
                    />
                    {doctorIdFile && <Upload className="h-5 w-5 text-verified animate-bounce" />}
                  </div>
                  <p className="text-sm text-muted-foreground bg-accent/10 p-2 rounded">
                    Upload your medical ID for <strong>instant verification</strong>. You can also verify later in your
                    profile.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-2 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base font-semibold">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-2 focus:border-primary"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="animate-slide-in">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary via-accent to-primary text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : `Sign Up as ${role === "doctor" ? "Doctor" : "Patient"}`}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-primary font-semibold hover:underline hover:text-accent transition-colors"
            >
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
