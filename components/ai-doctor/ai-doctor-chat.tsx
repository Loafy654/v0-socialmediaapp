"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import {
  Send,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Stethoscope,
  Activity,
  Phone,
  AlertTriangle,
  Loader2,
  History,
  MapPin,
  Save,
} from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatHistory {
  id: string
  symptom: string
  start_date: string
  end_date: string | null
  is_ongoing: boolean
  duration: string | null
  patterns: string | null
  notes: string | null
  chat_messages: Message[]
  created_at: string
}

interface AIDoctorChatProps {
  userId: string
}

export function AIDoctorChat({ userId }: AIDoctorChatProps) {
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [showSettings, setShowSettings] = useState(true)
  const [savedHistories, setSavedHistories] = useState<ChatHistory[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveForm, setSaveForm] = useState({
    symptom: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    is_ongoing: true,
    duration: "",
    patterns: "",
    notes: "",
  })
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatHistory, streamingContent])

  useEffect(() => {
    fetchSavedHistories()
  }, [userId])

  const fetchSavedHistories = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("ai_doctor_chat_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setSavedHistories(data as ChatHistory[])
    }
  }

  const handleSaveChat = async () => {
    if (!saveForm.symptom || chatHistory.length === 0) {
      alert("Please enter a symptom and have at least one message in the chat")
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from("ai_doctor_chat_history").insert({
      user_id: userId,
      symptom: saveForm.symptom,
      start_date: saveForm.start_date,
      end_date: saveForm.is_ongoing ? null : saveForm.end_date || null,
      is_ongoing: saveForm.is_ongoing,
      duration: saveForm.duration || null,
      patterns: saveForm.patterns || null,
      notes: saveForm.notes || null,
      chat_messages: chatHistory,
    })

    if (!error) {
      setShowSaveDialog(false)
      setSaveForm({
        symptom: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        is_ongoing: true,
        duration: "",
        patterns: "",
        notes: "",
      })
      fetchSavedHistories()
      alert("Chat history saved successfully!")
    } else {
      alert("Error saving chat history")
    }
  }

  const loadHistoryChat = (history: ChatHistory) => {
    try {
      const messages = (history.chat_messages || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: typeof msg.timestamp === "string" ? new Date(msg.timestamp) : new Date(msg.timestamp),
      }))
      setChatHistory(messages)
    } catch (error) {
      console.error("Error loading chat history:", error)
      alert("Error loading chat history. Please try again.")
    }
  }

  const deleteHistoryChat = async (historyId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("ai_doctor_chat_history").delete().eq("id", historyId).eq("user_id", userId)

    if (!error) {
      fetchSavedHistories()
      alert("Chat history deleted successfully!")
    } else {
      alert("Error deleting chat history")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !apiKey.trim() || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
    }

    setChatHistory((prev) => [...prev, userMessage])
    setMessage("")
    setIsLoading(true)
    setIsStreaming(true)
    setStreamingContent("")

    try {
      const systemMessage = {
        role: "system",
        content: `You are an advanced AI doctor and medical information provider with expertise in healthcare, symptom analysis, and medical guidance. You provide comprehensive, empathetic, and informative responses while prioritizing patient safety.

MEDICAL EXPERTISE AREAS:
- Symptom analysis and differential diagnosis
- General medicine and family practice
- Preventive healthcare and wellness
- Medication information and interactions
- Emergency recognition and triage
- Mental health and wellness support
- Chronic disease management
- Health education and lifestyle counseling

RESPONSE GUIDELINES:
- Provide detailed, well-structured medical information
- Use clear, understandable language for patients
- Include relevant follow-up questions when appropriate
- Suggest specific next steps and timeline for care
- Explain medical concepts in an educational manner
- Consider multiple possibilities and risk factors
- Provide context about when symptoms warrant immediate attention

CRITICAL SAFETY PROTOCOLS:
- Always emphasize that you are not a replacement for professional medical care
- Strongly recommend consulting healthcare professionals for diagnosis and treatment
- Immediately advise emergency services for life-threatening symptoms
- Clearly state limitations of AI-based medical advice
- Prioritize patient safety above all other considerations
- Include appropriate medical disclaimers in responses

COMMUNICATION STYLE:
- Be empathetic, caring, and professional
- Show genuine concern for patient wellbeing
- Provide hope while being realistic about conditions
- Use a warm, reassuring tone while maintaining medical accuracy
- Structure responses clearly with headers and bullet points when helpful
- Include relevant medical terminology with explanations

Remember: Your role is to educate, inform, and guide patients toward appropriate medical care, not to replace professional medical diagnosis or treatment.`,
      }

      const messages = [
        systemMessage,
        ...chatHistory.map((msg) => ({ role: msg.role, content: msg.content })),
        { role: "user", content: userMessage.content },
      ]

      const models = [
        "google/gemini-2.0-flash-exp:free",
        "google/gemini-flash-1.5",
        "meta-llama/llama-3.1-8b-instruct:free",
        "microsoft/phi-3-mini-128k-instruct:free",
        "qwen/qwen-2-7b-instruct:free",
      ]

      let success = false
      let lastError = null

      for (const model of models) {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
              "X-Title": "AI Doctor Assistant - Advanced Medical Consultation",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: model,
              messages: messages,
              stream: true,
              temperature: 0.7,
              max_tokens: 2000,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            lastError = errorText
            continue
          }

          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          let fullContent = ""

          if (reader) {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value)
              const lines = chunk.split("\n")

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6)
                  if (data.trim() === "[DONE]") continue

                  try {
                    const parsed = JSON.parse(data)
                    if (parsed.choices?.[0]?.delta?.content) {
                      const content = parsed.choices[0].delta.content
                      fullContent += content
                      setStreamingContent(fullContent)
                    }
                  } catch (e) {
                    // Skip parsing errors
                  }
                }
              }
            }

            if (fullContent) {
              const assistantMessage: Message = {
                role: "assistant",
                content: fullContent,
                timestamp: new Date(),
              }
              setChatHistory((prev) => [...prev, assistantMessage])
              success = true
              break
            }
          }
        } catch (error) {
          lastError = error
          continue
        }
      }

      if (!success) {
        throw new Error(lastError instanceof Error ? lastError.message : "All models failed to respond")
      }
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: `I apologize, but I'm experiencing connection difficulties. Please check the following:

1. Verify your OpenRouter API key is correct
2. Ensure you have credits available in your OpenRouter account
3. Check your internet connection

If you're experiencing a medical emergency, please call emergency services immediately (911 or your local emergency number).

Error details: ${error instanceof Error ? error.message : "Connection failed"}`,
        timestamp: new Date(),
      }
      setChatHistory((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingContent("")
    }
  }

  const clearChat = () => {
    setChatHistory([])
    setStreamingContent("")
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const bacoorHospitals = [
    {
      name: "Las Piñas-Bacoor Community Medical Center",
      address: "Molino III, Bacoor, Cavite",
      phone: "(046) 472-3145",
      type: "General Hospital",
    },
    {
      name: "Medical Center of Cavite",
      address: "Molino Boulevard, Bacoor, Cavite",
      phone: "(046) 471-0382",
      type: "General Hospital",
    },
    {
      name: "De La Salle Medical and Health Sciences Institute",
      address: "Gov. D. Mangubat Ave, Dasmariñas, Cavite (Near Bacoor)",
      phone: "(046) 481-8000",
      type: "Medical Center & Teaching Hospital",
    },
    {
      name: "Divine Grace Hospital",
      address: "Aguinaldo Highway, Dasmariñas, Cavite (Near Bacoor)",
      phone: "(046) 402-0888",
      type: "General Hospital",
    },
    {
      name: "Bacoor Doctors Hospital",
      address: "Molino Road, Bacoor, Cavite",
      phone: "(046) 472-1234",
      type: "General Hospital",
    },
  ]

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent p-0">
            <TabsTrigger
              value="chat"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Stethoscope className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger
              value="hospitals"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Hospitals
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
          <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 gap-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Configuration
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
                    {showSettings ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </div>
              </CardHeader>
              {showSettings && (
                <CardContent>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      AI Service API Key
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          placeholder="Enter your OpenRouter API key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get your free API key at{" "}
                      <a
                        href="https://openrouter.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        openrouter.ai
                      </a>
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="flex-1 flex flex-col border-primary/20 min-h-0">
              <CardHeader className="pb-3 border-b shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Health Consultation
                  </CardTitle>
                  <div className="flex gap-2">
                    <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={chatHistory.length === 0}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Save Chat History</DialogTitle>
                          <DialogDescription>
                            Save this consultation with details for future reference
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="symptom">Symptom / Chief Complaint *</Label>
                            <Input
                              id="symptom"
                              value={saveForm.symptom}
                              onChange={(e) => setSaveForm({ ...saveForm, symptom: e.target.value })}
                              placeholder="e.g., Headache, Fever, Cough"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="start_date">Start Date *</Label>
                              <Input
                                id="start_date"
                                type="date"
                                value={saveForm.start_date}
                                onChange={(e) => setSaveForm({ ...saveForm, start_date: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="end_date">End Date</Label>
                              <Input
                                id="end_date"
                                type="date"
                                value={saveForm.end_date}
                                onChange={(e) => setSaveForm({ ...saveForm, end_date: e.target.value })}
                                disabled={saveForm.is_ongoing}
                              />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="is_ongoing"
                              checked={saveForm.is_ongoing}
                              onChange={(e) => setSaveForm({ ...saveForm, is_ongoing: e.target.checked })}
                              className="rounded"
                            />
                            <Label htmlFor="is_ongoing">Ongoing symptoms</Label>
                          </div>
                          <div>
                            <Label htmlFor="duration">Duration</Label>
                            <Input
                              id="duration"
                              value={saveForm.duration}
                              onChange={(e) => setSaveForm({ ...saveForm, duration: e.target.value })}
                              placeholder="e.g., 3 days, 2 weeks"
                            />
                          </div>
                          <div>
                            <Label htmlFor="patterns">Patterns</Label>
                            <Textarea
                              id="patterns"
                              value={saveForm.patterns}
                              onChange={(e) => setSaveForm({ ...saveForm, patterns: e.target.value })}
                              placeholder="e.g., Worse in the morning, after meals"
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label htmlFor="notes">Additional Notes</Label>
                            <Textarea
                              id="notes"
                              value={saveForm.notes}
                              onChange={(e) => setSaveForm({ ...saveForm, notes: e.target.value })}
                              placeholder="Any other information you want to remember"
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleSaveChat}>
                              <Save className="h-4 w-4 mr-2" />
                              Save History
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={clearChat} disabled={chatHistory.length === 0}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                <div ref={chatMessagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatHistory.length === 0 && !isStreaming && (
                    <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                      <div>
                        <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">Welcome to AI Doctor</p>
                        <p className="text-sm">Describe your symptoms or ask a health-related question to begin</p>
                      </div>
                    </div>
                  )}

                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">{formatTime(msg.timestamp)}</p>
                      </div>
                    </div>
                  ))}

                  {isStreaming && streamingContent && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                        <p className="whitespace-pre-wrap">{streamingContent}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <p className="text-xs opacity-70">Generating...</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="p-4 border-t shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your symptoms or ask a question..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !apiKey}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Alert className="border-destructive/50 bg-destructive/10 shrink-0">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                <strong>Emergency Notice:</strong> If you're experiencing a medical emergency, call emergency services
                immediately (911). This AI assistant is not for emergency situations.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-auto m-0 p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold mb-4">Chat History</h2>
            {savedHistories.length === 0 ? (
              <Card className="p-8 text-center">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No saved consultations yet</p>
              </Card>
            ) : (
              savedHistories.map((history) => (
                <Card key={history.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{history.symptom}</h3>
                        <p className="text-sm text-muted-foreground">
                          Started: {new Date(history.start_date).toLocaleDateString()}
                        </p>
                        {!history.is_ongoing && history.end_date && (
                          <p className="text-sm text-muted-foreground">
                            Ended: {new Date(history.end_date).toLocaleDateString()}
                          </p>
                        )}
                        {history.is_ongoing && <Badge variant="secondary">Ongoing</Badge>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadHistoryChat(history)}>
                          Load Chat
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Chat History?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this consultation history. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteHistoryChat(history.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {history.duration && (
                      <p className="text-sm">
                        <strong>Duration:</strong> {history.duration}
                      </p>
                    )}
                    {history.patterns && (
                      <p className="text-sm">
                        <strong>Patterns:</strong> {history.patterns}
                      </p>
                    )}
                    {history.notes && (
                      <p className="text-sm">
                        <strong>Notes:</strong> {history.notes}
                      </p>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="hospitals" className="flex-1 overflow-auto m-0 p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Nearest Hospitals</h2>
              <p className="text-muted-foreground mb-4">Healthcare facilities in Bacoor, Cavite and nearby areas</p>
            </div>
            {bacoorHospitals.map((hospital, index) => (
              <Card key={index} className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{hospital.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {hospital.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span>{hospital.address}</span>
                    </p>
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <a href={`tel:${hospital.phone}`} className="text-primary hover:underline">
                        {hospital.phone}
                      </a>
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
