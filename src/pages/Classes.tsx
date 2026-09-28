import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SelectableDataTable } from "@/components/ui/selectable-data-table";
import { TimetableService } from "@/services/timetableService";
import { supabase } from "@/lib/api";
import { Class, Year } from "@/types";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Classes = () => {
  const { toast } = useToast();
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [years, setYears] = React.useState<Year[]>([]);
  const [selectedClasses, setSelectedClasses] = React.useState<Class[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [currentClass, setCurrentClass] = React.useState<Class | null>(null);
  const [deletedClasses, setDeletedClasses] = React.useState<Class[]>([]);
  const [undoTimeoutId, setUndoTimeoutId] = React.useState<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = React.useState({
    name: "",
    year_id: "",
    student_count: "",
  });
  const [newYearName, setNewYearName] = React.useState("");

  const fetchClasses = React.useCallback(async () => {
    try {
      setLoading(true);
      const [classData, yearData] = await Promise.all([
        TimetableService.getClasses(),
        TimetableService.getYears(),
      ]);
      setClasses(classData);
      setYears(yearData);
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch classes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateYear = async () => {
    if (!newYearName.trim()) return;
    try {
      const { data, error } = await supabase.from('years').insert({ name: newYearName.trim() }).select().single();
      if (error) throw error;
      setYears((prev) => [...prev, data]);
      setFormData((prev) => ({ ...prev, year_id: data.id }));
      setNewYearName("");
      toast({ title: "Success", description: `Year "${data.name}" created.` });
    } catch (error) {
      console.error("Error creating year:", error);
      toast({ title: "Error", description: "Failed to create year.", variant: "destructive" });
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('classes')
        .insert({
          name: formData.name || "",
          year_id: formData.year_id || null,
          student_count: parseInt(formData.student_count) || 0,
        });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Class added successfully",
      });
      setIsAddDialogOpen(false);
      setFormData({ name: "", year_id: "", student_count: "" });
      fetchClasses();
    } catch (error) {
      console.error("Error adding class:", error);
      toast({
        title: "Error",
        description: "Failed to add class. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass) return;

    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: formData.name || currentClass.name,
          year_id: formData.year_id || null,
          student_count: parseInt(formData.student_count) || currentClass.student_count || 0,
        })
        .eq('id', currentClass.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Class updated successfully",
      });
      setIsEditDialogOpen(false);
      setCurrentClass(null);
      setFormData({ name: "", year_id: "", student_count: "" });
      fetchClasses();
    } catch (error) {
      console.error("Error updating class:", error);
      toast({
        title: "Error",
        description: "Failed to update class. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClass = async () => {
    if (!currentClass) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', currentClass.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setCurrentClass(null);
      fetchClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      toast({
        title: "Error",
        description: "Failed to delete class. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const classesToDelete = [...selectedClasses];
      const classIds = classesToDelete.map(c => c.id);

      setClasses(classes.filter(c => !classIds.includes(c.id)));
      setDeletedClasses(classesToDelete);
      setSelectedClasses([]);

      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
      }

      const timeoutId = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('classes')
            .delete()
            .in('id', classIds);

          if (error) {
            console.error("Error permanently deleting classes:", error);
            setClasses(prev => [...prev, ...classesToDelete]);
            toast({
              title: "Error",
              description: "Failed to permanently delete classes. They have been restored.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error in permanent deletion:", error);
        } finally {
          setDeletedClasses([]);
          setUndoTimeoutId(null);
        }
      }, 10000);

      setUndoTimeoutId(timeoutId);

      toast({
        title: "Classes deleted",
        description: `${classesToDelete.length} class${classesToDelete.length > 1 ? 'es' : ''} deleted successfully.`,
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
      console.error("Error deleting classes:", error);
      toast({
        title: "Error",
        description: "Failed to delete classes.",
        variant: "destructive",
      });
    }
  };

  const handleUndoDelete = async () => {
    try {
      if (deletedClasses.length === 0) return;

      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
        setUndoTimeoutId(null);
      }

      setClasses(prev => [...prev, ...deletedClasses]);
      setDeletedClasses([]);

      toast({
        title: "Restored",
        description: "Classes have been restored successfully.",
      });

    } catch (error) {
      console.error("Error restoring classes:", error);
      toast({
        title: "Error",
        description: "Failed to restore classes.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (classItem: Class) => {
    setCurrentClass(classItem);
    setFormData({
      name: classItem.name,
      year_id: classItem.year_id || "",
      student_count: classItem.student_count?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (classItem: Class) => {
    setCurrentClass(classItem);
    setIsDeleteDialogOpen(true);
  };

  const getYearName = (yearId?: string) => years.find((y) => y.id === yearId)?.name || "Not assigned";

  const columns = [
    {
      key: "name",
      title: "Class Name",
      render: (classItem: Class) => (
        <div className="flex items-center gap-2">
          <span>{classItem.name}</span>
          <Badge variant="outline">{classItem.student_count || 0} students</Badge>
        </div>
      )
    },
    {
      key: "student_count",
      title: "Students",
      render: (classItem: Class) => (
        <Badge variant="outline">
          {classItem.student_count || 0}
        </Badge>
      )
    },
    {
      key: "year_id",
      title: "Year",
      render: (classItem: Class) => <span>{getYearName(classItem.year_id)}</span>
    },
    {
      key: "actions",
      title: "Actions",
      render: (classItem: Class) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(classItem);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteDialog(classItem);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const YearField = () => (
    <div className="grid gap-2">
      <Label htmlFor="year_id">Year</Label>
      <Select value={formData.year_id} onValueChange={(value) => setFormData((prev) => ({ ...prev, year_id: value }))}>
        <SelectTrigger id="year_id">
          <SelectValue placeholder="Select a year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year.id} value={year.id}>
              {year.name}
            </SelectItem>
          ))}
          {years.length === 0 && (
            <SelectItem disabled value="none">No years yet — add one below</SelectItem>
          )}
        </SelectContent>
      </Select>
      <div className="flex gap-2 mt-1">
        <Input
          placeholder="New year name, e.g. First Year"
          value={newYearName}
          onChange={(e) => setNewYearName(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={handleCreateYear} disabled={!newYearName.trim()}>
          Add Year
        </Button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Classes Management"
        description="Add, edit or remove classes"
        actions={
          <Button onClick={() => {
            setFormData({ name: "", year_id: "", student_count: "" });
            setIsAddDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Class
          </Button>
        }
      />

      <SelectableDataTable
        data={classes}
        columns={columns}
        selectedItems={selectedClasses}
        onSelectionChange={setSelectedClasses}
        onBulkDelete={handleBulkDelete}
        isLoading={loading}
      />

      {/* Add Class Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Class</DialogTitle>
            <DialogDescription>
              Enter the details for the new class
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddClass}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Class Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., CS-A"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <YearField />
              <div className="grid gap-2">
                <Label htmlFor="student_count">Number of Students</Label>
                <Input
                  id="student_count"
                  name="student_count"
                  type="number"
                  placeholder="e.g., 30"
                  value={formData.student_count}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Class</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update the class details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditClass}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Class Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  placeholder="e.g., CS-A"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <YearField />
              <div className="grid gap-2">
                <Label htmlFor="edit-student_count">Number of Students</Label>
                <Input
                  id="edit-student_count"
                  name="student_count"
                  type="number"
                  placeholder="e.g., 30"
                  value={formData.student_count}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Class</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the class "{currentClass?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClass}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Classes;
