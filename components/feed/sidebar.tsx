"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, Home, MessageCircle, Users, LogOut, Shield, User, Stethoscope } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface SidebarProps {
  activeTab: "feed" | "messages" | "friends" | "ai-doctor"
  setActiveTab: (tab: "feed" | "messages" | "friends" | "ai-doctor") => void
  userId: string
}

export function Sidebar({ activeTab, setActiveTab, userId }: SidebarProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)
  const [userRole, setUserRole] = useState<"patient" | "doctor" | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "approved" | "rejected" | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      const supabase = createClient()
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, is_verified")
        .eq("id", userId)
        .single()

      if (profileData) {
        setUserRole(profileData.role)
        setIsVerified(profileData.is_verified)

        if (profileData.role === "doctor") {
          const { data: verificationData } = await supabase
            .from("doctor_verifications")
            .select("status")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          if (verificationData) {
            setVerificationStatus(verificationData.status as "pending" | "approved" | "rejected")
          }
        }
      }
    }
    fetchUserProfile()
  }, [userId])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleNavigation = (tab: "feed" | "messages" | "friends" | "ai-doctor") => {
    setActiveTab(tab)
  }

  const getDoctorBadge = () => {
    if (userRole !== "doctor") return null

    if (isVerified && verificationStatus === "approved") {
      return (
        <Badge variant="default" className="text-xs mt-1 bg-accent text-accent-foreground">
          ✓ Verified Doctor
        </Badge>
      )
    } else if (verificationStatus === "pending") {
      return (
        <Badge variant="secondary" className="text-xs mt-1">
          ⏳ Pending Verification
        </Badge>
      )
    } else if (verificationStatus === "rejected") {
      return (
        <Badge variant="destructive" className="text-xs mt-1">
          ✗ Verification Rejected
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="text-xs mt-1">
          Unverified Doctor
        </Badge>
      )
    }
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              AIGYoo
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Healthcare Network</p>
            {getDoctorBadge()}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <SidebarButton
          icon={<Home className="h-5 w-5" />}
          label="Feed"
          isActive={activeTab === "feed"}
          isOpen={true}
          onClick={() => handleNavigation("feed")}
        />
        <SidebarButton
          icon={<MessageCircle className="h-5 w-5" />}
          label="Messages"
          isActive={activeTab === "messages"}
          isOpen={true}
          onClick={() => handleNavigation("messages")}
        />
        <SidebarButton
          icon={<Users className="h-5 w-5" />}
          label="Friends"
          isActive={activeTab === "friends"}
          isOpen={true}
          onClick={() => handleNavigation("friends")}
        />
        <SidebarButton
          icon={<Stethoscope className="h-5 w-5" />}
          label="AI Doctor"
          isActive={activeTab === "ai-doctor"}
          isOpen={true}
          onClick={() => handleNavigation("ai-doctor")}
        />
        {userRole === "doctor" && (
          <SidebarButton
            icon={<Shield className="h-5 w-5" />}
            label="Profile"
            isActive={false}
            isOpen={true}
            onClick={() => userId && router.push(`/profile/${userId}`)}
          />
        )}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start bg-transparent"
          onClick={() => userId && router.push(`/profile/${userId}`)}
        >
          <User className="h-4 w-4 mr-2" />
          <span>Profile</span>
        </Button>
        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          <span>Logout</span>
        </Button>
      </div>
    </>
  )

  return (
    <>
      <div className="hidden lg:flex flex-col w-64 border-r border-border bg-card">
        <SidebarContent />
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-center justify-around p-2">
          <Button
            variant={activeTab === "feed" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("feed")}
            className="flex-col h-auto py-2 px-3"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Feed</span>
          </Button>
          <Button
            variant={activeTab === "messages" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("messages")}
            className="flex-col h-auto py-2 px-3"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs mt-1">Messages</span>
          </Button>
          <Button
            variant={activeTab === "friends" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("friends")}
            className="flex-col h-auto py-2 px-3"
          >
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">Friends</span>
          </Button>
          <Button
            variant={activeTab === "ai-doctor" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("ai-doctor")}
            className="flex-col h-auto py-2 px-3"
          >
            <Stethoscope className="h-5 w-5" />
            <span className="text-xs mt-1">AI</span>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-col h-auto py-2 px-3">
                <Menu className="h-5 w-5" />
                <span className="text-xs mt-1">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
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
      className={`w-full justify-start ${!isOpen && "justify-center"}`}
      onClick={onClick}
    >
      {icon}
      {isOpen && <span className="ml-2">{label}</span>}
    </Button>
  )
}
