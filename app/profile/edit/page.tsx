"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, ArrowLeft, Trash2 } from "lucide-react"
import Link from "next/link"

interface UserProfile {
  id: string
  username: string
  full_name: string
  bio: string
  role: "doctor" | "patient"
  specialization: string | null
  hospital: string | null
  years_of_experience: number | null
  phone_number: string | null
}

const SPECIALIZATIONS = [
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Dermatology",
  "General Practice",
  "Surgery",
  "Internal Medicine",
  "Emergency Medicine",
  "Obstetrics & Gynecology",
  "Ophthalmology",
  "Radiology",
  "Anesthesiology",
  "Pathology",
]

export default function EditProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (profileData) {
        setProfile(profileData as UserProfile)
      }
      setIsLoading(false)
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setIsSaving(true)
    try {
      await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          specialization: profile.specialization,
          hospital: profile.hospital,
          years_of_experience: profile.years_of_experience,
          phone_number: profile.phone_number,
        })
        .eq("id", profile.id)

      router.push(`/profile/${profile.id}`)
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!profile) return
    setIsDeleting(true)

    try {
      // Delete user by calling a server-side API endpoint
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("Error deleting user:", error)
        alert("Failed to delete account. Please try again.")
        setIsDeleting(false)
        return
      }

      // Sign out and redirect
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Error deleting account:", error)
      alert("Failed to delete account. Please try again.")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Error loading profile</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Link href={`/profile/${profile.id}`} className="mb-4 inline-block">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>

      <Card className="p-8">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <Input value={profile.username} disabled />
            <p className="text-xs text-muted-foreground mt-1">Cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          {profile.role === "doctor" && (
            <>
              <div className="pt-4 border-t">
                <h2 className="text-lg font-semibold mb-4">Doctor Information</h2>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Specialization</label>
                <Select
                  value={profile.specialization || ""}
                  onValueChange={(value) => setProfile({ ...profile, specialization: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hospital / Clinic</label>
                <Input
                  value={profile.hospital || ""}
                  onChange={(e) => setProfile({ ...profile, hospital: e.target.value })}
                  placeholder="e.g., St. Luke's Medical Center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Years of Experience</label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={profile.years_of_experience || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, years_of_experience: Number.parseInt(e.target.value) || null })
                  }
                  placeholder="e.g., 5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  type="tel"
                  value={profile.phone_number || ""}
                  onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                  placeholder="e.g., +63 912 345 6789"
                />
                <p className="text-xs text-muted-foreground mt-1">This will be visible to patients for consultations</p>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
            <Link href={`/profile/${profile.id}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t">
          <h2 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data from
                  our servers, including posts, messages, and friendships.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  )
}
