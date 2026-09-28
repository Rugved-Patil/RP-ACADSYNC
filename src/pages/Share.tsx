
import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TimetableService } from "@/services/timetableService";
import { Download, Mail, Share2 } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimetablePreview } from "@/components/timetable/TimetablePreview";
import { Timetable, Class, Teacher, Subject, TimeSlot, TimetableView as TimetableViewType } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const Share = () => {
  const { toast } = useToast();
  const [timetable, setTimetable] = React.useState<Timetable | null>(null);
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const [activeView, setActiveView] = React.useState<TimetableViewType>("master");
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>("");
  const [recipientEmail, setRecipientEmail] = React.useState<string>("");
  const [phoneNumber, setPhoneNumber] = React.useState<string>("");

  // Fetch all required data
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [timetableData, classesData, teachersData, subjectsData, timeSlotsData] = await Promise.all([
        TimetableService.getTimetable(),
        TimetableService.getClasses(),
        TimetableService.getTeachers(),
        TimetableService.getSubjects(),
        TimetableService.getTimeSlots(),
      ]);
      
      setTimetable(timetableData);
      setClasses(classesData);
      setTeachers(teachersData);
      setSubjects(subjectsData);
      setTimeSlots(timeSlotsData);
      
      // Set default selections if available
      if (classesData.length > 0) setSelectedClassId(classesData[0].id);
      if (teachersData.length > 0) setSelectedTeacherId(teachersData[0].id);
      
    } catch (error) {
      console.error("Error fetching timetable data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch timetable data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleShareWhatsApp = async () => {
    try {
      if (!phoneNumber) {
        toast({
          title: "Phone Number Required",
          description: "Please enter a phone number to share via WhatsApp.",
          variant: "destructive",
        });
        return;
      }
      
      if (!timetable?.id) {
        toast({
          title: "No Timetable",
          description: "No timetable available to share.",
          variant: "destructive",
        });
        return;
      }

      // Generate share token
      const shareToken = await TimetableService.generateShareToken(timetable.id);
      
      // Get formatted timetable content
      const shareData = await TimetableService.shareTimetable(shareToken, "whatsapp");
      
      // Create WhatsApp URL with formatted text
      const whatsappMessage = encodeURIComponent(shareData);
      const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^\d]/g, '')}?text=${whatsappMessage}`;
      
      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: "WhatsApp Opened",
        description: "WhatsApp opened with timetable data. Send the message to share.",
      });
    } catch (error) {
      console.error("Error sharing timetable via WhatsApp:", error);
      toast({
        title: "Error",
        description: "Failed to share timetable via WhatsApp. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareEmail = async () => {
    try {
      if (!recipientEmail) {
        toast({
          title: "Email Required",
          description: "Please enter an email address to share the timetable.",
          variant: "destructive",
        });
        return;
      }
      
      if (!timetable?.id) {
        toast({
          title: "No Timetable",
          description: "No timetable available to share.",
          variant: "destructive",
        });
        return;
      }

      // Generate share token
      const shareToken = await TimetableService.generateShareToken(timetable.id);
      
      // Get formatted timetable content
      const shareData = await TimetableService.shareTimetable(shareToken, "email");
      
      // Create mailto URL with formatted text
      const subject = encodeURIComponent("Timetable Share");
      const body = encodeURIComponent(shareData);
      const mailtoUrl = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
      
      // Open email client
      window.open(mailtoUrl);
      
      toast({
        title: "Email Client Opened",
        description: "Email client opened with timetable data.",
      });
    } catch (error) {
      console.error("Error sharing timetable via email:", error);
      toast({
        title: "Error",
        description: "Failed to share timetable via email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    try {
      if (!timetable?.id) {
        toast({
          title: "No Timetable",
          description: "No timetable available to download.",
          variant: "destructive",
        });
        return;
      }

      // Download timetable as PDF
      const blob = await TimetableService.downloadTimetable(timetable.id, 'pdf');
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable-${activeView}${
        activeView === "class" ? `-${getClassName(selectedClassId)}` : 
        activeView === "teacher" ? `-${getTeacherName(selectedTeacherId)}` : ""
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Timetable Downloaded",
        description: "Timetable has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error downloading timetable:", error);
      toast({
        title: "Error",
        description: "Failed to download timetable. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper functions for display names
  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || "Unknown Class";
  };

  const getTeacherName = (teacherId: string) => {
    return teachers.find((t) => t.id === teacherId)?.name || "Unknown Teacher";
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader 
        title="Share Timetable" 
        description="Share timetables via WhatsApp, email or download"
      />
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Timetable View Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Timetable</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="master" onValueChange={(value) => setActiveView(value as TimetableViewType)} className="mb-4">
              <TabsList>
                <TabsTrigger value="master">Master Timetable</TabsTrigger>
                <TabsTrigger value="teacher">Teacher Timetable</TabsTrigger>
                <TabsTrigger value="class">Class Timetable</TabsTrigger>
              </TabsList>
            </Tabs>

            {activeView === "teacher" && (
              <div className="mb-4">
                <Label htmlFor="teacher-select">Select Teacher</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger id="teacher-select" className="w-full">
                    <SelectValue placeholder="Select Teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {activeView === "class" && (
              <div className="mb-4">
                <Label htmlFor="class-select">Select Class</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger id="class-select" className="w-full">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <h3 className="font-medium">Preview</h3>
              <div className="border rounded-md">
                {timetable && (
                  <TimetablePreview
                    timetable={timetable}
                    classes={classes}
                    teachers={teachers}
                    subjects={subjects}
                    timeSlots={timeSlots}
                    view={activeView}
                    teacherId={activeView === "teacher" ? selectedTeacherId : undefined}
                    classId={activeView === "class" ? selectedClassId : undefined}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Sharing Options */}
        <Card>
          <CardHeader>
            <CardTitle>Sharing Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Share via Email</h3>
              <div className="grid gap-2">
                <Label htmlFor="email">Recipient Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@school.edu"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
              <Button onClick={handleShareEmail} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Share via WhatsApp</h3>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <Button onClick={handleShareWhatsApp} className="w-full">
                <Share2 className="mr-2 h-4 w-4" />
                Send on WhatsApp
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Download Timetable</h3>
              <Button onClick={handleDownload} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Share;
