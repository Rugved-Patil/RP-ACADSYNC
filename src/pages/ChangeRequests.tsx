import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Plus,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";
import {
  requestService,
  EnrichedChangeRequest,
  ScheduleOverride,
} from "@/services/requestService";
import { TimetableService } from "@/services/timetableService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { TeacherChangeRequestDialog } from "@/components/timetable/TeacherChangeRequestDialog";
import { Timetable, Class, Subject, Classroom, TimeSlot } from "@/types";

const ChangeRequests: React.FC = () => {
  const { toast } = useToast();
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";

  const [requests, setRequests] = useState<EnrichedChangeRequest[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // Institution timetable data for request dialog
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Dialog states
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{
    isOpen: boolean;
    request: EnrichedChangeRequest | null;
    action: "approve" | "reject";
  }>({
    isOpen: false,
    request: null,
    action: "approve",
  });
  const [adminNotes, setAdminNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqList, overrideList, tt, cl, sub, rm, slots] = await Promise.all([
        requestService.getRequests(),
        isAdmin ? requestService.getOverrides() : Promise.resolve([]),
        TimetableService.getTimetable(),
        TimetableService.getClasses(),
        TimetableService.getSubjects(),
        TimetableService.getClassrooms(),
        TimetableService.getTimeSlots(),
      ]);

      setRequests(reqList);
      setOverrides(overrideList);
      setTimetable(tt);
      setClasses(cl);
      setSubjects(sub);
      setClassrooms(rm);
      setTimeSlots(slots);
    } catch (err: any) {
      console.error("Failed to load requests:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to load change requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenReview = (request: EnrichedChangeRequest, action: "approve" | "reject") => {
    setReviewDialog({
      isOpen: true,
      request,
      action,
    });
    setAdminNotes("");
  };

  const handleConfirmReview = async () => {
    if (!reviewDialog.request) return;
    setSubmittingReview(true);

    try {
      await requestService.reviewRequest(
        reviewDialog.request.id,
        reviewDialog.action,
        adminNotes
      );

      toast({
        title: reviewDialog.action === "approve" ? "Request Approved" : "Request Rejected",
        description: `Change request has been ${reviewDialog.action}d.`,
      });

      setReviewDialog({ isOpen: false, request: null, action: "approve" });
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to review request",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handlePromoteOverride = async (overrideId: string) => {
    try {
      await requestService.promoteOverride(overrideId);
      toast({
        title: "Promoted to Permanent",
        description: "Schedule exception folded into recurring base template.",
      });
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to promote schedule override",
        variant: "destructive",
      });
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-xs">
            <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 text-xs">
            <XCircle className="mr-1 h-3 w-3 text-red-500" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-xs">
            <Clock className="mr-1 h-3 w-3 text-amber-500" />
            Pending Review
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Schedule Change Requests"
        description={
          isAdmin
            ? "Review, approve, and manage faculty timetable requests and temporary/permanent overrides."
            : "Request time or room adjustments for your assigned lessons with verified conflict-free slots."
        }
        actions={
          isTeacher && (
            <Button onClick={() => setIsNewRequestOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Change Request
            </Button>
          )
        }
      />

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <GitPullRequest className="h-5 w-5 text-primary" />
            <span>{isAdmin ? "Institutional Change Requests Queue" : "My Submitted Requests"}</span>
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "All submitted teacher adjustments requiring administrative review."
              : "Track the status of your schedule change requests."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
              <p className="text-sm">No schedule change requests submitted yet.</p>
              {isTeacher && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsNewRequestOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Submit First Request
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && <TableHead>Teacher</TableHead>}
                    <TableHead>Lesson & Class</TableHead>
                    <TableHead>Current Slot</TableHead>
                    <TableHead>Requested Slot</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason / Notes</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      {isAdmin && (
                        <TableCell className="font-semibold text-xs whitespace-nowrap">
                          {r.teacher_name || "Faculty Member"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="font-medium text-xs">{r.subject_name || "Subject"}</div>
                        <div className="text-[11px] text-muted-foreground">{r.class_name}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{r.current_day_name}</div>
                        <div className="text-muted-foreground text-[11px]">
                          {r.current_start_time} - {r.current_end_time}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {r.current_classroom_name || "Room"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-primary">{r.requested_day_name || r.current_day_name}</div>
                        <div className="text-muted-foreground text-[11px]">
                          {r.requested_start_time ? `${r.requested_start_time} - ${r.requested_end_time}` : "Same time"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {r.requested_classroom_name || r.current_classroom_name || "Room"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px]">
                          {r.change_scope === "permanent" ? "Permanent" : "Temporary"}
                        </Badge>
                        {r.effective_date && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {r.effective_date}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{renderStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs max-w-xs">
                        {r.reason && <p className="truncate" title={r.reason}>{r.reason}</p>}
                        {r.admin_notes && (
                          <p className="text-[11px] text-muted-foreground italic mt-0.5 truncate" title={r.admin_notes}>
                            Admin: {r.admin_notes}
                          </p>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right whitespace-nowrap">
                          {r.status === "pending" ? (
                            <div className="flex items-center justify-end space-x-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                onClick={() => handleOpenReview(r, "approve")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-red-500/50 hover:bg-red-500/10 text-red-700 dark:text-red-300"
                                onClick={() => handleOpenReview(r, "reject")}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Processed</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin: Schedule Overrides & Exceptions (Section 7.5) */}
      {isAdmin && overrides.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span>Schedule Overrides & Date Exceptions (v2.0.0 Section 7.5)</span>
            </CardTitle>
            <CardDescription>
              Active date-scoped exceptions layered on top of the recurring base timetable template.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Base Template Promotion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overrides.map((ov) => (
                    <TableRow key={ov.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            ov.override_type === "permanent"
                              ? "bg-purple-500/10 text-purple-700 border-purple-300"
                              : "bg-blue-500/10 text-blue-700 border-blue-300"
                          }
                        >
                          {ov.override_type === "permanent" ? "Permanent Base" : "Date Exception"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {ov.effective_date || "All Semester (Base)"}
                      </TableCell>
                      <TableCell className="text-xs max-w-sm truncate">
                        {ov.notes || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-[10px]">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {ov.override_type === "temporary" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs"
                            onClick={() => handlePromoteOverride(ov.id)}
                          >
                            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                            Promote to Permanent
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">In Base Template</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog for Admin */}
      <Dialog
        open={reviewDialog.isOpen}
        onOpenChange={(open) => !open && setReviewDialog({ ...reviewDialog, isOpen: false })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approve" ? "Approve Change Request" : "Reject Change Request"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === "approve"
                ? reviewDialog.request?.change_scope === "permanent"
                  ? "Approving this permanent request will update the recurring base weekly lesson."
                  : "Approving this temporary request will create a date-scoped override without altering the base template."
                : "Rejecting this request will close it without changing the schedule."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {reviewDialog.request && (
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <div>
                  <span className="font-semibold">Teacher: </span>
                  {reviewDialog.request.teacher_name}
                </div>
                <div>
                  <span className="font-semibold">Requested Slot: </span>
                  {reviewDialog.request.requested_day_name} ({reviewDialog.request.requested_start_time} - {reviewDialog.request.requested_end_time})
                </div>
                <div>
                  <span className="font-semibold">Scope: </span>
                  {reviewDialog.request.change_scope === "permanent" ? "Permanent" : `Temporary (${reviewDialog.request.effective_date})`}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="admin-notes">Administrator Notes</Label>
              <Textarea
                id="admin-notes"
                placeholder={
                  reviewDialog.action === "approve"
                    ? "Optional approval comments..."
                    : "Reason for rejection..."
                }
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialog({ ...reviewDialog, isOpen: false })}
              disabled={submittingReview}
            >
              Cancel
            </Button>
            <Button
              variant={reviewDialog.action === "approve" ? "default" : "destructive"}
              onClick={handleConfirmReview}
              disabled={submittingReview}
            >
              {submittingReview
                ? "Processing..."
                : reviewDialog.action === "approve"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Change Request Modal */}
      {timetable && (
        <TeacherChangeRequestDialog
          isOpen={isNewRequestOpen}
          onClose={() => setIsNewRequestOpen(false)}
          timetable={timetable}
          classes={classes}
          subjects={subjects}
          classrooms={classrooms}
          timeSlots={timeSlots}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default ChangeRequests;
