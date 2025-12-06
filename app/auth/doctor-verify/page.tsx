"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Upload, Loader } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function DoctorVerifyPage() {
  const [docIdImage, setDocIdImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        console.log("[v0] Auth check on doctor verify page - User:", user?.id)
        if (!user) {
          setError("You must be logged in to verify your doctor ID. Redirecting to login...")
          setTimeout(() => router.push("/auth/login"), 2000)
        } else {
          setIsCheckingAuth(false)
        }
      } catch (err) {
        console.log("[v0] Auth check error:", err)
        setError("Failed to verify your session. Please log in again.")
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [supabase, router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    setDocIdImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docIdImage) {
      setError("Please upload your Doctor ID image")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log("[v0] Doctor verify submit - User:", user?.id)

      if (!user) {
        throw new Error("User not found - please log in again")
      }

      const formData = new FormData()
      formData.append("file", docIdImage)
      formData.append("userId", user.id)

      console.log("[v0] Uploading doctor verification for user:", user.id)

      // Upload to backend
      const uploadResponse = await fetch("/api/doctor/upload-verification", {
        method: "POST",
        body: formData,
      })

      const responseData = await uploadResponse.json()
      console.log("[v0] Upload response:", responseData)

      if (!uploadResponse.ok) {
        throw new Error(responseData.error || "Failed to upload document")
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/auth/sign-up-success")
      }, 3000)
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "An error occurred"
      console.log("[v0] Doctor verify error:", errorMsg)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6 flex items-center justify-center">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Verifying your session...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Upload className="h-6 w-6" /> Doctor Verification
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Upload your official Doctor ID to get verified
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Alert className="border-accent/50 bg-accent/10">
              <AlertCircle className="h-4 w-4 text-accent" />
              <AlertDescription>
                Upload a clear photo of your official medical license or Doctor ID. Our admin team will verify it within
                24-48 hours and send confirmation to your email.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Label htmlFor="docId">Upload Doctor ID</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer relative">
                <input
                  id="docId"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {preview ? (
                  <div className="space-y-2">
                    <img
                      src={preview || "/placeholder.svg"}
                      alt="Doctor ID Preview"
                      className="max-h-48 mx-auto rounded"
                    />
                    <p className="text-sm text-muted-foreground">{docIdImage?.name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-success/50 bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Document submitted successfully! A confirmation email will be sent to your email address.
                  Redirecting...
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-accent"
              disabled={isLoading || !docIdImage}
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Submit for Verification"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You can continue using AIGYoo as an unverified doctor. Your profile will be marked as verified once
              approved.
            </p>
          </form>

          <div className="mt-6 text-center">
            <Link href="/feed" className="text-primary hover:underline text-sm">
              Skip for now and go to Feed
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
