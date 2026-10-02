import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Upload, 
  Download, 
  Building2, 
  CheckCircle2, 
  Layers, 
  Users, 
  BookOpen, 
  AlertCircle,
  FileSpreadsheet,
  Cpu
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/lib/api";

const DataUpload = () => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a master CSV or Excel file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(20);
    setImportSummary(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // Strip data:mime/type;base64, prefix
        };
        reader.readAsDataURL(file);
      });

      setUploadProgress(50);

      // Invoke import-data endpoint (auto-routes to master relational import)
      const { data, error } = await supabase.functions.invoke("import-data", {
        body: {
          file: base64,
          fileName: file.name,
          dataType: "master",
          mimeType: file.type || (file.name.endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        },
      });

      if (error) throw error;

      setUploadProgress(100);
      const summaryText = data.summary || "Master dataset imported successfully.";
      setImportSummary(summaryText);

      toast({
        title: "Master Import Successful! 🎉",
        description: summaryText,
      });

      setTimeout(() => {
        setUploadProgress(0);
      }, 3000);
    } catch (error: any) {
      console.error("Error uploading master file:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to process the master CSV file. Please check column format.",
        variant: "destructive",
      });
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const link = document.createElement("a");
    link.href = "/college_master_import.csv";
    link.download = "college_master_import.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Template Downloaded",
      description: "Sample college_master_import.csv has been downloaded to your computer.",
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Institutional Master Data Import"
        description="Single standardized CSV/Excel format that provisions Years, Classes, Batches, Classrooms, Specialized Labs, Teachers, Subjects, and Cross-Entity Assignments in one step."
      />

      {/* Primary Hero Import Card */}
      <Card className="border-2 border-primary/20 shadow-md">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                <Building2 className="h-6 w-6 text-primary" />
                Master Institutional CSV / Excel Import
              </CardTitle>
              <CardDescription className="text-sm">
                Upload your master dataset file. All relational tables (Years, Classes, Classrooms, Faculty, Curriculum, and Timings) are extracted and linked automatically.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleTemplate}
              className="gap-2 shrink-0 border-primary/40 hover:bg-primary/10 text-primary font-medium"
            >
              <Download className="h-4 w-4" />
              Download Master Template (.csv)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Drag & Drop Upload Zone */}
          <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-card hover:bg-muted/10 transition-colors">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Upload Master Institutional File</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports standardized CSV (<code>.csv</code>) or Excel (<code>.xlsx, .xls</code>).
                </p>
              </div>

              <div className="pt-2">
                <Input
                  id="master-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                      e.target.value = "";
                    }
                  }}
                  disabled={uploading}
                  className="cursor-pointer file:cursor-pointer file:text-primary file:font-semibold"
                />
              </div>

              {uploadProgress > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Importing and establishing relational mappings...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {importSummary && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 text-left flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{importSummary}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4 Key Pillars of the Single Master File */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Layers className="h-4 w-4 text-indigo-500" />
                <span>Classes & Batches</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatically divides class strength (~60) into distinct batches (Batch A, B, C) for parallel laboratory scheduling.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Cpu className="h-4 w-4 text-emerald-500" />
                <span>Specialized Labs</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Distinguishes theory lecture halls from dedicated computer, electronics, and mechanical laboratories.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Users className="h-4 w-4 text-blue-500" />
                <span>Faculty & Accounts</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Imports teacher specializations, max daily periods, and auto-provisions portal logins for staff.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <BookOpen className="h-4 w-4 text-purple-500" />
                <span>Curriculum Mapping</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configures theory lectures (1-hr) and 2-hour lab blocks, linking classes and qualified instructors seamlessly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Master Format Column Specification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            Standardized Master CSV Schema Reference
          </CardTitle>
          <CardDescription>
            The master CSV file uses a single unified layout with a <code>Record_Type</code> indicator to define every institutional entity without complex foreign keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/80 text-foreground uppercase tracking-wider font-semibold border-b">
                <tr>
                  <th className="p-2.5">Record_Type</th>
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5">Code</th>
                  <th className="p-2.5">Year / Dept</th>
                  <th className="p-2.5">Capacity</th>
                  <th className="p-2.5">Credits</th>
                  <th className="p-2.5">Periods/Wk</th>
                  <th className="p-2.5">Is_Lab</th>
                  <th className="p-2.5">Duration</th>
                  <th className="p-2.5">Classes</th>
                  <th className="p-2.5">Teachers</th>
                  <th className="p-2.5">Batches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/20 font-mono">
                  <td className="p-2.5 font-bold text-indigo-600">CLASS</td>
                  <td className="p-2.5">SE-ECCE</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5">Second Year</td>
                  <td className="p-2.5">60</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5">No</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-indigo-600 font-semibold">Batch A: 20, Batch B: 20, Batch C: 19</td>
                </tr>
                <tr className="hover:bg-muted/20 font-mono">
                  <td className="p-2.5 font-bold text-emerald-600">CLASSROOM</td>
                  <td className="p-2.5">Programming Lab-1 (FF-28)</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5">35</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 font-bold text-emerald-600">Yes</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                </tr>
                <tr className="hover:bg-muted/20 font-mono">
                  <td className="p-2.5 font-bold text-blue-600">TEACHER</td>
                  <td className="p-2.5">Dr. S. N. Pawar</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5">Networks</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5">No</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                </tr>
                <tr className="hover:bg-muted/20 font-mono">
                  <td className="p-2.5 font-bold text-purple-600">SUBJECT</td>
                  <td className="p-2.5">Digital System Design (DSD)</td>
                  <td className="p-2.5">EC201</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 font-bold text-purple-600">2</td>
                  <td className="p-2.5">2</td>
                  <td className="p-2.5">No</td>
                  <td className="p-2.5">1</td>
                  <td className="p-2.5 font-semibold text-foreground">SE-ECCE</td>
                  <td className="p-2.5 font-semibold text-foreground">Prof. M. A. Mulay</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                </tr>
                <tr className="hover:bg-muted/20 font-mono bg-orange-50/30 dark:bg-orange-950/20">
                  <td className="p-2.5 font-bold text-orange-600">SUBJECT</td>
                  <td className="p-2.5">DSD Lab</td>
                  <td className="p-2.5">EC201L</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                  <td className="p-2.5 font-bold text-orange-600">1</td>
                  <td className="p-2.5">2</td>
                  <td className="p-2.5 font-bold text-orange-600">Yes</td>
                  <td className="p-2.5 font-bold text-orange-600">2 (Consecutive)</td>
                  <td className="p-2.5 font-semibold text-foreground">SE-ECCE</td>
                  <td className="p-2.5 font-semibold text-foreground">Prof. M. A. Mulay</td>
                  <td className="p-2.5 text-muted-foreground">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 text-muted-foreground">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-primary" />
              Relational Linkages Made Easy:
            </div>
            <p>
              In the <code>SUBJECT</code> row, simply specify the target class name in the <code>Classes</code> column (e.g. <code>SE-ECCE</code>) and the instructor name in the <code>Teachers</code> column (e.g. <code>Prof. M. A. Mulay</code>). The system automatically links curriculum assignments, builds batch splits, and associates qualified faculty.
            </p>
          </div>
        </CardContent>
      </Card>

      {uploading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 flex items-center gap-4 border shadow-lg">
            <LoadingSpinner />
            <span className="text-foreground font-medium">Processing institutional master data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataUpload;