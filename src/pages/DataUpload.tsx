import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, FileText, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/lib/api";

const DataUpload = () => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleFileUpload = async (file: File, dataType: string) => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(prev => ({ ...prev, [dataType]: 0 }));

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:mime/type;base64, prefix
        };
        reader.readAsDataURL(file);
      });

      setUploadProgress(prev => ({ ...prev, [dataType]: 30 }));

      // Call the data import edge function
      const { data, error } = await supabase.functions.invoke('import-data', {
        body: {
          file: base64,
          fileName: file.name,
          dataType: dataType,
          mimeType: file.type
        }
      });

      if (error) throw error;

      setUploadProgress(prev => ({ ...prev, [dataType]: 100 }));

      toast({
        title: "Success",
        description: `${dataType} data imported successfully. ${data.summary || ''}`,
      });

      // Reset progress after success
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, [dataType]: 0 }));
      }, 2000);

    } catch (error: any) {
      console.error(`Error uploading ${dataType} file:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to import ${dataType} data`,
        variant: "destructive",
      });
      setUploadProgress(prev => ({ ...prev, [dataType]: 0 }));
    } finally {
      setUploading(false);
    }
  };

  const uploadSections = [
    {
      id: "classes",
      title: "Classes",
      description: "Upload class information (Year, Section, Students, etc.)",
      icon: <Database className="h-8 w-8 text-blue-500" />,
      acceptedFormats: ".xlsx,.xls,.csv",
      sampleFields: ["Class Name", "Year", "Section", "Student Count", "Academic Year"]
    },
    {
      id: "teachers",
      title: "Teachers",
      description: "Upload teacher information and their subjects",
      icon: <FileText className="h-8 w-8 text-green-500" />,
      acceptedFormats: ".xlsx,.xls,.csv",
      sampleFields: ["Teacher Name", "Email", "Phone", "Specialization", "Subjects", "Experience"]
    },
    {
      id: "subjects",
      title: "Subjects",
      description: "Upload subject details and class assignments",
      icon: <FileSpreadsheet className="h-8 w-8 text-purple-500" />,
      acceptedFormats: ".xlsx,.xls,.csv",
      sampleFields: ["Subject Name", "Subject Code", "Periods per Week", "Is Lab", "Classes", "Credits"]
    },
    {
      id: "classrooms",
      title: "Classrooms",
      description: "Upload classroom information and capacities",
      icon: <Database className="h-8 w-8 text-orange-500" />,
      acceptedFormats: ".xlsx,.xls,.csv",
      sampleFields: ["Classroom Name", "Capacity", "Type", "Is Lab", "Equipment", "Location"]
    },
    {
      id: "timings",
      title: "Timings",
      description: "Upload time slots and schedule configurations",
      icon: <FileText className="h-8 w-8 text-red-500" />,
      acceptedFormats: ".xlsx,.xls,.csv",
      sampleFields: ["Period Name", "Start Time", "End Time", "Duration", "Is Break", "Working Days"]
    }
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Data Upload" 
        description="Import your institution's data from Excel or CSV files"
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Data Import
            </CardTitle>
            <CardDescription>
              Upload your data files to automatically populate all system tables. 
              Supported formats: Excel (.xlsx, .xls) and CSV (.csv).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {uploadSections.map((section) => (
                <Card key={section.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      {section.icon}
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {section.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Expected Fields (sample):
                        </label>
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          {section.sampleFields.join(", ")}
                        </div>
                      </div>
                      
                      <div>
                        <Input
                          type="file"
                          accept={section.acceptedFormats}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, section.id);
                              e.target.value = ""; // Reset input
                            }
                          }}
                          disabled={uploading}
                          className="cursor-pointer"
                        />
                      </div>
                      
                      {uploadProgress[section.id] > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Uploading...</span>
                            <span>{uploadProgress[section.id]}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[section.id]}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sample Data & Testing</CardTitle>
            <CardDescription>
              Use these sample CSV formats to test the upload functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Quick Test - Classes CSV:</h4>
                <div className="text-xs bg-gray-50 p-3 rounded font-mono">
                  Class Name,Year,Section,Student Count<br/>
                  10-A,Grade 10,A,30<br/>
                  10-B,Grade 10,B,32<br/>
                  11-A,Grade 11,A,28<br/>
                  12-A,Grade 12,A,25
                </div>
                <p className="text-xs text-gray-600 mt-2">Copy this into a .csv file to test class upload</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Quick Test - Subjects CSV:</h4>
                <div className="text-xs bg-gray-50 p-3 rounded font-mono">
                  Subject Name,Subject Code,Periods per Week,Is Lab<br/>
                  Mathematics,MATH001,5,No<br/>
                  Physics,PHY001,4,No<br/>
                  Chemistry Lab,CHEM001,2,Yes<br/>
                  English,ENG001,4,No
                </div>
                <p className="text-xs text-gray-600 mt-2">Copy this into a .csv file to test subject upload</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Quick Test - Teachers CSV:</h4>
                <div className="text-xs bg-gray-50 p-3 rounded font-mono">
                  Teacher Name,Email,Specialization,Phone<br/>
                  John Smith,john@school.edu,Mathematics,555-0101<br/>
                  Sarah Johnson,sarah@school.edu,Physics,555-0102<br/>
                  Mike Wilson,mike@school.edu,Chemistry,555-0103<br/>
                  Lisa Brown,lisa@school.edu,English,555-0104
                </div>
                <p className="text-xs text-gray-600 mt-2">Copy this into a .csv file to test teacher upload</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Quick Test - Classrooms CSV:</h4>
                <div className="text-xs bg-gray-50 p-3 rounded font-mono">
                  Classroom Name,Capacity,Is Lab,Location<br/>
                  Room 101,35,No,Building A<br/>
                  Room 102,35,No,Building A<br/>
                  Chemistry Lab,25,Yes,Building B<br/>
                  Physics Lab,25,Yes,Building B
                </div>
                <p className="text-xs text-gray-600 mt-2">Copy this into a .csv file to test classroom upload</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Quick Test - Timings CSV:</h4>
                <div className="text-xs bg-gray-50 p-3 rounded font-mono">
                  Period Name,Start Time,End Time,Is Break<br/>
                  Period 1,09:00,09:45,No<br/>
                  Period 2,09:45,10:30,No<br/>
                  Break,10:30,10:45,Yes<br/>
                  Period 3,10:45,11:30,No<br/>
                  Period 4,11:30,12:15,No
                </div>
                <p className="text-xs text-gray-600 mt-2">Copy this into a .csv file to test timing upload</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Complete Flow:</h4>
                <ol className="text-sm space-y-1 text-gray-600">
                  <li>1. Upload Classes first</li>
                  <li>2. Upload Subjects</li>
                  <li>3. Upload Teachers</li>
                  <li>4. Upload Classrooms</li>
                  <li>5. Upload Timings</li>
                  <li>6. Go to Timetables page</li>
                  <li>7. Click "Generate Timetable"</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Guidelines</CardTitle>
            <CardDescription>
              Please follow these guidelines for successful data import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">File Format Requirements:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Excel files: .xlsx or .xls format</li>
                  <li>• CSV files: Comma-separated values</li>
                  <li>• First row should contain column headers</li>
                  <li>• Maximum file size: 10MB</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Data Guidelines:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Ensure data is clean and consistent</li>
                  <li>• Use standard date formats (DD/MM/YYYY)</li>
                  <li>• Time formats: HH:MM (24-hour)</li>
                  <li>• Boolean values: Yes/No or True/False</li>
                  <li>• Avoid special characters in names</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {uploading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 flex items-center gap-4 border shadow-lg">
            <LoadingSpinner />
            <span className="text-foreground">Processing your data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataUpload;