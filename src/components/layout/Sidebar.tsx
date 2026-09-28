import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
} from "lucide-react";

type NavItem = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/",
  },
  {
    title: "Classes",
    icon: GraduationCap,
    href: "/classes",
  },
  {
    title: "Teachers",
    icon: Users,
    href: "/teachers",
  },
  {
    title: "Subjects",
    icon: BookOpen,
    href: "/subjects",
  },
  {
    title: "Timings",
    icon: Clock,
    href: "/timings",
  },
  {
    title: "Classrooms",
    icon: Building,
    href: "/classrooms",
  },
  {
    title: "Timetables",
    icon: Calendar,
    href: "/timetables",
  },
  {
    title: "Share",
    icon: Share,
    href: "/share",
  },
  {
    title: "Data Upload",
    icon: Upload,
    href: "/upload",
  },
];

const Sidebar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <>
      {/* Mobile Navigation Bar */}
      <div className="flex items-center justify-between p-4 border-b md:hidden bg-card border-border">
        <div className="flex items-center">
          <span className="font-bold text-xl text-primary">ACADSYNC</span>
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-card transform transition-transform duration-300 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center">
              <span className="font-bold text-xl text-primary">ACADSYNC</span>
            </div>
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-2">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-md group",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
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
          <div className="border-t border-border p-4">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-border bg-card">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <span className="font-bold text-xl text-primary">ACADSYNC</span>
            </div>
            <nav className="mt-5 flex-1 px-3 space-y-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-md",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
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
          <div className="flex-shrink-0 flex border-t border-border p-4 flex-col space-y-2">
            <div className="flex items-center justify-between mb-2">
              <ThemeToggle />
            </div>
            <Link
              to="/settings"
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-md w-full",
                location.pathname === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Settings className={cn(
                "mr-3 h-5 w-5",
                location.pathname === "/settings"
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              )} />
              Settings
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;