import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { 
  Brain, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  BookOpen, 
  Building,
  Calendar,
  Lightbulb,
  FileText,
  Database,
  Trash2,
  PlusCircle,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  CheckCircle2
} from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === "admin";

  // Merge sample data modal state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeConfirmed, setMergeConfirmed] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Kill switch modal state
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [killInput, setKillInput] = useState("");
  const [isKilling, setIsKilling] = useState(false);

  const handleMergeSubmit = async () => {
    if (!mergeConfirmed) return;
    setIsMerging(true);
    try {
      const res = await adminService.mergeSampleData();
      toast({
        title: "Sample Data Merged",
        description: res.message,
      });
      setMergeDialogOpen(false);
      setMergeConfirmed(false);
    } catch (err: any) {
      toast({
        title: "Merge Failed",
        description: err.message || "Failed to merge sample data",
        variant: "destructive",
      });
    } finally {
      setIsMerging(false);
    }
  };

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
    <div className="animate-fade-in space-y-6">
      <PageHeader 
        title="Settings & Administration" 
        description="Manage system database, view timetable algorithms, guides and best practices"
      />
      
      <Tabs defaultValue={isAdmin ? "admin-data" : "algorithm"} className="w-full">
        <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-5" : "grid-cols-4")}>
          {isAdmin && (
            <TabsTrigger value="admin-data" className="font-semibold text-primary">
              Data Management
            </TabsTrigger>
          )}
          <TabsTrigger value="algorithm">Algorithm</TabsTrigger>
          <TabsTrigger value="guides">User Guides</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="best-practices">Best Practices</TabsTrigger>
        </TabsList>

        {/* Algorithm Tab */}
        <TabsContent value="algorithm" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Timetable Generation Algorithm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Algorithm Overview</h3>
                <p className="text-muted-foreground mb-4">
                  Our timetable generation system uses an intelligent constraint-based algorithm that considers multiple factors to create optimal schedules while avoiding conflicts.
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Core Constraints & Rules</h3>
                <div className="grid gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Subject Frequency Rule</p>
                      <p className="text-sm text-muted-foreground">Each subject must be taught exactly 3 times per week for every year/class</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">No Back-to-Back Prevention</p>
                      <p className="text-sm text-muted-foreground">Prevents consecutive lectures of the same subject by the same teacher for the same class</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Teacher Conflict Avoidance</p>
                      <p className="text-sm text-muted-foreground">Ensures no teacher is assigned to multiple classes simultaneously</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Classroom Conflict Resolution</p>
                      <p className="text-sm text-muted-foreground">Prevents double-booking of classrooms and matches lab subjects to lab rooms</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Algorithm Steps</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">1</Badge>
                    <span className="text-sm">Initialize timetable grid with time slots and working days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">2</Badge>
                    <span className="text-sm">Load subject-class and teacher-subject assignments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">3</Badge>
                    <span className="text-sm">Distribute subjects ensuring 3 periods per week per class</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">4</Badge>
                    <span className="text-sm">Assign teachers based on their subject specializations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">5</Badge>
                    <span className="text-sm">Allocate appropriate classrooms (labs for practicals)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">6</Badge>
                    <span className="text-sm">Validate all constraints and resolve conflicts</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Guides Tab */}
        <TabsContent value="guides" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Step 1: Setup Basic Data</h4>
                  <p className="text-sm text-muted-foreground">Add years, classes, teachers, subjects, and classrooms to the system.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Step 2: Configure Timings</h4>
                  <p className="text-sm text-muted-foreground">Set up time slots, working days, and break periods.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Step 3: Create Assignments</h4>
                  <p className="text-sm text-muted-foreground">Link subjects to classes and teachers to subjects.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Step 4: Generate Timetable</h4>
                  <p className="text-sm text-muted-foreground">Use the automatic generation feature to create optimal schedules.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Managing Subjects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Subject Types</h4>
                  <p className="text-sm text-muted-foreground">Mark subjects as lab/practical to ensure proper classroom allocation.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Periods Per Week</h4>
                  <p className="text-sm text-muted-foreground">Currently fixed at 3 periods per subject per class for optimal learning.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Subject Codes</h4>
                  <p className="text-sm text-muted-foreground">Use unique codes for easy identification in timetables.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Classroom Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Lab Classification</h4>
                  <p className="text-sm text-muted-foreground">Mark rooms as labs to match them with practical subjects.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Capacity Planning</h4>
                  <p className="text-sm text-muted-foreground">Set appropriate capacity for each classroom based on class sizes.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Equipment Tracking</h4>
                  <p className="text-sm text-muted-foreground">Document available equipment for better resource allocation.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timetable Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">View Modes</h4>
                  <p className="text-sm text-muted-foreground">Switch between Master, Teacher, Class, and Classroom views.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Manual Editing</h4>
                  <p className="text-sm text-muted-foreground">Make manual adjustments while respecting system constraints.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Sharing & Export</h4>
                  <p className="text-sm text-muted-foreground">Share via WhatsApp, email, or download in multiple formats.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Core Features</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Automated timetable generation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Conflict detection and resolution
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Multiple view modes (Master, Teacher, Class)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Lab/practical subject handling
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Real-time timetable editing
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Export & Sharing</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        PDF export with formatting
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Excel/CSV data export
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        WhatsApp sharing integration
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Email distribution system
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        HTML format for web viewing
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Best Practices Tab */}
        <TabsContent value="best-practices" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Data Preparation Tips</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-0.5">Tip</Badge>
                      <div>
                        <p className="font-medium">Complete Data Entry First</p>
                        <p className="text-sm text-muted-foreground">Ensure all teachers, subjects, classes, and classrooms are added before generating timetables.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-0.5">Tip</Badge>
                      <div>
                        <p className="font-medium">Verify Subject-Teacher Assignments</p>
                        <p className="text-sm text-muted-foreground">Make sure every subject has at least one qualified teacher assigned.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-0.5">Tip</Badge>
                      <div>
                        <p className="font-medium">Plan Lab Requirements</p>
                        <p className="text-sm text-muted-foreground">Mark subjects requiring labs and ensure sufficient lab classrooms are available.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Optimization Strategies</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">Strategy</Badge>
                      <div>
                        <p className="font-medium">Balance Teacher Workload</p>
                        <p className="text-sm text-muted-foreground">Distribute subjects evenly among teachers to avoid overloading.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">Strategy</Badge>
                      <div>
                        <p className="font-medium">Optimize Break Times</p>
                        <p className="text-sm text-muted-foreground">Schedule breaks strategically to maintain student and teacher efficiency.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">Strategy</Badge>
                      <div>
                        <p className="font-medium">Regular Review</p>
                        <p className="text-sm text-muted-foreground">Periodically review and adjust timetables based on feedback and performance.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Common Issues & Solutions</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Generation Failures</p>
                        <p className="text-sm text-muted-foreground">Usually caused by insufficient teachers or classroom conflicts. Verify assignments and availability.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Uneven Distribution</p>
                        <p className="text-sm text-muted-foreground">Ensure adequate number of teachers per subject and balanced class sizes.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Admin Data Management Tab */}
        {isAdmin && (
          <TabsContent value="admin-data" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Card 1: Add More Default Data */}
              <Card className="border-primary/20 shadow-sm flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between mb-1">
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                      Continuous Generation • Safe Merge
                    </Badge>
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <PlusCircle className="h-5 w-5 text-primary" />
                    Generate & Merge More Data
                  </CardTitle>
                  <CardDescription>
                    Dynamically generates and merges brand-new unique academic records (departments, classes, faculty, subjects, and rooms) with each press—seamlessly expanding your institution without overwriting existing data.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Each click intelligently provisions the next unrepresented academic department or specialized track:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span><strong>Unique Departments:</strong> IT, AI & Data Science, Cyber Security, Robotics, ENTC & beyond</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span><strong>4 New Class Divisions:</strong> (SE-A/B, TE-A/B) generated per department</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span><strong>3–4 New Faculty:</strong> Specialized professors mapped to new course curricula</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span><strong>4–6 Subjects & Labs:</strong> Theory lectures and 2-hour laboratory sessions</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span><strong>2–3 New Classrooms:</strong> Smart lecture halls & dedicated departmental lab facilities</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span><strong>User Accounts:</strong> Fresh teacher and student representative logins automatically generated</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => {
                        setMergeConfirmed(false);
                        setMergeDialogOpen(true);
                      }}
                      className="w-full gap-2"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Generate & Merge More Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Kill Switch */}
              <Card className="border-destructive/30 shadow-sm flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
                      Emergency Reset • Destructive
                    </Badge>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <CardTitle className="flex items-center gap-2 text-xl text-destructive">
                    <Trash2 className="h-5 w-5 text-destructive" />
                    Kill Switch (Delete All Data)
                  </CardTitle>
                  <CardDescription>
                    Permanently delete all timetables, lessons, change requests, assignments, classes, teachers, subjects, timings, and classrooms.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4" />
                        Irreversible Destruction
                      </p>
                      <p className="text-muted-foreground">
                        Wipes all generated schedules and institutional tables. Your System Administrator login is safely preserved so you can configure or reseed from scratch.
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      What will be wiped:
                    </p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="text-destructive font-mono text-xs">✕</span>
                        All generated Master and Class Timetables & Drafts
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-destructive font-mono text-xs">✕</span>
                        All Lessons, Schedule Overrides & Teacher Change Requests
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-destructive font-mono text-xs">✕</span>
                        All Classes, Teachers, Subjects, Classrooms & Timing Slots
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-destructive font-mono text-xs">✕</span>
                        All Teacher and Student login credentials
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setKillInput("");
                        setKillDialogOpen(true);
                      }}
                      className="w-full gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Kill Switch (Delete All Data)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Double Confirmation Modal: Merge Sample Data */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate & Merge More Unique Data (Double Confirmation)
            </DialogTitle>
            <DialogDescription>
              Step 1 of 2: Every press provisions a new unique academic department or specialized track (classes, faculty, courses, rooms, logins) and seamlessly merges it into your timetable database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unique Batch Generation:</span>
                <span className="font-semibold text-primary">Next unrepresented department / track</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Classes per click:</span>
                <span className="font-semibold">4 Class Divisions (SE & TE)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faculty members:</span>
                <span className="font-semibold">3–4 Specialized Professors</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subjects & Labs:</span>
                <span className="font-semibold">4–6 Theory & Lab Courses</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Existing data impact:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Zero data loss / Preserves existing data</span>
              </div>
            </div>

            <div className="flex items-start space-x-2 pt-2 border-t">
              <Checkbox
                id="confirm-merge"
                checked={mergeConfirmed}
                onCheckedChange={(checked) => setMergeConfirmed(!!checked)}
              />
              <label
                htmlFor="confirm-merge"
                className="text-xs font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Step 2: I confirm that I want to merge these additional sample records into the database.
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setMergeDialogOpen(false)}
              disabled={isMerging}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMergeSubmit}
              disabled={!mergeConfirmed || isMerging}
              className="gap-2"
            >
              {isMerging ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm & Merge Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Double Confirmation Modal: Kill Switch */}
      <Dialog open={killDialogOpen} onOpenChange={setKillDialogOpen}>
        <DialogContent className="max-w-md border-destructive/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Kill Switch: Wipe All Data
            </DialogTitle>
            <DialogDescription>
              Step 1 of 2: This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
              <p className="font-semibold">⚠️ All institutional data will be wiped immediately:</p>
              <p>All timetables, lessons, change requests, assignments, classes, teachers, subjects, classrooms, and student logins will be permanently deleted.</p>
              <p className="font-medium pt-1 text-foreground">Your System Administrator account will remain active.</p>
            </div>

            <div className="space-y-2 pt-1 border-t">
              <label htmlFor="kill-input" className="text-xs font-medium text-foreground block">
                Step 2: Type <span className="font-mono font-bold text-destructive">DELETE ALL DATA</span> below to unlock:
              </label>
              <Input
                id="kill-input"
                value={killInput}
                onChange={(e) => setKillInput(e.target.value)}
                placeholder="DELETE ALL DATA"
                className="font-mono text-center tracking-wider"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setKillDialogOpen(false)}
              disabled={isKilling}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleKillSubmit}
              disabled={killInput !== "DELETE ALL DATA" || isKilling}
              className="gap-2"
            >
              {isKilling ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Wiping Data...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Permanently Wipe All Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;