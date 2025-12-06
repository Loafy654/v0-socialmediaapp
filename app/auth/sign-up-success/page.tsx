import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Check your email!</CardTitle>
          <CardDescription>Confirm your account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We've sent a confirmation email. Please click the link in your email to confirm your account.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
