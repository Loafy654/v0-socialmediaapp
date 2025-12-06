"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { CreatePost } from "./create-post"
import { Post } from "./post"
import { Loader2 } from "lucide-react"

interface FeedProps {
  userId: string
}

interface PostData {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string
    full_name: string
  }
}

export function Feed({ userId }: FeedProps) {
  const [posts, setPosts] = useState<PostData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchPosts()

    const subscription = supabase
      .channel("posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchPosts()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, created_at, user_id, profiles(username, full_name)")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setPosts(data as PostData[])
    }
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="sticky top-0 bg-card border-b border-border z-10">
        <CreatePost userId={userId} onPostCreated={fetchPosts} />
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No posts yet. Create the first one!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post) => (
              <Post key={post.id} post={post} currentUserId={userId} onPostUpdated={fetchPosts} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
