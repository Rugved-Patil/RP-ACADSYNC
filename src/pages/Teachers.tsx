
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SelectableDataTable } from "@/components/ui/selectable-data-table";
import { Teacher } from "@/types";
import { TimetableService } from "@/services/timetableService";
import { supabase } from "@/lib/api";
import { Plus, Edit, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Teachers = () => {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [deletedTeachers, setDeletedTeachers] = useState<Teacher[]>([]);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subjects: [] as string[],
  });

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const data = await TimetableService.getTeachers();
      setTeachers(data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch teachers data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubjectsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const subjects = e.target.value.split(",").map(s => s.trim());
    setFormData({ ...formData, subjects });
  };

  const handleAddTeacher = async () => {
    try {
      if (!formData.name) {
        toast({
          title: "Error",
          description: "Teacher name is required.",
          variant: "destructive",
        });
        return;
      }

      if (currentTeacher) {
        // Update existing teacher
        const { error } = await supabase
          .from('teachers')
          .update({
            name: formData.name,
            email: formData.email,
            specialization: formData.subjects.join(', '),
          })
          .eq('id', currentTeacher.id);

        if (error) throw error;
        await fetchTeachers();

        toast({
          title: "Success",
          description: "Teacher updated successfully.",
        });
      } else {
        // Add new teacher
        const { error } = await supabase
          .from('teachers')
          .insert({
            name: formData.name,
            email: formData.email,
            specialization: formData.subjects.join(', '),
          });

        if (error) throw error;
        await fetchTeachers();

        toast({
          title: "Success",
          description: "Teacher added successfully.",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving teacher:", error);
      toast({
        title: "Error",
        description: "Failed to save teacher data.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeacher = async () => {
    try {
      if (currentTeacher) {
        const { error } = await supabase
          .from('teachers')
          .delete()
          .eq('id', currentTeacher.id);
        
        if (error) throw error;
        await fetchTeachers();
        
        toast({
          title: "Success",
          description: "Teacher deleted successfully.",
        });
        
        setIsDeleteDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast({
        title: "Error",
        description: "Failed to delete teacher.",
        variant: "destructive",
      });
    }
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email || "",
      subjects: teacher.specialization ? [teacher.specialization] : [],
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    try {
      const teachersToDelete = [...selectedTeachers];
      const teacherIds = teachersToDelete.map(t => t.id);
      
      // Remove from UI immediately
      setTeachers(teachers.filter(t => !teacherIds.includes(t.id)));
      setDeletedTeachers(teachersToDelete);
      setSelectedTeachers([]);
      
      // Clear any existing timeout
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
      }
      
      // Set up undo timeout - delete from database after 10 seconds
      const timeoutId = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('teachers')
            .delete()
            .in('id', teacherIds);
          
          if (error) {
            console.error("Error permanently deleting teachers:", error);
            // If permanent deletion fails, restore the teachers
            setTeachers(prev => [...prev, ...teachersToDelete]);
            toast({
              title: "Error",
              description: "Failed to permanently delete teachers. They have been restored.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error in permanent deletion:", error);
        } finally {
          setDeletedTeachers([]);
          setUndoTimeoutId(null);
        }
      }, 10000);
      
      setUndoTimeoutId(timeoutId);
      
      // Show undo toast
      toast({
        title: "Teachers deleted",
        description: `${teachersToDelete.length} teacher${teachersToDelete.length > 1 ? 's' : ''} deleted successfully.`,
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleUndoDelete}
          >
            Undo
          </Button>
        ),
      });
      
    } catch (error) {
      console.error("Error deleting teachers:", error);
      toast({
        title: "Error",
        description: "Failed to delete teachers.",
        variant: "destructive",
      });
    }
  };

  const handleUndoDelete = async () => {
    try {
      if (deletedTeachers.length === 0) return;
      
      // Clear the timeout to prevent permanent deletion
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
        setUndoTimeoutId(null);
      }
      
      // Restore to UI (no need to restore to database since it wasn't deleted yet)
      setTeachers(prev => [...prev, ...deletedTeachers]);
      setDeletedTeachers([]);
      
      toast({
        title: "Restored",
        description: "Teachers have been restored successfully.",
      });
      
    } catch (error) {
      console.error("Error restoring teachers:", error);
      toast({
        title: "Error",
        description: "Failed to restore teachers.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setCurrentTeacher(null);
    setFormData({
      name: "",
      email: "",
      subjects: [],
    });
  };

  const columns = [
    { key: "name", title: "Name" },
    { key: "email", title: "Email" },
    {
      key: "subjects",
      title: "Subjects",
      render: (teacher: Teacher) => (
        <span>{teacher.specialization || 'No specialization'}</span>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (teacher: Teacher) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(teacher);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteDialog(teacher);
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Teachers"
        description="Manage faculty members"
        actions={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
        }
      />

      <SelectableDataTable
        data={teachers}
        columns={columns}
        selectedItems={selectedTeachers}
        onSelectionChange={setSelectedTeachers}
        onBulkDelete={handleBulkDelete}
        isLoading={loading}
      />

      {/* Add/Edit Teacher Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentTeacher ? "Edit Teacher" : "Add New Teacher"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter teacher name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter teacher email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subjects">Subjects (comma separated subject IDs)</Label>
              <Input
                id="subjects"
                name="subjects"
                value={formData.subjects.join(", ")}
                onChange={handleSubjectsChange}
                placeholder="e.g. s1, s2, s3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTeacher}>
              {currentTeacher ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the teacher{" "}
            <span className="font-semibold">{currentTeacher?.name}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeacher}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teachers;
