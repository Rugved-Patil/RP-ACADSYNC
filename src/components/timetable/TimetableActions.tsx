import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Edit, MailIcon, Share2, ChevronDown, Lock, Unlock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditMode } from "@/types";
import { TimetableDrafts } from "./TimetableDrafts";
import { authService } from "@/services/authService";
import { GitPullRequest } from "lucide-react";

const DAYS_LIST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TimetableActionsProps {
  onGenerate: () => void;
  onDownload: (format: string, day?: string | number) => void;
  onShareEmail: () => void;
  onShareWhatsApp: () => void;
  editMode: EditMode;
  toggleEditMode: () => void;
  currentTimetableData?: any;
  onLoadDraft: (draftData: any) => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  onRequestChange?: () => void;
}

export const TimetableActions: React.FC<TimetableActionsProps> = ({
  onGenerate,
  onDownload,
  onShareEmail,
  onShareWhatsApp,
  editMode,
  toggleEditMode,
  currentTimetableData,
  onLoadDraft,
  isLocked = false,
  onToggleLock,
  onRequestChange,
}) => {
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === "admin";
  const isTeacher = currentUser?.role === "teacher";
  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="edit-mode"
              checked={editMode === "edit"}
              onCheckedChange={toggleEditMode}
              disabled={isLocked}
            />
            <Label htmlFor="edit-mode" className={isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}>
              {isLocked ? (
                <span className="flex items-center text-muted-foreground">
                  <Lock className="mr-1 h-4 w-4 text-amber-500" />
                  Locked (Editing Disabled)
                </span>
              ) : editMode === "edit" ? (
                <span className="flex items-center text-brand font-medium">
                  <Edit className="mr-1 h-4 w-4" />
                  Editing Mode Active
                </span>
              ) : (
                "Enable Editing Mode"
              )}
            </Label>
          </div>

          {onToggleLock && currentTimetableData && (
            <Button
              variant={isLocked ? "secondary" : "outline"}
              size="sm"
              onClick={onToggleLock}
              className="text-xs"
            >
              {isLocked ? (
                <>
                  <Unlock className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  Unlock Timetable
                </>
              ) : (
                <>
                  <Lock className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                  Lock Timetable
                </>
              )}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <TimetableDrafts
            currentTimetableData={currentTimetableData}
            onLoadDraft={onLoadDraft}
          />
        )}

        {isTeacher && onRequestChange && (
          <Button variant="default" onClick={onRequestChange}>
            <GitPullRequest className="mr-2 h-4 w-4" />
            Request Schedule Change
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download / Export
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Full Week Export
            </div>
            <DropdownMenuItem onClick={() => onDownload("csv")}>
              Export Week (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload("excel")}>
              Export Week (Excel)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload("pdf")}>
              Export Week (PDF)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload("html")}>
              Export Week (HTML)
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Single Day Export
            </div>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>Export Day (CSV)</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {DAYS_LIST.map((day, idx) => (
                  <DropdownMenuItem key={day} onClick={() => onDownload("csv", idx)}>
                    {day}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>Export Day (Excel)</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {DAYS_LIST.map((day, idx) => (
                  <DropdownMenuItem key={day} onClick={() => onDownload("excel", idx)}>
                    {day}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={onShareEmail}>
          <MailIcon className="mr-2 h-4 w-4" />
          Email
        </Button>
        <Button variant="outline" onClick={onShareWhatsApp}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>

        {isAdmin && (
          <Button onClick={onGenerate}>
            Generate Timetable
          </Button>
        )}
      </div>
    </div>
  );
};
