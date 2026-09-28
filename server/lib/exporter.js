// exporter.js — timetable download/export for ACADSYNC.
//
// Implements Section 6.6 of Scope Document:
// Supports CSV and Excel export for both the full week and a single day.
// Also supports PDF, HTML, and JSON formats.

const { jsPDF } = require("jspdf");
const XLSX = require("xlsx");
const { db } = require("../db");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getFullTimetable(timetableId) {
  const timetable = db.prepare("SELECT * FROM timetables WHERE id = ?").get(timetableId);
  if (!timetable) return null;

  const lessons = db
    .prepare(
      `SELECT
         lessons.*,
         classes.name AS class_name,
         subjects.name AS subject_name, subjects.code AS subject_code,
         teachers.name AS teacher_name,
         classrooms.name AS classroom_name,
         time_slots.start_time AS slot_start, time_slots.end_time AS slot_end, time_slots.slot_order AS slot_order
       FROM lessons
       LEFT JOIN classes ON classes.id = lessons.class_id
       LEFT JOIN subjects ON subjects.id = lessons.subject_id
       LEFT JOIN teachers ON teachers.id = lessons.teacher_id
       LEFT JOIN classrooms ON classrooms.id = lessons.classroom_id
       LEFT JOIN time_slots ON time_slots.id = lessons.time_slot_id
       WHERE lessons.timetable_id = ?`
    )
    .all(timetableId);

  return { ...timetable, lessons };
}

function groupByDay(lessons) {
  return lessons.reduce((acc, lesson) => {
    (acc[lesson.day] = acc[lesson.day] || []).push(lesson);
    return acc;
  }, {});
}

function parseDayIndex(dayParam) {
  if (dayParam === undefined || dayParam === null || dayParam === "" || dayParam === "all") {
    return null; // full week
  }
  const num = parseInt(dayParam, 10);
  if (!isNaN(num) && num >= 0 && num < DAYS.length) return num;
  const idx = DAYS.findIndex((d) => d.toLowerCase() === String(dayParam).toLowerCase());
  return idx !== -1 ? idx : null;
}

function toCSV(timetable, targetDayIndices) {
  let csv = "Day,Time,Subject,Code,Teacher,Class,Classroom\n";
  const byDay = groupByDay(timetable.lessons);
  targetDayIndices.forEach((dayIndex) => {
    const dayName = DAYS[dayIndex];
    (byDay[dayIndex] || [])
      .sort((a, b) => a.slot_order - b.slot_order)
      .forEach((l) => {
        const row = [
          dayName,
          `${l.slot_start} - ${l.slot_end}`,
          l.subject_name,
          l.subject_code,
          l.teacher_name,
          l.class_name,
          l.classroom_name || "TBA",
        ].map((f) => `"${f ?? ""}"`).join(",");
        csv += row + "\n";
      });
  });
  return csv;
}

