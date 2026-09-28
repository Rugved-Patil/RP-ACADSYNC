// sharer.js — formats a timetable for WhatsApp / email sharing, ported from
// supabase/functions/share-timetable. Nothing here talks to any external
// service — it just builds text and a wa.me / mailto: link, which the
// browser opens locally. That behavior carries over unchanged.

const { getFullTimetable } = require("./exporter");
const { db } = require("../db");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function groupByDay(lessons) {
  return lessons.reduce((acc, lesson) => {
    (acc[lesson.day] = acc[lesson.day] || []).push(lesson);
    return acc;
  }, {});
}

function formatForWhatsApp(timetable) {
  let text = `📚 *${timetable.name}*\n📅 Academic Year: ${timetable.academic_year || ""}\n\n`;
  const byDay = groupByDay(timetable.lessons);
  DAYS.forEach((day, dayIndex) => {
    const lessons = (byDay[dayIndex] || []).sort((a, b) => a.slot_order - b.slot_order);
    if (lessons.length === 0) return;
    text += `*${day}*\n`;
    lessons.forEach((l) => {
      text += `⏰ ${l.slot_start} - ${l.slot_end}\n📖 ${l.subject_name} (${l.subject_code})\n👨‍🏫 ${l.teacher_name}\n🏫 ${l.class_name}\n`;
      if (l.classroom_name) text += `🚪 ${l.classroom_name}\n`;
      text += `\n`;
    });
    text += `\n`;
  });
  return text;
}

function formatForEmail(timetable) {
  let text = `Timetable: ${timetable.name}\nAcademic Year: ${timetable.academic_year || ""}\n\n`;
  const byDay = groupByDay(timetable.lessons);
  DAYS.forEach((day, dayIndex) => {
    const lessons = (byDay[dayIndex] || []).sort((a, b) => a.slot_order - b.slot_order);
    if (lessons.length === 0) return;
    text += `${day}\n${"=".repeat(day.length)}\n`;
    lessons.forEach((l) => {
      text += `${l.slot_start} - ${l.slot_end} | ${l.subject_name} (${l.subject_code}) | ${l.teacher_name} | ${l.class_name}`;
      if (l.classroom_name) text += ` | ${l.classroom_name}`;
      text += `\n`;
    });
    text += `\n`;
  });
  return text;
}

function shareTimetable(shareToken, format) {
  const row = db.prepare("SELECT id FROM timetables WHERE share_token = ?").get(shareToken);
  if (!row) return null;
  const timetable = getFullTimetable(row.id);

  if (format === "whatsapp") {
    const message = formatForWhatsApp(timetable);
    return { message, shareUrl: `https://wa.me/?text=${encodeURIComponent(message)}` };
  }
  if (format === "email") {
    const body = formatForEmail(timetable);
    return {
      subject: `Timetable: ${timetable.name}`,
      body,
      mailtoUrl: `mailto:?subject=${encodeURIComponent(`Timetable: ${timetable.name}`)}&body=${encodeURIComponent(body)}`,
    };
  }
  return timetable;
}

module.exports = { shareTimetable };
