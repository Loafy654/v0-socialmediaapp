"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

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
  status: "approved" | "pending" | "rejected" | "none"
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
  const supabase = createClient()

  useEffect(() => {
    if (userId === "edit") {
      router.replace("/profile/edit")
    }
  }, [userId, router])

  useEffect(() => {
    if (userId === "edit") {
      return // Skip loading if redirecting to edit
    }

    if (!isValidUUID(userId)) {
      console.error("Invalid user ID format:", userId)
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
          .maybeSingle()

        if (profileError) {
          console.error("Error fetching profile:", profileError)
          setProfile(null)
        } else if (!profileData) {
          console.error("Profile not found for user:", userId)
          setProfile(null)
        } else {
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
              setVerificationStatus({ status: verificationData.status as "approved" | "pending" | "rejected" })
            } else {
              setVerificationStatus({ status: "none" })
            }
          }
        }

        if (user?.id && user.id !== userId && profileData) {
          const { data: asRequester, error: reqError } = await supabase
            .from("friendships")
            .select("*")
            .eq("requester_id", user.id)
            .eq("receiver_id", userId)
            .eq("status", "accepted")

          if (reqError) {
            console.error("Error checking requester friendship:", reqError)
          }

          const { data: asReceiver, error: recError } = await supabase
            .from("friendships")
            .select("*")
            .eq("requester_id", userId)
            .eq("receiver_id", user.id)
            .eq("status", "accepted")

          if (recError) {
            console.error("Error checking receiver friendship:", recError)
          }

          setIsFriend(!!(asRequester?.length || asReceiver?.length))

          const { data: pendingRequest, error: pendingError } = await supabase
            .from("friendships")
            .select("*")
            .eq("requester_id", user.id)
            .eq("receiver_id", userId)
            .eq("status", "pending")
            .maybeSingle()

          if (pendingError) {
            console.error("Error checking pending request:", pendingError)
          }

          setFriendRequestPending(!!pendingRequest)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error loading profile:", error)
        setProfile(null)
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [userId, supabase])

  const handleAddFriend = async () => {
    if (!currentUserId || !isValidUUID(userId)) {
      console.error("Error adding friend: invalid user ID")
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
        console.error("Error adding friend:", error)
        alert("Failed to send friend request. Please try again.")
      } else {
        setFriendRequestPending(true)
      }
    } catch (error) {
      console.error("Error:", error)
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
        console.error("Error canceling request:", error)
        alert("Failed to cancel request. Please try again.")
      } else {
        setFriendRequestPending(false)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Failed to cancel request. Please try again.")
    }
  }

  if (userId === "edit" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl mb-4">User not found</p>
          <Link href="/feed">
            <Button>
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
      return <Badge variant="outline">Patient</Badge>
    }

    if (!verificationStatus) {
      return <Badge variant="secondary">Doctor</Badge>
    }

    switch (verificationStatus.status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-600">
            ✓ Verified Doctor
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-600">
            ⏳ Pending Verification
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">✗ Verification Rejected</Badge>
      case "none":
        return <Badge variant="secondary">Unverified Doctor</Badge>
      default:
        return <Badge variant="secondary">Doctor</Badge>
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Link href="/feed" className="mb-4 inline-block">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>

      <Card className="p-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{profile.full_name}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>
            <div className="flex gap-2">{getDoctorBadge()}</div>
          </div>

          {profile.bio && (
            <div>
              <h3 className="font-semibold mb-2">Bio</h3>
              <p className="text-muted-foreground">{profile.bio}</p>
            </div>
          )}

          {profile.role === "doctor" && (
            <div className="space-y-4">
              {profile.specialization && (
                <div>
                  <h3 className="font-semibold mb-2">Specialization</h3>
                  <p className="text-muted-foreground">{profile.specialization}</p>
                </div>
              )}
              {profile.hospital && (
                <div>
                  <h3 className="font-semibold mb-2">Hospital / Clinic</h3>
                  <p className="text-muted-foreground">{profile.hospital}</p>
                </div>
              )}
              {profile.years_of_experience && (
                <div>
                  <h3 className="font-semibold mb-2">Years of Experience</h3>
                  <p className="text-muted-foreground">{profile.years_of_experience} years</p>
                </div>
              )}
              {profile.phone_number && (
                <div>
                  <h3 className="font-semibold mb-2">Contact</h3>
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
                <Button>Edit Profile</Button>
              </Link>
            )}
            {!isOwnProfile && !isFriend && (
              <>
                {friendRequestPending ? (
                  <Button variant="secondary" onClick={handleCancelRequest}>
                    Cancel Request
                  </Button>
                ) : (
                  <Button onClick={handleAddFriend}>Add Friend</Button>
                )}
              </>
            )}
            {!isOwnProfile && (
              <Link href={`/messages/${userId}`}>
                <Button variant="outline">Message</Button>
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
