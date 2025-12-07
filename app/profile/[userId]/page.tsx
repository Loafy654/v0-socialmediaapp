"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Upload, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserProfile {
  id: string
  username: string
  full_name: string
  bio: string
  role: "doctor" | "patient"
  is_verified: boolean
  specialization: string | null
  hospital: string | null
  years_of_experience: number | null
  phone_number: string | null
  created_at: string
}

interface VerificationStatus {
  status: "verified" | "pending" | "rejected" | "unverified"
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFriend, setIsFriend] = useState(false)
  const [friendRequestPending, setFriendRequestPending] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [showUploadSection, setShowUploadSection] = useState(false)
  const [doctorIdFile, setDoctorIdFile] = useState<File | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (userId === "edit") {
      router.replace("/profile/edit")
    }
  }, [userId, router])

  useEffect(() => {
    if (userId === "edit") {
      return
    }

    if (!userId || !isValidUUID(userId)) {
      setIsLoading(false)
      setProfile(null)
      return
    }

    const loadProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setCurrentUserId(user?.id || null)

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single()

        if (profileError || !profileData) {
          setProfile(null)
          setIsLoading(false)
          return
        }

        setProfile(profileData as UserProfile)

        if (profileData.role === "doctor") {
          const { data: verificationData } = await supabase
            .from("doctor_verifications")
            .select("status")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (verificationData) {
            setVerificationStatus({
              status: verificationData.status as "verified" | "pending" | "rejected" | "unverified",
            })
          } else {
            setVerificationStatus({ status: "unverified" })
          }
        }

        if (user?.id && user.id !== userId) {
          const { data: asRequester } = await supabase
            .from("friendships")
            .select("*")
            .eq("requester_id", user.id)
            .eq("receiver_id", userId)
            .eq("status", "accepted")

          const { data: asReceiver } = await supabase
            .from("friendships")
            .select("*")
            .eq("requester_id", userId)
            .eq("receiver_id", user.id)
            .eq("status", "accepted")

          setIsFriend(!!(asRequester?.length || asReceiver?.length))

          const { data: pendingRequest } = await supabase
            .from("friendships")
            .select("*")
            .eq("requester_id", user.id)
            .eq("receiver_id", userId)
            .eq("status", "pending")
            .maybeSingle()

          setFriendRequestPending(!!pendingRequest)
        }

        setIsLoading(false)
      } catch (error) {
        setIsLoading(false)
        setProfile(null)
      }
    }

    loadProfile()
  }, [userId, supabase, router])

  const handleUploadDoctorId = async () => {
    if (!doctorIdFile) {
      setUploadError("Please select a file")
      return
    }

    setIsUploading(true)
    setUploadError(null)

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
      const doctorIdUrl = uploadData.url

      const { data: existingVerification } = await supabase
        .from("doctor_verifications")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle()

      if (existingVerification) {
        const { error: verificationError } = await supabase
          .from("doctor_verifications")
          .update({
            doctor_id_image_url: doctorIdUrl,
            status: "verified",
            submitted_at: new Date().toISOString(),
            verified_at: new Date().toISOString(),
          })
          .eq("user_id", userId)

        if (verificationError) throw verificationError
      } else {
        const { error: verificationError } = await supabase.from("doctor_verifications").insert({
          user_id: userId,
          doctor_id_image_url: doctorIdUrl,
          status: "verified",
          submitted_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
        })

        if (verificationError) throw verificationError
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_verified: true,
          verification_date: new Date().toISOString(),
        })
        .eq("id", userId)

      if (profileError) throw profileError

      setUploadSuccess(true)
      setVerificationStatus({ status: "verified" })
      setDoctorIdFile(null)
      setShowUploadSection(false)

      const { data: updatedProfile } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (updatedProfile) {
        setProfile(updatedProfile as UserProfile)
      }
    } catch (error) {
      setUploadError("Failed to upload ID. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddFriend = async () => {
    if (!currentUserId || !isValidUUID(userId)) {
      alert("Cannot send friend request. Invalid user.")
      return
    }

    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: currentUserId,
        receiver_id: userId,
        status: "pending",
      })

      if (error) {
        alert("Failed to send friend request. Please try again.")
      } else {
        setFriendRequestPending(true)
      }
    } catch (error) {
      alert("Failed to send friend request. Please try again.")
    }
  }

  const handleCancelRequest = async () => {
    if (!currentUserId) return
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("requester_id", currentUserId)
        .eq("receiver_id", userId)

      if (error) {
        alert("Failed to cancel request. Please try again.")
      } else {
        setFriendRequestPending(false)
      }
    } catch (error) {
      alert("Failed to cancel request. Please try again.")
    }
  }

  if (userId === "edit" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 to-accent/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="text-center">
          <p className="text-xl mb-4">User not found</p>
          <Link href="/feed">
            <Button className="bg-gradient-to-r from-primary to-accent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUserId === userId

  const getDoctorBadge = () => {
    if (profile.role !== "doctor") {
      return (
        <Badge variant="outline" className="text-base px-3 py-1">
          Patient
        </Badge>
      )
    }

    if (!verificationStatus) {
      return (
        <Badge variant="secondary" className="text-base px-3 py-1">
          Doctor
        </Badge>
      )
    }

    switch (verificationStatus.status) {
      case "verified":
        return (
          <Badge className="bg-verified text-verified-foreground text-base px-3 py-1 flex items-center gap-1 animate-slide-in">
            <CheckCircle2 className="h-4 w-4" /> Verified Doctor
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white text-base px-3 py-1 animate-slide-in">
            ⏳ Pending Verification
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="text-base px-3 py-1 flex items-center gap-1 animate-slide-in">
            <XCircle className="h-4 w-4" /> Verification Rejected
          </Badge>
        )
      case "unverified":
        return (
          <Badge className="bg-unverified text-unverified-foreground text-base px-3 py-1 animate-slide-in">
            Unverified Doctor
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-base px-3 py-1">
            Doctor
          </Badge>
        )
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10 animate-fade-in">
      <Link href="/feed" className="mb-4 inline-block">
        <Button
          variant="outline"
          size="sm"
          className="hover:bg-primary hover:text-primary-foreground transition-all bg-transparent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>

      <Card className="p-8 shadow-xl border-primary/20 animate-scale-in">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {profile.full_name}
              </h1>
              <p className="text-lg text-muted-foreground mt-1">@{profile.username}</p>
            </div>
            <div className="flex gap-2">{getDoctorBadge()}</div>
          </div>

          {isOwnProfile && profile.role === "doctor" && verificationStatus?.status === "unverified" && (
            <Alert className="bg-gradient-to-r from-accent/20 to-primary/20 border-primary/30 animate-slide-in">
              <Upload className="h-5 w-5 text-primary" />
              <AlertDescription className="space-y-3">
                <p className="font-semibold text-base">Get verified to build trust with patients!</p>
                {!showUploadSection ? (
                  <Button
                    onClick={() => setShowUploadSection(true)}
                    className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all"
                  >
                    Upload Doctor ID for Verification
                  </Button>
                ) : (
                  <div className="space-y-3 pt-2">
                    <Label htmlFor="verifyId" className="text-base font-semibold">
                      Upload Your Medical License or Doctor ID
                    </Label>
                    <Input
                      id="verifyId"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setDoctorIdFile(e.target.files?.[0] || null)}
                      className="cursor-pointer border-2 border-primary"
                    />
                    {doctorIdFile && (
                      <p className="text-sm text-primary flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {doctorIdFile.name} selected
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleUploadDoctorId}
                        disabled={!doctorIdFile || isUploading}
                        className="bg-gradient-to-r from-verified to-accent hover:shadow-lg transition-all"
                      >
                        {isUploading ? "Uploading..." : "Submit for Verification"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowUploadSection(false)
                          setDoctorIdFile(null)
                          setUploadError(null)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    {uploadError && (
                      <Alert variant="destructive" className="animate-slide-in">
                        <AlertDescription>{uploadError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {uploadSuccess && (
            <Alert className="bg-verified/20 border-verified animate-slide-in">
              <CheckCircle2 className="h-5 w-5 text-verified" />
              <AlertDescription className="text-base font-semibold">
                Successfully verified! Your profile now shows a verified badge.
              </AlertDescription>
            </Alert>
          )}

          {profile.bio && (
            <div>
              <h3 className="font-semibold text-lg mb-2 text-primary">Bio</h3>
              <p className="text-muted-foreground">{profile.bio}</p>
            </div>
          )}

          {profile.role === "doctor" && (
            <div className="space-y-4 bg-gradient-to-br from-primary/5 to-accent/5 p-4 rounded-lg">
              {profile.specialization && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-primary">Specialization</h3>
                  <p className="text-muted-foreground">{profile.specialization}</p>
                </div>
              )}
              {profile.hospital && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-primary">Hospital / Clinic</h3>
                  <p className="text-muted-foreground">{profile.hospital}</p>
                </div>
              )}
              {profile.years_of_experience && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-primary">Years of Experience</h3>
                  <p className="text-muted-foreground">{profile.years_of_experience} years</p>
                </div>
              )}
              {profile.phone_number && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-primary">Contact</h3>
                  <p className="text-muted-foreground">{profile.phone_number}</p>
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            {isOwnProfile && (
              <Link href="/profile/edit">
                <Button className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all">
                  Edit Profile
                </Button>
              </Link>
            )}
            {!isOwnProfile && !isFriend && (
              <>
                {friendRequestPending ? (
                  <Button variant="secondary" onClick={handleCancelRequest} className="hover:shadow-lg transition-all">
                    Cancel Request
                  </Button>
                ) : (
                  <Button
                    onClick={handleAddFriend}
                    className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all"
                  >
                    Add Friend
                  </Button>
                )}
              </>
            )}
            {!isOwnProfile && (
              <Link href={`/messages/${userId}`}>
                <Button
                  variant="outline"
                  className="hover:bg-accent hover:text-accent-foreground transition-all bg-transparent"
                >
                  Message
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
