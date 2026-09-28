
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Class, Subject } from "@/types";

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Subject, "id">) => void;
  classes: Class[];
  currentSubject: Subject | null;
}

export const SubjectFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  classes,
  currentSubject,
}: SubjectFormDialogProps) => {
  const [formData, setFormData] = React.useState<Omit<Subject, "id">>({
    name: "",
    code: "",
    classes: [],
    periodsPerWeek: 1,
    isLab: false,
    lab_duration_hours: 2
  });

  React.useEffect(() => {
    if (open) {
      setFormData({
        name: currentSubject?.name || "",
        code: currentSubject?.code || "",
        classes: currentSubject?.classes || [],
        periodsPerWeek: currentSubject?.periodsPerWeek || 1,
        isLab: currentSubject?.isLab || false,
        lab_duration_hours: currentSubject?.lab_duration_hours || 2
      });
    }
  }, [open, currentSubject]);

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currentSubject ? "Edit Subject" : "Add New Subject"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Subject Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter subject name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">Subject Code *</Label>
            <Input
              id="code"
              name="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g. CS101"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="periodsPerWeek">Periods Per Week *</Label>
            <Input
              id="periodsPerWeek"
              name="periodsPerWeek"
              type="number"
              min="1"
              value={formData.periodsPerWeek}
              onChange={(e) => setFormData({ ...formData, periodsPerWeek: parseInt(e.target.value) || 1 })}
              placeholder="e.g. 5"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="isLab">Has Lab/Practical</Label>
              <Switch
                id="isLab"
                checked={formData.isLab}
                onCheckedChange={(checked) => setFormData({ ...formData, isLab: checked })}
              />
            </div>
            {formData.isLab && (
              <div className="ml-6">
                <Label htmlFor="labDuration">Lab Duration (hours)</Label>
                <Select
                  value={formData.lab_duration_hours?.toString() || "2"}
                  onValueChange={(value) => setFormData({ ...formData, lab_duration_hours: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Assign to Classes</Label>
            <div className="space-y-2">
              {classes.map((cls) => (
                <div key={cls.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`class-${cls.id}`}
                    checked={formData.classes?.includes(cls.id) || false}
                    onChange={(e) => {
                      const currentClasses = formData.classes || [];
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          classes: [...currentClasses, cls.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          classes: currentClasses.filter(id => id !== cls.id)
                        });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={`class-${cls.id}`} className="text-sm">
                    {cls.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {currentSubject ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
