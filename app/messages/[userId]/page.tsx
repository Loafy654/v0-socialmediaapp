"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
  receiver_id: string
}

interface OtherUser {
  username: string
  full_name: string
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function MessagesPage() {
  const params = useParams()
  const router = useRouter()
  const recipientId = params.userId as string
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [recipientInfo, setRecipientInfo] = useState<OtherUser | null>(null)
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!isValidUUID(recipientId)) {
      setIsLoading(false)
      return
    }

    const initializeMessages = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        setCurrentUserId(user.id)

        const { data: recipientData, error: recipientError } = await supabase
          .from("profiles")
          .select("username, full_name")
          .eq("id", recipientId)
          .single()

        if (recipientError || !recipientData) {
          setIsLoading(false)
          return
        }

        setRecipientInfo(recipientData)

        const { data: sent } = await supabase
          .from("messages")
          .select("*")
          .eq("sender_id", user.id)
          .eq("receiver_id", recipientId)
          .order("created_at", { ascending: true })

        const { data: received } = await supabase
          .from("messages")
          .select("*")
          .eq("sender_id", recipientId)
          .eq("receiver_id", user.id)
          .order("created_at", { ascending: true })

        const combined = [...(sent || []), ...(received || [])].sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )

        setMessages(combined as Message[])
        setIsLoading(false)

        const channel = supabase
          .channel(`messages:${user.id}:${recipientId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `sender_id=eq.${recipientId},receiver_id=eq.${user.id}`,
            },
            (payload) => {
              const msg = payload.new as Message
              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev
                return [...prev, msg]
              })
            },
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `sender_id=eq.${user.id},receiver_id=eq.${recipientId}`,
            },
            (payload) => {
              const msg = payload.new as Message
              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev
                return [...prev, msg]
              })
            },
          )
          .subscribe()

        return () => {
          channel.unsubscribe()
        }
      } catch (error) {
        setIsLoading(false)
      }
    }

    initializeMessages()
  }, [recipientId, supabase, router])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId) return

    setIsSending(true)
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: currentUserId,
        receiver_id: recipientId,
        content: newMessage.trim(),
      })

      if (error) {
        alert("Failed to send message. Please try again.")
      } else {
        setNewMessage("")
      }
    } catch (error) {
      alert("Failed to send message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!recipientInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="text-center">
          <p className="text-xl mb-4">User not found</p>
          <Link href="/friends">
            <Button className="bg-gradient-to-r from-primary to-accent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Friends
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10">
      <div className="p-4 border-b border-border bg-gradient-to-r from-card to-secondary/20 flex items-center gap-3 shadow-md">
        <Link href="/friends">
          <Button variant="ghost" size="icon" className="hover:bg-primary/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="font-semibold text-lg">{recipientInfo?.full_name}</h1>
          <p className="text-xs text-muted-foreground">@{recipientInfo?.username}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === currentUserId ? "justify-end" : "justify-start"} animate-slide-in`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg shadow-md ${message.sender_id === currentUserId ? "bg-gradient-to-r from-primary to-accent text-primary-foreground" : "bg-card border border-border"}`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-border bg-gradient-to-r from-card to-secondary/20 flex gap-2 shadow-lg"
      >
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={isSending}
          className="border-2 border-primary/20 focus:border-primary"
        />
        <Button
          type="submit"
          disabled={isSending || !newMessage.trim()}
          className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
        </Button>
      </form>
    </div>
  )
}
