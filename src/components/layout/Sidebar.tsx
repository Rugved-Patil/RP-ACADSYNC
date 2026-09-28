import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { authService, AuthUser, UserRole } from "@/services/authService";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  GraduationCap,
  Home,
  Settings,
  Users,
  BookOpen,
  Building,
  Clock,
  Share,
  Upload,
  LogOut,
  GitPullRequest,
  Shield,
  User as UserIcon,
} from "lucide-react";

type NavItem = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: UserRole[];
};

const allNavItems: NavItem[] = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/",
    roles: ["admin"],
  },
  {
    title: "Timetables",
    icon: Calendar,
    href: "/timetables",
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Change Requests",
    icon: GitPullRequest,
    href: "/requests",
    roles: ["admin", "teacher"],
  },
  {
    title: "Classes",
    icon: GraduationCap,
    href: "/classes",
    roles: ["admin"],
  },
  {
    title: "Teachers",
    icon: Users,
    href: "/teachers",
    roles: ["admin"],
  },
  {
    title: "Subjects",
    icon: BookOpen,
    href: "/subjects",
    roles: ["admin"],
  },
  {
    title: "Timings",
    icon: Clock,
    href: "/timings",
    roles: ["admin"],
  },
  {
    title: "Classrooms",
    icon: Building,
    href: "/classrooms",
    roles: ["admin"],
  },
  {
    title: "Share",
    icon: Share,
    href: "/share",
    roles: ["admin"],
  },
  {
    title: "Data Upload",
    icon: Upload,
    href: "/upload",
    roles: ["admin"],
  },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(authService.getUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(authService.getUser());
    };
    window.addEventListener("auth-changed", handleAuthChange);
    return () => window.removeEventListener("auth-changed", handleAuthChange);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  const userRole: UserRole = currentUser?.role || "student";
  const visibleNavItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 text-[10px] px-1.5 py-0">
            Admin
          </Badge>
        );
      case "teacher":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 text-[10px] px-1.5 py-0">
            Faculty
          </Badge>
        );
      case "student":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] px-1.5 py-0">
            Student
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderUserSection = () => (
    <div className="border-t border-border p-3 flex flex-col space-y-2 bg-muted/20">
      {currentUser && (
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold truncate block max-w-[100px]">
                  {currentUser.name}
                </span>
                {renderRoleBadge(currentUser.role)}
              </div>
              <span className="text-[11px] text-muted-foreground truncate block max-w-[140px]">
                {currentUser.email}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between pt-1">
        <Link
          to="/settings"
          className={cn(
            "flex items-center px-2 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            location.pathname === "/settings" && "bg-accent text-accent-foreground font-semibold"
          )}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Navigation Bar */}
      <div className="flex items-center justify-between p-4 border-b md:hidden bg-card border-border">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-xl text-primary">ACADSYNC</span>
          {currentUser && renderRoleBadge(currentUser.role)}
        </div>
        <button
          className="p-2 rounded-md hover:bg-accent"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-card transform transition-transform duration-300 ease-in-out md:hidden flex flex-col",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-bold text-xl text-primary">ACADSYNC</span>
          <button
            className="p-2 rounded-md hover:bg-accent"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-md group",
                  location.pathname === item.href
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5",
                    location.pathname === item.href
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                />
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
        {renderUserSection()}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-border bg-card">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center justify-between px-4 mb-6">
              <span className="font-bold text-xl tracking-tight text-primary">ACADSYNC</span>
              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                v2.0.0
              </span>
            </div>
            <nav className="mt-2 flex-1 px-3 space-y-1">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "group flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-4 w-4 transition-colors",
                      location.pathname === item.href
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-accent-foreground"
                    )}
                  />
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
          {renderUserSection()}
        </div>
      </div>
    </>
  );
};

export default Sidebar;