function toHTML(timetable, targetDayIndices) {
  const byDay = groupByDay(timetable.lessons);
  let rows = "";
  targetDayIndices.forEach((dayIndex) => {
    const dayName = DAYS[dayIndex];
    (byDay[dayIndex] || [])
      .sort((a, b) => a.slot_order - b.slot_order)
      .forEach((l) => {
        rows += `<tr><td>${dayName}</td><td>${l.slot_start} - ${l.slot_end}</td><td>${l.subject_name} (${l.subject_code})</td><td>${l.teacher_name}</td><td>${l.class_name}</td><td>${l.classroom_name || "TBA"}</td></tr>`;
      });
  });

  return `<!DOCTYPE html>
<html>
<head>
  <title>${timetable.name} - Timetable</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${timetable.name}</h1>
    <p>Academic Year: ${timetable.academic_year || ""}</p>
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
  </div>
  <table>
    <thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Class</th><th>Classroom</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function toPDF(timetable, targetDayIndices) {
  const doc = new jsPDF();
  const byDay = groupByDay(timetable.lessons);

  doc.setFontSize(20);
  doc.text(timetable.name, 20, 20);
  doc.setFontSize(12);
  doc.text(`Academic Year: ${timetable.academic_year || ""}`, 20, 35);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);

  let y = 65;
  targetDayIndices.forEach((dayIndex) => {
    const dayName = DAYS[dayIndex];
    const dayLessons = (byDay[dayIndex] || []).sort((a, b) => a.slot_order - b.slot_order);
    if (dayLessons.length === 0) return;

    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(dayName, 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");

    dayLessons.forEach((l) => {
      doc.text(`${l.slot_start} - ${l.slot_end}: ${l.subject_name} (${l.subject_code})`, 25, y);
      y += 7;
      doc.text(`Teacher: ${l.teacher_name} | Class: ${l.class_name} | Room: ${l.classroom_name || "TBA"}`, 30, y);
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    y += 10;
  });

  return Buffer.from(doc.output("arraybuffer"));
}

function toExcel(timetable, targetDayIndices) {
  const byDay = groupByDay(timetable.lessons);
  const wb = XLSX.utils.book_new();

  const header = ["Day", "Time", "Subject", "Code", "Teacher", "Class", "Classroom"];
  const allRows = [header];
  targetDayIndices.forEach((dayIndex) => {
    const dayName = DAYS[dayIndex];
    (byDay[dayIndex] || [])
      .sort((a, b) => a.slot_order - b.slot_order)
      .forEach((l) => {
        allRows.push([dayName, `${l.slot_start} - ${l.slot_end}`, l.subject_name, l.subject_code, l.teacher_name, l.class_name, l.classroom_name || "TBA"]);
      });
  });
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, ws, "Timetable");

  targetDayIndices.forEach((dayIndex) => {
    const dayName = DAYS[dayIndex];
    const dayLessons = (byDay[dayIndex] || []).sort((a, b) => a.slot_order - b.slot_order);
    if (dayLessons.length === 0) return;
    const dayRows = [["Time", "Subject", "Code", "Teacher", "Class", "Classroom"]];
    dayLessons.forEach((l) => {
      dayRows.push([`${l.slot_start} - ${l.slot_end}`, l.subject_name, l.subject_code, l.teacher_name, l.class_name, l.classroom_name || "TBA"]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dayRows), dayName);
  });

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function exportTimetable(timetableId, format, dayParam) {
  const timetable = getFullTimetable(timetableId);
  if (!timetable) return null;

  const dayIndex = parseDayIndex(dayParam);
  const isSingleDay = dayIndex !== null;
  const targetDayIndices = isSingleDay ? [dayIndex] : [0, 1, 2, 3, 4, 5];

  const safeName = (timetable.name || "timetable").replace(/[^a-zA-Z0-9]/g, "_");
  const daySuffix = isSingleDay ? `_${DAYS[dayIndex]}` : "";

  switch (format) {
    case "csv":
      return { contentType: "text/csv", filename: `${safeName}${daySuffix}.csv`, body: toCSV(timetable, targetDayIndices) };
    case "json":
      return {
        contentType: "application/json",
        filename: `${safeName}${daySuffix}.json`,
        body: JSON.stringify(
          isSingleDay
            ? { ...timetable, lessons: timetable.lessons.filter((l) => l.day === dayIndex) }
            : timetable,
          null,
          2
        ),
      };
    case "html":
      return { contentType: "text/html", filename: `${safeName}${daySuffix}.html`, body: toHTML(timetable, targetDayIndices) };
    case "pdf":
      return { contentType: "application/pdf", filename: `${safeName}${daySuffix}.pdf`, body: toPDF(timetable, targetDayIndices) };
    case "excel":
      return {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `${safeName}${daySuffix}.xlsx`,
        body: toExcel(timetable, targetDayIndices),
      };
    default:
      throw new Error(`Unsupported format "${format}"`);
  }
}

module.exports = { exportTimetable, getFullTimetable, DAYS };
