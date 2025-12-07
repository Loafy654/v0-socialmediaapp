"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface UserProfile {
  id: string
  username: string
  full_name: string
  role: "doctor" | "patient"
  is_verified: boolean
}

interface RightPanelProps {
  userId: string
}

export function RightPanel({ userId }: RightPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [friendRequests, setFriendRequests] = useState<UserProfile[]>([])
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())
  const [acceptedFriends, setAcceptedFriends] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchAllData()

    const friendshipSubscription = supabase
      .channel("friendships_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
        },
        () => {
          fetchAllData()
        },
      )
      .subscribe()

    return () => {
      friendshipSubscription.unsubscribe()
    }
  }, [userId])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      const [acceptedFriendsSet, sentRequestsSet] = await Promise.all([
        fetchAcceptedFriends(),
        fetchSentRequests(),
        fetchFriendRequests(),
      ])

      await fetchUsers(acceptedFriendsSet, sentRequestsSet)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAcceptedFriends = async (): Promise<Set<string>> => {
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

      const friendIds = new Set<string>()
      requesterFriendships?.forEach((item: any) => friendIds.add(item.receiver_id))
      receiverFriendships?.forEach((item: any) => friendIds.add(item.requester_id))
      setAcceptedFriends(friendIds)
      return friendIds
    } catch (error) {
      console.error("Error fetching accepted friends:", error)
      return new Set()
    }
  }

  const fetchUsers = async (acceptedFriendsSet?: Set<string>, sentRequestsSet?: Set<string>) => {
    try {
      const accepted = acceptedFriendsSet || acceptedFriends
      const sent = sentRequestsSet || sentRequests

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, role, is_verified")
        .neq("id", userId)
        .limit(20)

      if (error) throw error

      if (data) {
        const filtered = (data as UserProfile[]).filter((user) => !accepted.has(user.id) && !sent.has(user.id))
        setUsers(filtered.slice(0, 10))
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchFriendRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("requester_id, profiles!friendships_requester_id_fkey(id, username, full_name, role, is_verified)")
        .eq("receiver_id", userId)
        .eq("status", "pending")

      if (error) throw error

      if (data) {
        setFriendRequests(data.map((item: any) => item.profiles) as UserProfile[])
      }
    } catch (error) {
      console.error("Error fetching friend requests:", error)
    }
  }

  const fetchSentRequests = async (): Promise<Set<string>> => {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("receiver_id")
        .eq("requester_id", userId)
        .eq("status", "pending")

      if (error) throw error

      if (data) {
        const requestSet = new Set(data.map((item: any) => item.receiver_id))
        setSentRequests(requestSet)
        return requestSet
      }
      return new Set()
    } catch (error) {
      console.error("Error fetching sent requests:", error)
      return new Set()
    }
  }

  const handleAddFriend = async (targetUserId: string) => {
    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: userId,
        receiver_id: targetUserId,
        status: "pending",
      })

      if (error) throw error

      setSentRequests(new Set([...sentRequests, targetUserId]))
      setUsers(users.filter((u) => u.id !== targetUserId))
    } catch (error) {
      console.error("Error adding friend:", error)
      alert("Failed to send friend request. Please try again.")
    }
  }

  const handleCancelRequest = async (targetUserId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("requester_id", userId)
        .eq("receiver_id", targetUserId)

      if (error) throw error

      const newSentRequests = new Set([...sentRequests].filter((id) => id !== targetUserId))
      setSentRequests(newSentRequests)
      await fetchUsers(acceptedFriends, newSentRequests)
    } catch (error) {
      console.error("Error canceling request:", error)
      alert("Failed to cancel request. Please try again.")
    }
  }

  const handleAcceptFriend = async (requesterId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("requester_id", requesterId)
        .eq("receiver_id", userId)

      if (error) throw error

      const newAcceptedFriends = new Set([...acceptedFriends, requesterId])
      setAcceptedFriends(newAcceptedFriends)
      setFriendRequests(friendRequests.filter((user) => user.id !== requesterId))
      await fetchUsers(newAcceptedFriends, sentRequests)
    } catch (error) {
      console.error("Error accepting friend:", error)
      alert("Failed to accept friend request. Please try again.")
    }
  }

  return (
    <div className="w-80 border-l border-border bg-gradient-to-b from-card to-secondary/10 p-4 space-y-4 overflow-y-auto hidden lg:block shadow-inner">
      <Input
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border-2 focus:border-primary"
      />

      {friendRequests.length > 0 && (
        <Card className="p-4 shadow-lg border-primary/20 bg-gradient-to-br from-card to-accent/5 animate-slide-in">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
            Friend Requests
          </h3>
          <div className="space-y-3">
            {friendRequests.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <Link href={`/profile/${user.id}`} className="flex-1 hover:opacity-80 transition-opacity">
                  <p className="font-semibold text-sm">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                  {user.role === "doctor" && (
                    <Badge
                      className={`text-xs mt-1 ${user.is_verified ? "bg-verified text-verified-foreground" : "bg-unverified text-unverified-foreground"}`}
                    >
                      {user.is_verified ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                        </>
                      ) : (
                        "Unverified"
                      )}
                    </Badge>
                  )}
                </Link>
                <Button
                  size="sm"
                  onClick={() => handleAcceptFriend(user.id)}
                  className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all"
                >
                  Accept
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 shadow-lg border-primary/20 bg-gradient-to-br from-card to-secondary/5">
        <h3 className="font-bold mb-3 text-primary">Suggested Users</h3>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-xs text-muted-foreground">No more suggestions</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <Link href={`/profile/${user.id}`} className="flex-1 hover:opacity-80 transition-opacity">
                  <p className="font-semibold text-sm">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                  {user.role === "doctor" && (
                    <Badge
                      className={`text-xs mt-1 ${user.is_verified ? "bg-verified text-verified-foreground" : "bg-unverified text-unverified-foreground"}`}
                    >
                      {user.is_verified ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                        </>
                      ) : (
                        "Unverified"
                      )}
                    </Badge>
                  )}
                </Link>
                {sentRequests.has(user.id) ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCancelRequest(user.id)}
                    className="hover:shadow transition-all"
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddFriend(user.id)}
                    className="hover:bg-primary/10 transition-all bg-transparent"
                  >
                    Add
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
