"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, Home, MessageCircle, Users, LogOut, Shield, User, Stethoscope, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "verified" | "rejected" | "unverified" | null
  >(null)

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
            .maybeSingle()

          if (verificationData) {
            setVerificationStatus(verificationData.status as "pending" | "verified" | "rejected" | "unverified")
          } else {
            setVerificationStatus("unverified")
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

    if (isVerified && verificationStatus === "verified") {
      return (
        <Badge className="bg-verified text-verified-foreground text-xs mt-1 flex items-center gap-1">✓ Verified</Badge>
      )
    } else if (verificationStatus === "pending") {
      return (
        <Badge variant="secondary" className="bg-yellow-500 text-white text-xs mt-1">
          ⏳ Pending
        </Badge>
      )
    } else if (verificationStatus === "rejected") {
      return (
        <Badge variant="destructive" className="text-xs mt-1">
          ✗ Rejected
        </Badge>
      )
    } else {
      return <Badge className="bg-unverified text-unverified-foreground text-xs mt-1">Unverified</Badge>
    }
  }

  return (
    <div
      className={`flex flex-col ${isOpen ? "w-64" : "w-20"} border-r border-border bg-gradient-to-b from-card to-secondary/20 transition-all duration-300 shadow-lg`}
    >
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center justify-between">
          {isOpen && (
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                AIGYoo
              </h1>
              {getDoctorBadge()}
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="hover:bg-primary/20">
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
          onClick={() => handleNavigation("feed")}
        />
        <SidebarButton
          icon={<MessageCircle className="h-5 w-5" />}
          label="Messages"
          isActive={activeTab === "messages"}
          isOpen={isOpen}
          onClick={() => handleNavigation("messages")}
        />
        <SidebarButton
          icon={<Users className="h-5 w-5" />}
          label="Friends"
          isActive={activeTab === "friends"}
          isOpen={isOpen}
          onClick={() => handleNavigation("friends")}
        />
        <SidebarButton
          icon={<Stethoscope className="h-5 w-5" />}
          label="AI Doctor"
          isActive={activeTab === "ai-doctor"}
          isOpen={isOpen}
          onClick={() => handleNavigation("ai-doctor")}
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

      <div className="p-4 border-t border-border space-y-2 bg-gradient-to-r from-primary/5 to-accent/5">
        <Button
          variant="outline"
          className="w-full bg-transparent hover:bg-primary/20 transition-all"
          onClick={() => userId && router.push(`/profile/${userId}`)}
        >
          <User className="h-4 w-4" />
          {isOpen && <span className="ml-2">Profile</span>}
        </Button>
        <Button
          variant="outline"
          className="w-full bg-transparent hover:bg-destructive/20 transition-all"
          onClick={handleLogout}
        >
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
      className={`w-full justify-start transition-all duration-200 ${isActive ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md" : "hover:bg-primary/10"} ${!isOpen && "justify-center"}`}
      onClick={onClick}
    >
      {icon}
      {isOpen && <span className="ml-2">{label}</span>}
    </Button>
  )
}
