"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Feed } from "./feed"
import { RightPanel } from "./right-panel"

interface FeedLayoutProps {
  userId: string
}

export function FeedLayout({ userId }: FeedLayoutProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "messages" | "friends">("feed")

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userId={userId} />
      <div className="flex-1 border-l border-border overflow-hidden">
        {activeTab === "feed" && <Feed userId={userId} />}
        {activeTab === "messages" && <MessagesPlaceholder />}
        {activeTab === "friends" && <FriendsPlaceholder />}
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

function FriendsPlaceholder() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold">Friends</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 text-center text-muted-foreground">
          <p>Go to your friends page to see all friends</p>
        </div>
      </div>
    </div>
  )
}
