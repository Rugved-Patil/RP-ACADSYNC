import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { TimetableService } from "@/services/timetableService";
import { supabase } from "@/lib/api";
import { Plus, Edit, Trash, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Classroom, Class, ClassClassroomAssignment } from "@/types";

const ClassroomsManagement = () => {
  const { toast } = useToast();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [currentClassroom, setCurrentClassroom] = useState<Classroom | null>(null);
  const [classroomAssignments, setClassroomAssignments] = useState<ClassClassroomAssignment[]>([]);
  const [unassignedClasses, setUnassignedClasses] = useState<Class[]>([]);
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    capacity: 30,
    isLab: false,
  });

  const [assignmentData, setAssignmentData] = useState({
    classId: "",
    classroomId: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classroomsData, classesData] = await Promise.all([
        TimetableService.getClassrooms(),
        TimetableService.getClasses(),
      ]);

      setClassrooms(classroomsData);
      setClasses(classesData);

      const { data: assignments } = await supabase
        .from('class_classroom_assignments')
        .select('*');
      setClassroomAssignments(assignments || []);

      const assignedClassIds = new Set((assignments || []).map((a: any) => a.class_id));
      const assignedClassroomIds = new Set((assignments || []).map((a: any) => a.classroom_id));

      const unassigned = classesData.filter(cls => !assignedClassIds.has(cls.id));
      const available = classroomsData.filter(room => !assignedClassroomIds.has(room.id) && !room.is_lab);

      setUnassignedClasses(unassigned);
      setAvailableClassrooms(available);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'capacity' ? parseInt(value) : value });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData({ ...formData, isLab: checked });
  };

  const handleAddClassroom = async () => {
    try {
      if (!formData.name) {
        toast({
          title: "Error",
          description: "Classroom name is required.",
          variant: "destructive",
        });
        return;
      }

      if (currentClassroom) {
        const { error } = await supabase
          .from('classrooms')
          .update({
            name: formData.name,
            capacity: formData.capacity,
            is_lab: formData.isLab,
          })
          .eq('id', currentClassroom.id);

        if (error) throw error;
        toast({ title: "Success", description: "Classroom updated successfully." });
      } else {
        const { error } = await supabase
          .from('classrooms')
          .insert({
            name: formData.name,
            capacity: formData.capacity,
            is_lab: formData.isLab,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Classroom added successfully." });
      }

      setIsDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error("Error saving classroom:", error);
      toast({
        title: "Error",
        description: "Failed to save classroom.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClassroom = async (classroom: Classroom) => {
    try {
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', classroom.id);

      if (error) throw error;
      await fetchData();

      toast({ title: "Success", description: "Classroom deleted successfully." });
    } catch (error) {
      console.error("Error deleting classroom:", error);
      toast({
        title: "Error",
        description: "Failed to delete classroom.",
        variant: "destructive",
      });
    }
  };

  const handleAssignClass = async () => {
    try {
      if (!assignmentData.classId || !assignmentData.classroomId) {
        toast({
          title: "Error",
          description: "Please select both class and classroom.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('class_classroom_assignments')
        .insert({
          class_id: assignmentData.classId,
          classroom_id: assignmentData.classroomId,
        });

      if (error) throw error;

      setIsAssignmentDialogOpen(false);
      setAssignmentData({ classId: "", classroomId: "" });
      await fetchData();

      toast({ title: "Success", description: "Class assigned to classroom successfully." });
    } catch (error) {
      console.error("Error assigning class:", error);
      toast({
        title: "Error",
        description: "Failed to assign class to classroom.",
        variant: "destructive",
      });
    }
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (classroom: Classroom) => {
    setCurrentClassroom(classroom);
    setFormData({
      name: classroom.name,
      capacity: classroom.capacity,
      isLab: classroom.is_lab || false,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setCurrentClassroom(null);
    setFormData({ name: "", capacity: 30, isLab: false });
  };

  const getClassName = (classId: string) => classes.find((c) => c.id === classId)?.name || "Unknown";
  const getClassroomName = (classroomId: string) => classrooms.find((c) => c.id === classroomId)?.name || "Unknown";

  const classroomColumns = [
    { key: "name", title: "Name", render: (classroom: Classroom) => <span>{classroom.name}</span> },
    { key: "capacity", title: "Capacity", render: (classroom: Classroom) => <span>{classroom.capacity} students</span> },
    {
      key: "type",
      title: "Type",
      render: (classroom: Classroom) => (
        <Badge variant={classroom.is_lab ? "default" : "outline"}>
          {classroom.is_lab ? "Laboratory" : "Classroom"}
        </Badge>
      )
    },
    {
      key: "actions",
      title: "Actions",
      render: (classroom: Classroom) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); openEditDialog(classroom); }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleDeleteClassroom(classroom); }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const assignmentColumns = [
    { key: "class", title: "Class", render: (assignment: ClassClassroomAssignment) => <span>{getClassName(assignment.class_id)}</span> },
    { key: "classroom", title: "Classroom", render: (assignment: ClassClassroomAssignment) => <span>{getClassroomName(assignment.classroom_id)}</span> },
    {
      key: "actions",
      title: "Actions",
      render: (assignment: ClassClassroomAssignment) => (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const { error } = await supabase
              .from('class_classroom_assignments')
              .delete()
              .eq('id', assignment.id);
            if (!error) {
              await fetchData();
              toast({ title: "Success", description: "Assignment removed successfully." });
            }
          }}
        >
          <Trash className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Classroom Management"
        description="Manage classrooms and which class is based in which room"
        actions={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Classroom
          </Button>
        }
      />

      <Tabs defaultValue="classrooms" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="classrooms">Classrooms</TabsTrigger>
          <TabsTrigger value="assignments">Class Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="classrooms">
          <DataTable data={classrooms} columns={classroomColumns} isLoading={loading} />
        </TabsContent>

        <TabsContent value="assignments">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Class-Classroom Assignments</h3>
              <Button onClick={() => setIsAssignmentDialogOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                Assign Class
              </Button>
            </div>
            <DataTable data={classroomAssignments} columns={assignmentColumns} isLoading={loading} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Classroom Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentClassroom ? "Edit Classroom" : "Add New Classroom"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Room 101" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input id="capacity" name="capacity" type="number" value={formData.capacity} onChange={handleInputChange} min="1" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isLab" checked={formData.isLab} onCheckedChange={handleSwitchChange} />
              <Label htmlFor="isLab">This is a laboratory</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClassroom}>{currentClassroom ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Assignment Dialog */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Class to Classroom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Class *</Label>
              <Select value={assignmentData.classId} onValueChange={(value) => setAssignmentData({ ...assignmentData, classId: value })}>
                <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                <SelectContent>
                  {unassignedClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                  {unassignedClasses.length === 0 && (
                    <SelectItem disabled value="none">No unassigned classes available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Classroom *</Label>
              <Select value={assignmentData.classroomId} onValueChange={(value) => setAssignmentData({ ...assignmentData, classroomId: value })}>
                <SelectTrigger><SelectValue placeholder="Select a classroom" /></SelectTrigger>
                <SelectContent>
                  {availableClassrooms.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name} ({classroom.capacity} capacity)
                    </SelectItem>
                  ))}
                  {availableClassrooms.length === 0 && (
                    <SelectItem disabled value="none">No available classrooms</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignClass}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassroomsManagement;
