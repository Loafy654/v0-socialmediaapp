"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart, MessageCircle, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface PostData {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    id: string
    username: string
    full_name: string
    role: "doctor" | "patient"
    is_verified: boolean
  }
}

interface PostProps {
  post: PostData
  currentUserId: string
  onPostUpdated: () => void
}

interface Like {
  id: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  profiles: {
    id: string
    username: string
    full_name: string
    role: "doctor" | "patient"
    is_verified: boolean
  }
}

export function Post({ post, currentUserId, onPostUpdated }: PostProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [showComments, setShowComments] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchLikes()
    fetchComments()
  }, [post.id])

  const fetchLikes = async () => {
    const { count } = await supabase.from("likes").select("*", { count: "exact" }).eq("post_id", post.id)

    setLikeCount(count || 0)

    const { data } = await supabase.from("likes").select("id").eq("post_id", post.id).eq("user_id", currentUserId)

    setIsLiked(!!data?.length)
  }

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("id, content, created_at, profiles(id, username, full_name, role, is_verified)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: false })

    if (data) setComments(data as Comment[])
  }

  const handleLike = async () => {
    if (isLiked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", currentUserId)
    } else {
      await supabase.from("likes").insert({
        post_id: post.id,
        user_id: currentUserId,
      })
    }
    fetchLikes()
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsLoading(true)
    try {
      await supabase.from("comments").insert({
        post_id: post.id,
        user_id: currentUserId,
        content: newComment.trim(),
      })
      setNewComment("")
      fetchComments()
    } catch (error) {
      console.error("Error posting comment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePost = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this post?")
    if (!confirmed) return

    try {
      await supabase.from("posts").delete().eq("id", post.id)
      onPostUpdated()
    } catch (error) {
      console.error("Error deleting post:", error)
    }
  }

  return (
    <Card className="m-4 p-4">
      <div className="space-y-4">
        {/* Post Header */}
        <div className="flex items-center justify-between">
          <Link href={`/profile/${post.user_id}`} className="hover:opacity-80 flex-1">
            <div className="flex items-center gap-2">
              <div>
                <p className="font-semibold">{post.profiles.full_name || post.profiles.username}</p>
                <p className="text-xs text-muted-foreground">
                  @{post.profiles.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
              {post.profiles.role === "doctor" && (
                <Badge variant={post.profiles.is_verified ? "default" : "secondary"} className="ml-auto">
                  {post.profiles.is_verified ? "✓ Verified" : "Unverified"}
                </Badge>
              )}
            </div>
          </Link>
          {post.user_id === currentUserId && (
            <Button variant="ghost" size="sm" onClick={handleDeletePost}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>

        {/* Post Content */}
        <p className="text-base">{post.content}</p>

        {/* Like and Comment Actions */}
        <div className="flex gap-4 pt-4 border-t border-border text-muted-foreground">
          <Button variant="ghost" size="sm" onClick={handleLike} className={isLiked ? "text-destructive" : ""}>
            <Heart className={`h-4 w-4 ${isLiked ? "fill-destructive" : ""}`} />
            <span className="ml-2">{likeCount}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowComments(!showComments)}>
            <MessageCircle className="h-4 w-4" />
            <span className="ml-2">{comments.length}</span>
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-4 border-t border-border pt-4">
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <Input
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" size="sm" disabled={isLoading || !newComment.trim()}>
                {isLoading ? "..." : "Post"}
              </Button>
            </form>

            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="p-3 bg-muted rounded">
                  <Link href={`/profile/${comment.profiles.id}`} className="hover:opacity-80">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-sm font-semibold text-sm">
                          {comment.profiles.full_name || comment.profiles.username}
                        </p>
                        <p className="text-sm text-muted-foreground">@{comment.profiles.username}</p>
                      </div>
                      {comment.profiles.role === "doctor" && (
                        <Badge variant={comment.profiles.is_verified ? "default" : "secondary"} className="text-xs">
                          {comment.profiles.is_verified ? "✓" : "!"}
                        </Badge>
                      )}
                    </div>
                  </Link>
                  <p className="text-sm mt-2">{comment.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
