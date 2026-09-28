// exporter.js — timetable download/export for ACADSYNC.
//
// Implements Section 6.6 of Scope Document:
// Supports CSV and Excel export for both the full week and a single day.
// Also supports PDF, HTML, and JSON formats.

const { jsPDF } = require("jspdf");
const XLSX = require("xlsx");
const { db } = require("../db");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getFullTimetable(timetableId, filter = {}) {
  const timetable = db.prepare("SELECT * FROM timetables WHERE id = ?").get(timetableId);
  if (!timetable) return null;

  let sql = `SELECT
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
       WHERE lessons.timetable_id = ?`;
  const params = [timetableId];

  if (filter.teacher_id) {
    sql += " AND lessons.teacher_id = ?";
    params.push(filter.teacher_id);
  }
  if (filter.class_id) {
    sql += " AND lessons.class_id = ?";
    params.push(filter.class_id);
  }

  const lessons = db.prepare(sql).all(...params);

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

function getOrderedTimeSlots(timetable) {
  let slots = [];
  if (timetable.timing_id) {
    slots = db
      .prepare("SELECT * FROM time_slots WHERE timing_id = ? AND is_break = 0 ORDER BY slot_order ASC")
      .all(timetable.timing_id);
  }
  if (!slots || slots.length === 0) {
    const seen = new Map();
    for (const l of timetable.lessons || []) {
      const key = `${l.slot_start}-${l.slot_end}`;
      if (!seen.has(key)) {
        seen.set(key, {
          slot_start: l.slot_start,
          slot_end: l.slot_end,
          slot_order: l.slot_order || 0,
        });
      }
    }
    slots = Array.from(seen.values()).sort((a, b) => a.slot_order - b.slot_order);
  }
  return slots;
}

function toHTML(timetable, targetDayIndices) {
  const timeSlots = getOrderedTimeSlots(timetable);
  const byDay = groupByDay(timetable.lessons);

  // 1. Timetable Matrix Grid (Sideways = Days, Vertical = Time Slots)
  let gridTableHtml = `
    <table class="timetable-grid">
      <thead>
        <tr>
          <th style="width: 130px;">Time Slot</th>
          ${targetDayIndices.map((d) => `<th>${DAYS[d]}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  for (const slot of timeSlots) {
    const slotLabel = `${slot.start_time || slot.slot_start} - ${slot.end_time || slot.slot_end}`;
    gridTableHtml += `<tr><td class="time-header"><strong>${slotLabel}</strong></td>`;

    for (const dayIndex of targetDayIndices) {
      const lessonsInSlot = (timetable.lessons || []).filter(
        (l) =>
          l.day === dayIndex &&
          (l.slot_order === slot.slot_order ||
            (l.slot_start === (slot.start_time || slot.slot_start) &&
              l.slot_end === (slot.end_time || slot.slot_end)))
      );

      if (lessonsInSlot.length === 0) {
        gridTableHtml += `<td class="empty-cell">—</td>`;
      } else {
        const cellContent = lessonsInSlot
          .map(
            (l) => `
            <div class="lesson-card">
              <div class="subject-title">${l.subject_name} <span class="subject-code">${l.subject_code}</span></div>
              <div class="teacher-name">${l.teacher_name}</div>
              <div class="meta-row"><strong>${l.class_name}</strong> &bull; ${l.classroom_name || "TBA"}</div>
            </div>
          `
          )
          .join("");
        gridTableHtml += `<td>${cellContent}</td>`;
      }
    }
    gridTableHtml += `</tr>`;
  }
  gridTableHtml += `</tbody></table>`;

  // 2. Tabular list for detailed record inspection
  let listRows = "";
  targetDayIndices.forEach((dayIndex) => {
    const dayName = DAYS[dayIndex];
    (byDay[dayIndex] || [])
      .sort((a, b) => a.slot_order - b.slot_order)
      .forEach((l) => {
        listRows += `<tr><td>${dayName}</td><td>${l.slot_start} - ${l.slot_end}</td><td>${l.subject_name} (${l.subject_code})</td><td>${l.teacher_name}</td><td>${l.class_name}</td><td>${l.classroom_name || "TBA"}</td></tr>`;
      });
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${timetable.name} - Timetable Grid</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 24px; color: #1e293b; background: #f8fafc; }
    .header { text-align: center; margin-bottom: 24px; background: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; }
    h1 { margin: 0 0 8px 0; color: #0f172a; }
    .meta { color: #64748b; font-size: 14px; margin: 4px 0; }
    .section-title { font-size: 18px; font-weight: 700; margin: 24px 0 12px 0; color: #334155; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 32px; }
    th { background: #4f46e5; color: white; padding: 12px 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #4338ca; }
    td { border: 1px solid #e2e8f0; padding: 8px; vertical-align: top; font-size: 12px; }
    .time-header { background: #f1f5f9; text-align: center; font-size: 12px; color: #475569; width: 120px; }
    .empty-cell { text-align: center; color: #94a3b8; }
    .lesson-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 6px; margin-bottom: 4px; }
    .subject-title { font-weight: 600; color: #166534; font-size: 12px; }
    .subject-code { background: #dcfce7; padding: 1px 4px; border-radius: 3px; font-size: 10px; }
    .teacher-name { color: #334155; margin-top: 2px; }
    .meta-row { color: #64748b; font-size: 11px; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${timetable.name}</h1>
    <p class="meta"><strong>Academic Year:</strong> ${timetable.academic_year || "2026-2027"}</p>
    <p class="meta"><strong>Format:</strong> Weekly Timetable Grid (Days Horizontal &bull; Time Slots Vertical)</p>
    <p class="meta">Generated on ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="section-title">📅 Master Timetable Matrix (Days Horizontal &bull; Time Slots Vertical)</div>
  ${gridTableHtml}

  <div class="section-title">📋 All Scheduled Lessons List</div>
  <table>
    <thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Class</th><th>Classroom</th></tr></thead>
    <tbody>${listRows}</tbody>
  </table>
</body>
</html>`;
}

function toPDF(timetable, targetDayIndices) {
  const doc = new jsPDF("landscape");
  const timeSlots = getOrderedTimeSlots(timetable);

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(timetable.name, 14, 15);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Academic Year: ${timetable.academic_year || "2026-2027"} | Weekly Timetable Matrix (Days Horizontal / Time Slots Vertical)`, 14, 22);

  const colWidth = 38;
  const startX = 14;
  let startY = 28;

  // Header row (Days Horizontal / Sideways)
  doc.setFillColor(79, 70, 229);
  doc.rect(startX, startY, 32 + targetDayIndices.length * colWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "bold");
  doc.text("Time", startX + 3, startY + 5.5);

  targetDayIndices.forEach((d, idx) => {
    doc.text(DAYS[d], startX + 32 + idx * colWidth + 3, startY + 5.5);
  });

  startY += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "normal");

  for (const slot of timeSlots) {
    const slotLabel = `${slot.start_time || slot.slot_start}-${slot.end_time || slot.slot_end}`;
    const rowHeight = 22;

    if (startY + rowHeight > 195) {
      doc.addPage("landscape");
      startY = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(startX, startY, 32, rowHeight, "F");
    doc.rect(startX, startY, 32, rowHeight, "S");
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text(slotLabel, startX + 2, startY + 11);

    targetDayIndices.forEach((dayIndex, idx) => {
      const cellX = startX + 32 + idx * colWidth;
      doc.rect(cellX, startY, colWidth, rowHeight, "S");

      const lessonsInSlot = (timetable.lessons || []).filter(
        (l) =>
          l.day === dayIndex &&
          (l.slot_order === slot.slot_order ||
            (l.slot_start === (slot.start_time || slot.slot_start) &&
              l.slot_end === (slot.end_time || slot.slot_end)))
      );

      if (lessonsInSlot.length > 0) {
        const l = lessonsInSlot[0];
        doc.setFontSize(7.5);
        doc.setFont(undefined, "bold");
        doc.text(`${l.subject_code}: ${l.subject_name.slice(0, 18)}`, cellX + 1.5, startY + 5);
        doc.setFontSize(7);
        doc.setFont(undefined, "normal");
        doc.text(`${l.class_name} | ${l.teacher_name.slice(0, 16)}`, cellX + 1.5, startY + 10);
        doc.text(`Room: ${l.classroom_name || "TBA"}`, cellX + 1.5, startY + 14);
        if (lessonsInSlot.length > 1) {
          doc.text(`+${lessonsInSlot.length - 1} more`, cellX + 1.5, startY + 18);
        }
      } else {
        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.text("—", cellX + colWidth / 2 - 2, startY + 11);
      }
    });

    startY += rowHeight;
  }

  return Buffer.from(doc.output("arraybuffer"));
}

function toExcel(timetable, targetDayIndices) {
  const wb = XLSX.utils.book_new();
  const timeSlots = getOrderedTimeSlots(timetable);

  // 1. PRIMARY SHEET: Weekly Timetable Grid (Days Horizontal across columns, Time Slots Vertical down rows)
  const gridHeaders = ["Time Slot", ...targetDayIndices.map((d) => DAYS[d])];
  const gridRows = [gridHeaders];

  for (const slot of timeSlots) {
    const slotLabel = `${slot.start_time || slot.slot_start} - ${slot.end_time || slot.slot_end}`;
    const row = [slotLabel];

    for (const dayIndex of targetDayIndices) {
      const lessonsInSlot = (timetable.lessons || []).filter(
        (l) =>
          l.day === dayIndex &&
          (l.slot_order === slot.slot_order ||
            (l.slot_start === (slot.start_time || slot.slot_start) &&
              l.slot_end === (slot.end_time || slot.slot_end)))
      );

      if (lessonsInSlot.length === 0) {
        row.push("-");
      } else {
        const text = lessonsInSlot
          .map((l) => `${l.subject_code}: ${l.subject_name} (${l.class_name} | ${l.teacher_name} | ${l.classroom_name || "TBA"})`)
          .join("\n");
        row.push(text);
      }
    }
    gridRows.push(row);
  }

  const wsGrid = XLSX.utils.aoa_to_sheet(gridRows);
  XLSX.utils.book_append_sheet(wb, wsGrid, "Timetable Grid");

  // 2. Individual Class Matrix Sheets
  const distinctClasses = [...new Set((timetable.lessons || []).map((l) => l.class_name).filter(Boolean))];
  for (const cName of distinctClasses.slice(0, 10)) {
    const classRows = [["Time Slot", ...targetDayIndices.map((d) => DAYS[d])]];
    for (const slot of timeSlots) {
      const slotLabel = `${slot.start_time || slot.slot_start} - ${slot.end_time || slot.slot_end}`;
      const row = [slotLabel];
      for (const dayIndex of targetDayIndices) {
        const l = (timetable.lessons || []).find(
          (item) =>
            item.class_name === cName &&
            item.day === dayIndex &&
            (item.slot_order === slot.slot_order ||
              (item.slot_start === (slot.start_time || slot.slot_start) &&
                item.slot_end === (slot.end_time || slot.slot_end)))
        );
        if (l) {
          row.push(`${l.subject_name} (${l.subject_code})\n${l.teacher_name}\nRoom: ${l.classroom_name || "TBA"}`);
        } else {
          row.push("-");
        }
      }
      classRows.push(row);
    }
    const safeSheetName = `${cName.slice(0, 25)} Grid`;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(classRows), safeSheetName);
  }

  // 3. Tabular List Sheet ("Timetable")
  const byDay = groupByDay(timetable.lessons);
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

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function exportTimetable(timetableId, format, dayParam, filter = {}) {
  const timetable = getFullTimetable(timetableId, filter);
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
