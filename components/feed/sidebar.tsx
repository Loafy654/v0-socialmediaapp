"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, Home, MessageCircle, Users, LogOut, Shield, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  activeTab: "feed" | "messages" | "friends"
  setActiveTab: (tab: "feed" | "messages" | "friends") => void
  userId: string
}

export function Sidebar({ activeTab, setActiveTab, userId }: SidebarProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)
  const [userRole, setUserRole] = useState<"patient" | "doctor" | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("profiles").select("role, is_verified").eq("id", userId).single()
      if (data) {
        setUserRole(data.role)
        setIsVerified(data.is_verified)
      }
    }
    fetchUserProfile()
  }, [userId])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div
      className={`flex flex-col ${isOpen ? "w-64" : "w-20"} border-r border-border bg-card transition-all duration-300`}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {isOpen && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AIGYoo
              </h1>
              {userRole === "doctor" && (
                <div className="flex items-center gap-1">
                  <Badge variant={isVerified ? "default" : "secondary"} className="text-xs mt-1">
                    {isVerified ? "✓ Verified" : "Pending"}
                  </Badge>
                </div>
              )}
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <SidebarButton
          icon={<Home className="h-5 w-5" />}
          label="Feed"
          isActive={activeTab === "feed"}
          isOpen={isOpen}
          onClick={() => setActiveTab("feed")}
        />
        <SidebarButton
          icon={<MessageCircle className="h-5 w-5" />}
          label="Messages"
          isActive={activeTab === "messages"}
          isOpen={isOpen}
          onClick={() => setActiveTab("messages")}
        />
        <SidebarButton
          icon={<Users className="h-5 w-5" />}
          label="Friends"
          isActive={activeTab === "friends"}
          isOpen={isOpen}
          onClick={() => setActiveTab("friends")}
        />
        {userRole === "doctor" && (
          <SidebarButton
            icon={<Shield className="h-5 w-5" />}
            label="Profile"
            isActive={false}
            isOpen={isOpen}
            onClick={() => userId && router.push(`/profile/${userId}`)}
          />
        )}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full bg-transparent"
          onClick={() => userId && router.push(`/profile/${userId}`)}
        >
          <User className="h-4 w-4" />
          {isOpen && <span className="ml-2">Profile</span>}
        </Button>
        <Button variant="outline" className="w-full bg-transparent" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          {isOpen && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  )
}

interface SidebarButtonProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  isOpen: boolean
  onClick: () => void
}

function SidebarButton({ icon, label, isActive, isOpen, onClick }: SidebarButtonProps) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      className={`w-full justify-start ${!isOpen && "p-0"}`}
      onClick={onClick}
    >
      {icon}
      {isOpen && <span className="ml-2">{label}</span>}
    </Button>
  )
}
