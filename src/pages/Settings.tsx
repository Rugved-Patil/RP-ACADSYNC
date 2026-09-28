import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  FileText
} from "lucide-react";

const Settings = () => {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader 
        title="Settings & Information" 
        description="Learn about timetable generation algorithm, system guides and best practices"
      />
      
      <Tabs defaultValue="algorithm" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
      </Tabs>
    </div>
  );
};

export default Settings;