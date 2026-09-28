import React from "react";
import { Class } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClassColorLegendProps {
  classes: Class[];
}

// Predefined color mapping for classes
const getClassColorMap = (classes: Class[]) => {
  const colorClasses = [
    "bg-red-100 border-red-200 text-red-800",
    "bg-blue-100 border-blue-200 text-blue-800", 
    "bg-green-100 border-green-200 text-green-800",
    "bg-yellow-100 border-yellow-200 text-yellow-800",
    "bg-purple-100 border-purple-200 text-purple-800",
    "bg-pink-100 border-pink-200 text-pink-800",
    "bg-indigo-100 border-indigo-200 text-indigo-800",
    "bg-orange-100 border-orange-200 text-orange-800",
    "bg-teal-100 border-teal-200 text-teal-800",
    "bg-cyan-100 border-cyan-200 text-cyan-800",
    "bg-emerald-100 border-emerald-200 text-emerald-800",
    "bg-violet-100 border-violet-200 text-violet-800",
  ];

  return classes.reduce((acc, cls, index) => {
    acc[cls.id] = {
      colorClass: colorClasses[index % colorClasses.length],
      name: cls.name
    };
    return acc;
  }, {} as Record<string, { colorClass: string; name: string }>);
};

export const ClassColorLegend: React.FC<ClassColorLegendProps> = ({ classes }) => {
  const colorMap = getClassColorMap(classes);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Class Color Legend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(colorMap).map(([classId, { colorClass, name }]) => (
            <div
              key={classId}
              className={`flex items-center gap-2 p-2 rounded border text-xs ${colorClass}`}
            >
              <div className={`w-3 h-3 rounded-full bg-current opacity-60`}></div>
              <span className="font-medium">{name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Export the color mapping function for use in other components
export { getClassColorMap };