
import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimetableService } from "@/services/timetableService";
import { Calendar, GraduationCap, Users, BookOpen, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [stats, setStats] = React.useState({
    classes: 0,
    teachers: 0,
    subjects: 0,
    timeSlots: 0,
    lessons: 0,
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [classes, teachers, subjects, timeSlots, timetable] = await Promise.all([
          TimetableService.getClasses(),
          TimetableService.getTeachers(),
          TimetableService.getSubjects(),
          TimetableService.getTimeSlots(),
          TimetableService.getTimetable(),
        ]);
        
        setStats({
          classes: classes.length,
          teachers: teachers.length,
          subjects: subjects.length,
          timeSlots: timeSlots.length,
          lessons: timetable?.lessons?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Dashboard" 
        description="Welcome to ACADSYNC Timetable Generator" 
        actions={
          <Button asChild>
            <Link to="/timetables">
              <Calendar className="mr-2 h-4 w-4" />
              Generate Timetable
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.classes}</span>
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
          </CardContent>
          <Link 
            to="/classes" 
            className="text-xs text-brand hover:text-brand-muted px-8 pb-4 inline-block"
          >
            Manage classes
          </Link>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Teachers
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.teachers}</span>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardContent>
          <Link 
            to="/teachers" 
            className="text-xs text-brand hover:text-brand-muted px-8 pb-4 inline-block"
          >
            Manage teachers
          </Link>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Subjects
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.subjects}</span>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </CardContent>
          <Link 
            to="/subjects" 
            className="text-xs text-brand hover:text-brand-muted px-8 pb-4 inline-block"
          >
            Manage subjects
          </Link>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time Slots
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.timeSlots}</span>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardContent>
          <Link 
            to="/timings" 
            className="text-xs text-brand hover:text-brand-muted px-8 pb-4 inline-block"
          >
            Manage time slots
          </Link>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button variant="outline" asChild className="h-auto py-6 flex flex-col items-center justify-center">
                <Link to="/timetables">
                  <Calendar className="h-8 w-8 mb-3 text-brand" />
                  <span className="text-base font-medium">Generate Master Timetable</span>
                  <span className="text-xs text-muted-foreground mt-1">Create a comprehensive timetable for the entire institution</span>
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-auto py-6 flex flex-col items-center justify-center">
                <Link to="/timetables">
                  <Users className="h-8 w-8 mb-3 text-brand" />
                  <span className="text-base font-medium">Teacher Timetables</span>
                  <span className="text-xs text-muted-foreground mt-1">View and generate timetables for individual teachers</span>
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-auto py-6 flex flex-col items-center justify-center">
                <Link to="/timetables">
                  <GraduationCap className="h-8 w-8 mb-3 text-brand" />
                  <span className="text-base font-medium">Class Timetables</span>
                  <span className="text-xs text-muted-foreground mt-1">View and generate timetables for specific classes</span>
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-auto py-6 flex flex-col items-center justify-center">
                <Link to="/share">
                  <Clock className="h-8 w-8 mb-3 text-brand" />
                  <span className="text-base font-medium">Share Timetables</span>
                  <span className="text-xs text-muted-foreground mt-1">Share timetables via WhatsApp, email or download</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-1">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 text-sm">
              <li className="flex space-x-3">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-brand/10 text-brand font-medium text-sm">1</span>
                <div>
                  <p className="font-medium">Set up Classes</p>
                  <p className="text-muted-foreground text-xs">Add the classes for your institution</p>
                </div>
              </li>
              
              <li className="flex space-x-3">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-brand/10 text-brand font-medium text-sm">2</span>
                <div>
                  <p className="font-medium">Add Teachers</p>
                  <p className="text-muted-foreground text-xs">Enter faculty information and subjects they teach</p>
                </div>
              </li>
              
              <li className="flex space-x-3">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-brand/10 text-brand font-medium text-sm">3</span>
                <div>
                  <p className="font-medium">Define Subjects</p>
                  <p className="text-muted-foreground text-xs">Add all subjects taught at your institution</p>
                </div>
              </li>
              
              <li className="flex space-x-3">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-brand/10 text-brand font-medium text-sm">4</span>
                <div>
                  <p className="font-medium">Set Time Slots</p>
                  <p className="text-muted-foreground text-xs">Define periods, including breaks and recesses</p>
                </div>
              </li>
              
              <li className="flex space-x-3">
                <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-brand/10 text-brand font-medium text-sm">5</span>
                <div>
                  <p className="font-medium">Generate Timetables</p>
                  <p className="text-muted-foreground text-xs">Create and customize your institution's timetables</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
