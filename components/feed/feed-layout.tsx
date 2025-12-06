"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Feed } from "./feed"
import { RightPanel } from "./right-panel"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface FeedLayoutProps {
  userId: string
}

interface Friend {
  id: string
  username: string
  full_name: string
  role: "doctor" | "patient"
  is_verified: boolean
}

export function FeedLayout({ userId }: FeedLayoutProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "messages" | "friends">("feed")
  const [friends, setFriends] = useState<Friend[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)

  useEffect(() => {
    if (activeTab === "friends") {
      fetchFriends()
    }
  }, [activeTab, userId])

  const fetchFriends = async () => {
    setIsLoadingFriends(true)
    try {
      const supabase = createClient()

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
      setIsLoadingFriends(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userId={userId} />
      <div className="flex-1 border-l border-border overflow-hidden">
        {activeTab === "feed" && <Feed userId={userId} />}
        {activeTab === "messages" && <MessagesPlaceholder />}
        {activeTab === "friends" && <FriendsTab friends={friends} isLoading={isLoadingFriends} userId={userId} />}
      </div>
      <RightPanel userId={userId} />
    </div>
  )
}

function MessagesPlaceholder() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 text-center text-muted-foreground">
          <p>Select a conversation to start messaging</p>
        </div>
      </div>
    </div>
  )
}

function FriendsTab({ friends, isLoading, userId }: { friends: Friend[]; isLoading: boolean; userId: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold">Friends</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-4">You haven't added any friends yet</p>
            <Button variant="outline" onClick={() => window.scrollTo(0, 0)}>
              Find Friends in Feed
            </Button>
          </div>
        ) : (
          <div className="p-4 grid gap-4 grid-cols-1 md:grid-cols-2">
            {friends.map((friend) => (
              <Card key={friend.id} className="p-4 hover:shadow-lg transition-shadow">
                <Link href={`/profile/${friend.id}`} className="hover:opacity-80 block mb-3">
                  <h3 className="font-semibold">{friend.full_name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">@{friend.username}</p>
                  <div className="flex items-center gap-2">
                    {friend.role === "doctor" && (
                      <Badge variant={friend.is_verified ? "default" : "secondary"}>
                        {friend.is_verified ? "✓ Verified Doctor" : "Unverified Doctor"}
                      </Badge>
                    )}
                    {friend.role === "patient" && <Badge variant="outline">Patient</Badge>}
                  </div>
                </Link>
                <Link href={`/messages/${friend.id}`}>
                  <Button className="w-full" variant="default" size="sm">
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
