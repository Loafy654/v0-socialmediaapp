"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface Friend {
  id: string
  username: string
  full_name: string
  role: "doctor" | "patient"
  is_verified: boolean
}

export default function FriendsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      setUserId(user.id)
      await fetchFriends(user.id)

      const subscription = supabase
        .channel("friends_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friendships",
          },
          () => {
            fetchFriends(user.id)
          },
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }

    fetchData()
  }, [router, supabase])

  const fetchFriends = async (userId: string) => {
    try {
      const { data: requesterFriendships, error: reqError } = await supabase
        .from("friendships")
        .select("receiver_id")
        .eq("requester_id", userId)
        .eq("status", "accepted")

      if (reqError) throw reqError

      const { data: receiverFriendships, error: recError } = await supabase
        .from("friendships")
        .select("requester_id")
        .eq("receiver_id", userId)
        .eq("status", "accepted")

      if (recError) throw recError

      const friendIds = [
        ...(requesterFriendships?.map((f: any) => f.receiver_id) ?? []),
        ...(receiverFriendships?.map((f: any) => f.requester_id) ?? []),
      ]

      if (friendIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, full_name, role, is_verified")
          .in("id", friendIds)

        if (profilesError) throw profilesError

        if (profilesData) {
          setFriends(profilesData as Friend[])
        }
      } else {
        setFriends([])
      }
    } catch (error) {
      console.error("Error fetching friends:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 to-accent/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10 animate-fade-in">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/feed">
            <Button
              variant="outline"
              size="icon"
              className="hover:bg-primary hover:text-primary-foreground transition-all bg-transparent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Friends
          </h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : friends.length === 0 ? (
          <Card className="p-12 text-center shadow-xl border-primary/20 bg-gradient-to-br from-card to-secondary/5 animate-scale-in">
            <p className="text-lg text-muted-foreground mb-6">You haven't added any friends yet</p>
            <Link href="/feed">
              <Button className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all">
                Find Friends
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {friends.map((friend) => (
              <Card
                key={friend.id}
                className="p-6 hover:shadow-xl transition-all border-primary/10 bg-gradient-to-br from-card to-secondary/5 animate-slide-in"
              >
                <Link href={`/profile/${friend.id}`} className="hover:opacity-80 block mb-4 transition-opacity">
                  <h3 className="font-semibold text-xl mb-1">{friend.full_name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">@{friend.username}</p>
                  <div className="flex items-center gap-2">
                    {friend.role === "doctor" && (
                      <Badge
                        className={
                          friend.is_verified
                            ? "bg-verified text-verified-foreground flex items-center gap-1"
                            : "bg-unverified text-unverified-foreground"
                        }
                      >
                        {friend.is_verified ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Verified Doctor
                          </>
                        ) : (
                          "Unverified Doctor"
                        )}
                      </Badge>
                    )}
                    {friend.role === "patient" && <Badge variant="outline">Patient</Badge>}
                  </div>
                </Link>
                <Link href={`/messages/${friend.id}`}>
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all"
                    size="sm"
                  >
                    Message
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
