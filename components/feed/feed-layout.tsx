"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { Feed } from "./feed"
import { RightPanel } from "./right-panel"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { AIDoctorChat } from "@/components/ai-doctor/ai-doctor-chat"

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

interface Conversation {
  otherUserId: string
  otherUserName: string
  otherUserUsername: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

export function FeedLayout({ userId }: FeedLayoutProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "messages" | "friends" | "ai-doctor">("feed")
  const [friends, setFriends] = useState<Friend[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  useEffect(() => {
    if (activeTab === "friends") {
      fetchFriends()
    } else if (activeTab === "messages") {
      fetchConversations()
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

  const fetchConversations = async () => {
    setIsLoadingMessages(true)
    try {
      const supabase = createClient()

      const { data: allMessages, error: messagesError } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, content, created_at, read_at")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })

      if (messagesError) throw messagesError

      if (!allMessages || allMessages.length === 0) {
        setConversations([])
        return
      }

      const conversationMap = new Map<string, any>()

      allMessages.forEach((msg: any) => {
        const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            otherUserId,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            isRead: msg.read_at !== null,
          })
        }
      })

      const otherUserIds = Array.from(conversationMap.keys())
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", otherUserIds)

      if (profilesError) throw profilesError

      const conversationList: Conversation[] = profiles
        ? profiles.map((profile: any) => ({
            otherUserId: profile.id,
            otherUserName: profile.full_name,
            otherUserUsername: profile.username,
            lastMessage: conversationMap.get(profile.id)?.lastMessage || "",
            lastMessageTime: conversationMap.get(profile.id)?.lastMessageTime || "",
            unreadCount: 0,
          }))
        : []

      setConversations(conversationList)
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  return (
    <div className="flex h-screen bg-background pb-16 lg:pb-0">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userId={userId} />
      <div className="flex-1 lg:border-l border-border overflow-hidden">
        {activeTab === "feed" && <Feed userId={userId} />}
        {activeTab === "messages" && <MessagesTab conversations={conversations} isLoading={isLoadingMessages} />}
        {activeTab === "friends" && <FriendsTab friends={friends} isLoading={isLoadingFriends} userId={userId} />}
        {activeTab === "ai-doctor" && <AIDoctorChat userId={userId} />}
      </div>
      <div className="hidden xl:block">
        <RightPanel userId={userId} />
      </div>
    </div>
  )
}

function MessagesTab({ conversations, isLoading }: { conversations: Conversation[]; isLoading: boolean }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-muted-foreground mb-4">No conversations yet</p>
            <p className="text-sm text-muted-foreground">Add a friend and send them a message to start chatting!</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {conversations.map((conversation) => (
              <Link key={conversation.otherUserId} href={`/messages/${conversation.otherUserId}`}>
                <Card className="p-4 hover:shadow-lg transition-shadow hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{conversation.otherUserName}</h3>
                      <p className="text-sm text-muted-foreground mb-2">@{conversation.otherUserUsername}</p>
                      <p className="text-sm truncate">{conversation.lastMessage}</p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                      {formatDistanceToNow(new Date(conversation.lastMessageTime), { addSuffix: true })}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
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

function AiDoctorTab() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold">AI Doctor</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-muted-foreground mb-4">Connect with an AI doctor for assistance</p>
          <Button variant="outline" onClick={() => console.log("AI Doctor feature coming soon!")}>
            Consult AI Doctor
          </Button>
        </div>
      </div>
    </div>
  )
}
