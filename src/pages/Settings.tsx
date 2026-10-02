import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { adminService } from "@/services/adminService";
import { themeService, THEMES, ThemeId } from "@/services/themeService";
import { cn } from "@/lib/utils";
import {
  Palette,
  Download,
  ShieldAlert,
  Trash2,
  Check,
  Sparkles,
  Database,
  Building,
  Users,
  BookOpen,
  Calendar,
  Layers,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
} from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === "admin";

  // Theme State
  const [activeTheme, setActiveTheme] = useState<ThemeId>(themeService.getTheme());

  useEffect(() => {
    const unsubscribe = themeService.subscribe((theme) => {
      setActiveTheme(theme);
    });
    return () => unsubscribe();
  }, []);

  const handleThemeChange = (themeId: ThemeId) => {
    themeService.setTheme(themeId);
    setActiveTheme(themeId);
    const themeDef = themeService.getThemeDefinition(themeId);
    toast({
      title: "Theme Updated",
      description: `Active theme switched to ${themeDef.name}.`,
    });
  };

  // Master Data Export State
  const [isExporting, setIsExporting] = useState(false);

  const handleExportMasterData = async () => {
    setIsExporting(true);
    try {
      const token = authService.getToken();
      const res = await fetch("/api/admin/export-master-data", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to export institutional master data");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `acadsync_master_backup_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Master Backup Downloaded",
        description: "Your full institutional dataset has been exported as an importable Master CSV.",
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Could not export master data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Kill switch modal state
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [killInput, setKillInput] = useState("");
  const [isKilling, setIsKilling] = useState(false);

  const handleKillSubmit = async () => {
    if (killInput !== "DELETE ALL DATA") return;
    setIsKilling(true);
    try {
      const res = await adminService.killSwitch("DELETE ALL DATA");
      toast({
        title: "All Data Deleted",
        description: res.message,
        variant: "destructive",
      });
      setKillDialogOpen(false);
      setKillInput("");
    } catch (err: any) {
      toast({
        title: "Kill Switch Failed",
        description: err.message || "Failed to execute kill switch",
        variant: "destructive",
      });
    } finally {
      setIsKilling(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-10 pb-16 max-w-6xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Settings & System Configuration"
        description="Customize appearance with 8 artisan color themes, export full data backups, view algorithm rules, and manage database controls."
      />

      {/* SECTION 1: THEME & VISUAL STYLE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Theme & Visual Palette</h2>
              <p className="text-sm text-muted-foreground">
                Choose from 8 curated artisan color schemes designed for high readability and focus.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs">
            Current: {themeService.getThemeDefinition(activeTheme).name}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {THEMES.map((t) => {
            const isSelected = activeTheme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={cn(
                  "group relative cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md flex flex-col justify-between",
                  isSelected
                    ? "border-primary ring-2 ring-primary/30 shadow-md bg-card"
                    : "border-border/80 hover:border-primary/50 bg-card/60"
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                    <Check className="h-3 w-3" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-semibold text-sm leading-tight text-foreground">{t.name}</h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 mb-2 font-medium",
                      t.type === "dark"
                        ? "bg-stone-900 text-stone-200 border-stone-700"
                        : "bg-stone-100 text-stone-700 border-stone-300"
                    )}
                  >
                    {t.subtitle}
                  </Badge>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                    {t.description}
                  </p>
                </div>

                {/* Color Swatch Preview Bar */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1.5 h-6 rounded-md p-1 bg-muted/40 border border-border/40">
                    <div
                      className="flex-1 h-full rounded-xs shadow-xs"
                      style={{ backgroundColor: t.previewColors.paper }}
                      title="Page Background"
                    />
                    <div
                      className="flex-1 h-full rounded-xs shadow-xs"
                      style={{ backgroundColor: t.previewColors.card }}
                      title="Card Surface"
                    />
                    <div
                      className="flex-1 h-full rounded-xs shadow-xs"
                      style={{ backgroundColor: t.previewColors.primary }}
                      title="Primary Action"
                    />
                    <div
                      className="flex-1 h-full rounded-xs shadow-xs"
                      style={{ backgroundColor: t.previewColors.secondary }}
                      title="Secondary"
                    />
                    <div
                      className="flex-1 h-full rounded-xs shadow-xs"
                      style={{ backgroundColor: t.previewColors.accent }}
                      title="Accent"
                    />
                    <div
                      className="flex-1 h-full rounded-xs shadow-xs"
                      style={{ backgroundColor: t.previewColors.ink }}
                      title="Primary Ink"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* SECTION 2: MASTER DATA BACKUP & EXPORT */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Master Institutional Data Backup</h2>
            <p className="text-sm text-muted-foreground">
              Download your complete institutional dataset as a standardized CSV that can be imported back at any time.
            </p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Full System CSV Backup (Re-importable)
            </CardTitle>
            <CardDescription>
              Exports all Classes, Batches, Classrooms, Labs, Faculty members, Subjects (with Credits & Durations), and Relational Mappings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/40 border text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Info className="h-4 w-4 text-primary shrink-0" />
                Zero-Loss Data Resilience Guarantee
              </div>
              <p>
                If you ever wipe all data using the Emergency Kill Switch, you can simply upload this downloaded CSV file on the{" "}
                <strong className="text-foreground font-semibold">Data Upload</strong> page. The system will recreate all classes, faculty, rooms, subjects, and batch assignments exactly as they were.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                onClick={handleExportMasterData}
                disabled={isExporting}
                className="gap-2 shadow-sm font-semibold"
              >
                <Download className="h-4 w-4" />
                {isExporting ? "Generating Master Backup..." : "Export Full Institutional Data (CSV)"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* SECTION 3: ACADEMIC TIMETABLE ENGINE & POLICIES */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Scheduling Rules & Algorithm Reference</h2>
            <p className="text-sm text-muted-foreground">
              Rules and constraint models enforced by the ACADSYNC Genetic Algorithm generator.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                Theory & Credits Rule
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              1 Theory Credit = 1 one-hour lecture per week. The system distributes lectures across separate days to prevent student burnout. Back-to-back repeats of the same theory lecture are strictly prevented.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Layers className="h-4 w-4 text-primary" />
                Institutional Batch Labs
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              1 Practical Credit = 1 two-hour session per week per batch. Batches A, B, and C run in parallel across specialized laboratory rooms (e.g. Programming Lab, Analog Circuit Lab) without crossing lunch/tea breaks.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Standard Daily Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              Active schedule runs from <strong>10:00 to 17:00</strong> (6 teaching periods) with a 45-min Lunch Break (12:00–12:45) and a 15-min Tea Break (14:45–15:00) across Monday through Saturday.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SECTION 4: DANGER ZONE / KILL SWITCH */}
      {isAdmin && (
        <>
          <Separator />
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-destructive">Danger Zone</h2>
                <p className="text-sm text-muted-foreground">
                  Irreversible administrative system actions and emergency database cleanup.
                </p>
              </div>
            </div>

            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Emergency Kill Switch (Delete All Institutional Data)
                </CardTitle>
                <CardDescription>
                  Permanently deletes all timetables, scheduled lessons, classes, batches, subjects, classrooms, faculty, and teacher change requests.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-background/80 border border-destructive/20 text-xs text-muted-foreground">
                  <strong className="text-destructive font-semibold">Important Safety Note:</strong> Your current administrator account (<code className="font-mono text-foreground font-bold">{currentUser?.email}</code>) will be safely preserved so you will not be logged out.
                </div>

                <div>
                  <Button
                    variant="destructive"
                    onClick={() => setKillDialogOpen(true)}
                    className="gap-2 font-semibold shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    Trigger Emergency Kill Switch
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* Double-Confirmation Kill Switch Modal */}
      <Dialog open={killDialogOpen} onOpenChange={setKillDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <ShieldAlert className="h-6 w-6" />
              <DialogTitle className="text-destructive font-bold text-lg">
                Confirm Emergency Database Wipe
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This action will permanently delete all timetables, classes, teachers, subjects, classrooms, and student records from the SQLite database.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1.5 font-medium">
            <p>⚠️ All academic records will be permanently removed.</p>
            <p>💡 Tip: You can download a Master CSV Backup above before deleting.</p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-foreground">
              Type <span className="font-mono text-destructive font-bold select-all">DELETE ALL DATA</span> to confirm:
            </label>
            <Input
              value={killInput}
              onChange={(e) => setKillInput(e.target.value)}
              placeholder="DELETE ALL DATA"
              className="font-mono text-sm border-destructive/40 focus-visible:ring-destructive"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setKillDialogOpen(false);
                setKillInput("");
              }}
              disabled={isKilling}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={killInput !== "DELETE ALL DATA" || isKilling}
              onClick={handleKillSubmit}
              className="font-semibold"
            >
              {isKilling ? "Wiping Database..." : "Confirm & Delete Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;