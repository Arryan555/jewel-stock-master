import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth";
import { ShieldCheck, Store, Eye, EyeOff, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

type LoginMode = "choose" | "admin" | "jeweller";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<LoginMode>("choose");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setError("Please enter your login ID and password");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      const result = login(loginId, password);
      if (result.ok) {
        setLocation("/");
      } else {
        setError(result.error ?? "Login failed");
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      {/* Header bar */}
      <header className="border-b border-amber-200/60 bg-white/80 backdrop-blur px-6 py-3 flex items-center gap-3">
        <Gem className="h-6 w-6 text-primary" />
        <span className="font-serif text-xl font-bold text-primary tracking-wide">Jewel Suite</span>
        <span className="text-muted-foreground text-sm ml-2">— Premium Jewellery Management</span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl space-y-8">
          {/* Hero */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                <Gem className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-serif font-bold text-foreground">Jewel Suite</h1>
            <p className="text-muted-foreground text-lg">
              Complete jewellery management for Indian jewellers
            </p>
          </div>

          {/* Login choice */}
          {mode === "choose" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button
                onClick={() => setMode("jeweller")}
                className="group text-left p-6 rounded-2xl border-2 border-border hover:border-primary/50 bg-white shadow-sm hover:shadow-md transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
                  <Store className="h-6 w-6 text-amber-700" />
                </div>
                <h3 className="font-serif text-lg font-bold mb-1">Jeweller Login</h3>
                <p className="text-sm text-muted-foreground">
                  Sign in to your shop's account with your Login ID and password provided by your admin
                </p>
                <div className="mt-4 text-primary text-sm font-medium group-hover:underline">
                  Sign In →
                </div>
              </button>

              <button
                onClick={() => setMode("admin")}
                className="group text-left p-6 rounded-2xl border-2 border-border hover:border-primary/50 bg-white shadow-sm hover:shadow-md transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-bold mb-1">Admin Login</h3>
                <p className="text-sm text-muted-foreground">
                  System administrator access to manage subscribers, branches, AMC plans and system settings
                </p>
                <div className="mt-4 text-primary text-sm font-medium group-hover:underline">
                  Admin Panel →
                </div>
              </button>
            </div>
          )}

          {/* Login form */}
          {mode !== "choose" && (
            <div className="max-w-sm mx-auto">
              <Card className="shadow-md border-border/60">
                <CardContent className="pt-6 pb-6">
                  {/* Mode header */}
                  <div className="flex items-center gap-3 mb-5">
                    {mode === "admin" ? (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                        <Store className="h-5 w-5 text-amber-700" />
                      </div>
                    )}
                    <div>
                      <h2 className="font-serif font-bold text-lg">
                        {mode === "admin" ? "Admin Login" : "Jeweller Login"}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {mode === "admin" ? "System administrator" : "Shop account access"}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label className="text-sm">Login ID</Label>
                      <Input
                        value={loginId}
                        onChange={e => { setLoginId(e.target.value); setError(""); }}
                        placeholder={mode === "admin" ? "admin" : "your-shop-id"}
                        autoFocus
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Password</Label>
                      <div className="relative mt-1">
                        <Input
                          type={showPw ? "text" : "password"}
                          value={password}
                          onChange={e => { setPassword(e.target.value); setError(""); }}
                          placeholder="••••••••"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPw(v => !v)}
                        >
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {error}
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in…" : "Sign In"}
                    </Button>
                  </form>

                  <button
                    onClick={() => { setMode("choose"); setLoginId(""); setPassword(""); setError(""); }}
                    className="mt-4 text-xs text-muted-foreground hover:text-foreground w-full text-center"
                  >
                    ← Back to options
                  </button>

                  {mode === "admin" && (
                    <p className="text-[11px] text-muted-foreground text-center mt-3">
                      Default: admin / admin@1234
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Jewel Suite · Made for Indian Jewellers · Secure &amp; Private
          </p>
        </div>
      </div>
    </div>
  );
}
