import React from "react";
import { Class } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClassColorLegendProps {
  classes: Class[];
}

export interface ClassColorEntry {
  colorClass: string;
  titleClass: string;
  subClass: string;
  metaClass: string;
  dotClass: string;
  name: string;
}

// Predefined high-contrast color mapping for classes (Light & Dark Theme adaptive)
const PALETTES = [
  {
    colorClass: "bg-rose-100/90 text-rose-950 border-rose-300 dark:bg-rose-950/60 dark:text-rose-100 dark:border-rose-700/60",
    titleClass: "text-rose-950 dark:text-rose-100 font-bold",
    subClass: "text-rose-900 dark:text-rose-200 font-semibold",
    metaClass: "text-rose-800/90 dark:text-rose-300/90",
    dotClass: "bg-rose-500",
  },
  {
    colorClass: "bg-sky-100/90 text-sky-950 border-sky-300 dark:bg-sky-950/60 dark:text-sky-100 dark:border-sky-700/60",
    titleClass: "text-sky-950 dark:text-sky-100 font-bold",
    subClass: "text-sky-900 dark:text-sky-200 font-semibold",
    metaClass: "text-sky-800/90 dark:text-sky-300/90",
    dotClass: "bg-sky-500",
  },
  {
    colorClass: "bg-emerald-100/90 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-700/60",
    titleClass: "text-emerald-950 dark:text-emerald-100 font-bold",
    subClass: "text-emerald-900 dark:text-emerald-200 font-semibold",
    metaClass: "text-emerald-800/90 dark:text-emerald-300/90",
    dotClass: "bg-emerald-500",
  },
  {
    colorClass: "bg-amber-100/90 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-700/60",
    titleClass: "text-amber-950 dark:text-amber-100 font-bold",
    subClass: "text-amber-900 dark:text-amber-200 font-semibold",
    metaClass: "text-amber-800/90 dark:text-amber-300/90",
    dotClass: "bg-amber-500",
  },
  {
    colorClass: "bg-purple-100/90 text-purple-950 border-purple-300 dark:bg-purple-950/60 dark:text-purple-100 dark:border-purple-700/60",
    titleClass: "text-purple-950 dark:text-purple-100 font-bold",
    subClass: "text-purple-900 dark:text-purple-200 font-semibold",
    metaClass: "text-purple-800/90 dark:text-purple-300/90",
    dotClass: "bg-purple-500",
  },
  {
    colorClass: "bg-fuchsia-100/90 text-fuchsia-950 border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-100 dark:border-fuchsia-700/60",
    titleClass: "text-fuchsia-950 dark:text-fuchsia-100 font-bold",
    subClass: "text-fuchsia-900 dark:text-fuchsia-200 font-semibold",
    metaClass: "text-fuchsia-800/90 dark:text-fuchsia-300/90",
    dotClass: "bg-fuchsia-500",
  },
  {
    colorClass: "bg-indigo-100/90 text-indigo-950 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-100 dark:border-indigo-700/60",
    titleClass: "text-indigo-950 dark:text-indigo-100 font-bold",
    subClass: "text-indigo-900 dark:text-indigo-200 font-semibold",
    metaClass: "text-indigo-800/90 dark:text-indigo-300/90",
    dotClass: "bg-indigo-500",
  },
  {
    colorClass: "bg-teal-100/90 text-teal-950 border-teal-300 dark:bg-teal-950/60 dark:text-teal-100 dark:border-teal-700/60",
    titleClass: "text-teal-950 dark:text-teal-100 font-bold",
    subClass: "text-teal-900 dark:text-teal-200 font-semibold",
    metaClass: "text-teal-800/90 dark:text-teal-300/90",
    dotClass: "bg-teal-500",
  },
  {
    colorClass: "bg-orange-100/90 text-orange-950 border-orange-300 dark:bg-orange-950/60 dark:text-orange-100 dark:border-orange-700/60",
    titleClass: "text-orange-950 dark:text-orange-100 font-bold",
    subClass: "text-orange-900 dark:text-orange-200 font-semibold",
    metaClass: "text-orange-800/90 dark:text-orange-300/90",
    dotClass: "bg-orange-500",
  },
  {
    colorClass: "bg-lime-100/90 text-lime-950 border-lime-300 dark:bg-lime-950/60 dark:text-lime-100 dark:border-lime-700/60",
    titleClass: "text-lime-950 dark:text-lime-100 font-bold",
    subClass: "text-lime-900 dark:text-lime-200 font-semibold",
    metaClass: "text-lime-800/90 dark:text-lime-300/90",
    dotClass: "bg-lime-500",
  },
  {
    colorClass: "bg-cyan-100/90 text-cyan-950 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-100 dark:border-cyan-700/60",
    titleClass: "text-cyan-950 dark:text-cyan-100 font-bold",
    subClass: "text-cyan-900 dark:text-cyan-200 font-semibold",
    metaClass: "text-cyan-800/90 dark:text-cyan-300/90",
    dotClass: "bg-cyan-500",
  },
  {
    colorClass: "bg-violet-100/90 text-violet-950 border-violet-300 dark:bg-violet-950/60 dark:text-violet-100 dark:border-violet-700/60",
    titleClass: "text-violet-950 dark:text-violet-100 font-bold",
    subClass: "text-violet-900 dark:text-violet-200 font-semibold",
    metaClass: "text-violet-800/90 dark:text-violet-300/90",
    dotClass: "bg-violet-500",
  },
];

const getClassColorMap = (classes: Class[]) => {
  return classes.reduce((acc, cls, index) => {
    const palette = PALETTES[index % PALETTES.length];
    acc[cls.id] = {
      ...palette,
      name: cls.name,
    };
    return acc;
  }, {} as Record<string, ClassColorEntry>);
};

export const ClassColorLegend: React.FC<ClassColorLegendProps> = ({ classes }) => {
  const colorMap = getClassColorMap(classes);

  return (
    <Card className="mb-4 border-border">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Class Color Legend
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Object.entries(colorMap).map(([classId, entry]) => (
            <div
              key={classId}
              className={`flex items-center gap-2 p-1.5 rounded-md border text-xs shadow-2xs ${entry.colorClass}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${entry.dotClass} shrink-0`} />
              <span className={`font-semibold truncate ${entry.titleClass}`}>{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Export the color mapping function for use in other components
export { getClassColorMap };