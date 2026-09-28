import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authService, AuthUser } from "@/services/authService";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Shield, User, GraduationCap, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const DEMO_ACCOUNTS = [
  {
    role: "admin",
    label: "Admin Portal",
    badge: "Full Control",
    name: "System Administrator",
    email: "admin@acadsync.edu",
    password: "admin123",
    icon: Shield,
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  {
    role: "teacher",
    label: "Faculty Portal",
    badge: "Teacher View & Requests",
    name: "Dr. A. R. Sharma",
    email: "ar.sharma@institution.edu",
    password: "teacher123",
    icon: User,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  {
    role: "student",
    label: "Student Portal",
    badge: "Class Timetable",
    name: "FE-CS-A Student Rep",
    email: "student.fecsa@acadsync.edu",
    password: "student123",
    icon: GraduationCap,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname;

  const redirectUser = (user: AuthUser) => {
    if (from && from !== "/login") {
      navigate(from, { replace: true });
      return;
    }
    if (user.role === "admin") {
      navigate("/", { replace: true });
    } else {
      navigate("/timetables", { replace: true });
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await authService.login(email, password);
      redirectUser(res.user);
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setIsLoading(true);
    setError(null);

    try {
      const res = await authService.login(acc.email, acc.password);
      redirectUser(res.user);
    } catch (err: any) {
      setError(err?.message || "Quick login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-muted/30 px-4 py-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-2 shadow-sm">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">ACADSYNC</h1>
          <p className="text-sm text-muted-foreground">
            Academic Timetable Management System &bull; v2.0.0
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your institutional credentials to access your schedule
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Institutional Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@institution.edu"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Self-registration is disabled. Contact your administrator if you need account access.
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Quick-Login Presets */}
        <div className="space-y-3 pt-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-muted/30 px-2 text-muted-foreground font-medium">
                Demo Quick Logins (1-Click)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  disabled={isLoading}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/40 transition-all text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-md ${acc.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {acc.label}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                          {acc.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{acc.email}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
