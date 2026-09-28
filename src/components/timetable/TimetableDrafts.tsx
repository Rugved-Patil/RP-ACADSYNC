import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Save, FolderOpen, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/api";
import { TimetableDraft } from "@/types";
import { format } from "date-fns";

interface TimetableDraftsProps {
  currentTimetableData?: any;
  onLoadDraft: (draftData: any) => void;
}

export const TimetableDrafts: React.FC<TimetableDraftsProps> = ({
  currentTimetableData,
  onLoadDraft,
}) => {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<TimetableDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  // Fetch all drafts
  const fetchDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from('timetable_drafts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch drafts",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  // Save current timetable as draft
  const saveDraft = async () => {
    if (!draftName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the draft",
        variant: "destructive",
      });
      return;
    }

    if (!currentTimetableData) {
      toast({
        title: "Error",
        description: "No timetable data to save",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('timetable_drafts')
        .insert({
          name: draftName,
          academic_year: new Date().getFullYear().toString(),
          timing_id: currentTimetableData.timing_id || '',
          year_id: currentTimetableData.year_id,
          draft_data: currentTimetableData,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Draft saved successfully",
      });

      setDraftName("");
      setSaveDialogOpen(false);
      fetchDrafts();
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load a draft
  const loadDraft = (draft: TimetableDraft) => {
    onLoadDraft(draft.draft_data);
    setLoadDialogOpen(false);
    toast({
      title: "Success",
      description: `Draft "${draft.name}" loaded successfully`,
    });
  };

  // Delete a draft
  const deleteDraft = async (draftId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('timetable_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Draft deleted successfully",
      });

      fetchDrafts();
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast({
        title: "Error",
        description: "Failed to delete draft",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Save Draft Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={!currentTimetableData}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Timetable Draft</DialogTitle>
            <DialogDescription>
              Save the current timetable as a draft to load later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="draft-name" className="text-right">
                Name
              </Label>
              <Input
                id="draft-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Enter draft name..."
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveDraft} disabled={loading}>
              {loading ? "Saving..." : "Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Draft Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <FolderOpen className="mr-2 h-4 w-4" />
            Load Draft
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Load Timetable Draft</DialogTitle>
            <DialogDescription>
              Select a draft to load into the current timetable.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            {drafts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No drafts saved yet. Save your current timetable as a draft to see it here.
              </div>
            ) : (
              drafts.map((draft) => (
                <Card key={draft.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{draft.name}</CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <Calendar className="mr-1 h-3 w-3" />
                          {format(new Date(draft.created_at!), 'PPpp')}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadDraft(draft)}
                        >
                          Load
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Draft</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the draft "{draft.name}"? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteDraft(draft.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  {draft.academic_year && (
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground">
                        Academic Year: {draft.academic_year}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};