import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { TimeSlot } from "@/types";
import { TimetableService } from "@/services/timetableService";
import { supabase } from "@/lib/api";
import { Plus, Edit, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Timings = () => {
  const { toast } = useToast();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTimeSlot, setCurrentTimeSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    endTime: "",
    isBreak: false,
  });

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      const data = await TimetableService.getTimeSlots();
      setTimeSlots(data);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      toast({
        title: "Error",
        description: "Failed to fetch time slots data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData({ ...formData, isBreak: checked });
  };

  const handleAddTimeSlot = async () => {
    try {
      if (!formData.startTime || !formData.endTime) {
        toast({
          title: "Error",
          description: "Start time and end time are required.",
          variant: "destructive",
        });
        return;
      }

      // Generate name if empty
      const name = formData.name || `${formData.startTime} - ${formData.endTime}`;

      if (currentTimeSlot) {
        // Update existing time slot
        const { error } = await supabase
          .from('time_slots')
          .update({
            start_time: formData.startTime,
            end_time: formData.endTime,
            is_break: formData.isBreak,
          })
          .eq('id', currentTimeSlot.id);

        if (error) throw error;
        await fetchTimeSlots();

        toast({
          title: "Success",
          description: "Time slot updated successfully.",
        });
      } else {
        // Add new time slot - need to get or create a timing_id
        let timingId = null;
        
        // First try to get existing timing
        const { data: existingTiming } = await supabase
          .from('timings')
          .select('id')
          .limit(1)
          .single();
        
        if (existingTiming) {
          timingId = existingTiming.id;
        } else {
          // Create a default timing if none exists
          const { data: newTiming, error: timingError } = await supabase
            .from('timings')
            .insert({
              name: 'Default Timing',
              working_days: [0, 1, 2, 3, 4, 5], // Monday to Saturday
              periods: {}
            })
            .select('id')
            .single();
            
          if (timingError) throw timingError;
          timingId = newTiming.id;
        }
        
        // Get the current maximum slot_order for this timing
        const { data: maxOrderData } = await supabase
          .from('time_slots')
          .select('slot_order')
          .eq('timing_id', timingId)
          .order('slot_order', { ascending: false })
          .limit(1)
          .single();
        
        const nextSlotOrder = (maxOrderData?.slot_order || 0) + 1;
        
        const { error } = await supabase
          .from('time_slots')
          .insert({
            timing_id: timingId,
            start_time: formData.startTime,
            end_time: formData.endTime,
            is_break: formData.isBreak,
            slot_order: nextSlotOrder,
          });

        if (error) throw error;
        await fetchTimeSlots();

        toast({
          title: "Success",
          description: "Time slot added successfully.",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving time slot:", error);
      toast({
        title: "Error",
        description: "Failed to save time slot data.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTimeSlot = async () => {
    try {
      if (currentTimeSlot) {
        const { error } = await supabase
          .from('time_slots')
          .delete()
          .eq('id', currentTimeSlot.id);
        
        if (error) throw error;
        await fetchTimeSlots();
        
        toast({
          title: "Success",
          description: "Time slot deleted successfully.",
        });
        
        setIsDeleteDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error deleting time slot:", error);
      toast({
        title: "Error",
        description: "Failed to delete time slot.",
        variant: "destructive",
      });
    }
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (timeSlot: TimeSlot) => {
    setCurrentTimeSlot(timeSlot);
    setFormData({
      name: timeSlot.name || `${timeSlot.start_time} - ${timeSlot.end_time}`,
      startTime: timeSlot.start_time,
      endTime: timeSlot.end_time,
      isBreak: timeSlot.is_break,
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (timeSlot: TimeSlot) => {
    setCurrentTimeSlot(timeSlot);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setCurrentTimeSlot(null);
    setFormData({
      name: "",
      startTime: "",
      endTime: "",
      isBreak: false,
    });
  };

  const columns = [
    { 
      key: "startTime", 
      title: "Start Time",
      render: (timeSlot: TimeSlot) => <span>{timeSlot.start_time}</span>
    },
    { 
      key: "endTime", 
      title: "End Time",
      render: (timeSlot: TimeSlot) => <span>{timeSlot.end_time}</span>
    },
    {
      key: "duration",
      title: "Duration",
      render: (timeSlot: TimeSlot) => {
        // Convert times to minutes since midnight for calculation
        const [startHour, startMinute] = timeSlot.start_time.split(":").map(Number);
        const [endHour, endMinute] = timeSlot.end_time.split(":").map(Number);
        
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        
        // Calculate duration in minutes
        const durationMinutes = endMinutes - startMinutes;
        
        // Format duration
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        
        return (
          <span>
            {hours > 0 ? `${hours}h ` : ""}{minutes > 0 ? `${minutes}m` : ""}
          </span>
        );
      }
    },
    {
      key: "isBreak",
      title: "Type",
      render: (timeSlot: TimeSlot) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          timeSlot.is_break 
            ? "bg-orange-100 text-orange-800" 
            : "bg-green-100 text-green-800"
        }`}>
          {timeSlot.is_break ? "Break" : "Class"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (timeSlot: TimeSlot) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(timeSlot);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteDialog(timeSlot);
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // In the dialog form, add a name field
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Timings"
        description="Manage class periods and breaks"
        actions={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Time Slot
          </Button>
        }
      />

      <DataTable
        data={timeSlots}
        columns={columns}
        isLoading={loading}
      />

      {/* Add/Edit Time Slot Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentTimeSlot ? "Edit Time Slot" : "Add New Time Slot"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Period 1 (leave empty to auto-generate)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                value={formData.startTime}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                value={formData.endTime}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="isBreak" 
                checked={formData.isBreak}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="isBreak">This is a break period</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTimeSlot}>
              {currentTimeSlot ? "Update" : "Add"}
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
            Are you sure you want to delete the time slot from{" "}
            <span className="font-semibold">{currentTimeSlot?.start_time}</span> to{" "}
            <span className="font-semibold">{currentTimeSlot?.end_time}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTimeSlot}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Timings;
