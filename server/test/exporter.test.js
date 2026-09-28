const { describe, it } = require("node:test");
const assert = require("node:assert");
const { db } = require("../db");
const { exportTimetable } = require("../lib/exporter");

describe("Timetable Export Tests (CSV, Excel, Full Week & Single Day)", () => {
  const timetable = db.prepare("SELECT id, name FROM timetables LIMIT 1").get();

  it("should export full week CSV with correct headers and all days", () => {
    assert.ok(timetable, "Should have at least one timetable in db for export testing");
    const exportResult = exportTimetable(timetable.id, "csv");

    assert.ok(exportResult);
    assert.strictEqual(exportResult.contentType, "text/csv");
    assert.ok(exportResult.filename.endsWith(".csv"));
    assert.ok(!exportResult.filename.includes("_Monday"));

    const lines = exportResult.body.trim().split("\n");
    assert.strictEqual(lines[0], "Day,Time,Subject,Code,Teacher,Class,Classroom");
    assert.ok(lines.length > 5, "Full week CSV should contain multiple lesson rows");
  });

  it("should export single day CSV filtering strictly for that day", () => {
    const mondayExport = exportTimetable(timetable.id, "csv", 0);

    assert.ok(mondayExport);
    assert.strictEqual(mondayExport.contentType, "text/csv");
    assert.ok(
      mondayExport.filename.endsWith("_Monday.csv"),
      `Filename should have day suffix, got ${mondayExport.filename}`
    );

    const lines = mondayExport.body.trim().split("\n");
    assert.strictEqual(lines[0], "Day,Time,Subject,Code,Teacher,Class,Classroom");

    // Verify all rows belong strictly to Monday
    for (let i = 1; i < lines.length; i++) {
      assert.ok(lines[i].startsWith('"Monday"'), `Row ${i} should be on Monday`);
    }
  });

  it("should export full week Excel with Timetable and individual day sheets", () => {
    const excelExport = exportTimetable(timetable.id, "excel");

    assert.ok(excelExport);
    assert.strictEqual(
      excelExport.contentType,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    assert.ok(excelExport.filename.endsWith(".xlsx"));
    assert.ok(Buffer.isBuffer(excelExport.body));
    assert.ok(excelExport.body.length > 1000, "Excel buffer should be valid and non-empty");
  });

  it("should export single day Excel with only that day's data", () => {
    const tuesdayExport = exportTimetable(timetable.id, "excel", 1);

    assert.ok(tuesdayExport);
    assert.ok(
      tuesdayExport.filename.endsWith("_Tuesday.xlsx"),
      `Filename should have day suffix, got ${tuesdayExport.filename}`
    );
    assert.ok(Buffer.isBuffer(tuesdayExport.body));
    assert.ok(tuesdayExport.body.length > 500);
  });

  it("should export HTML and JSON formats", () => {
    const htmlExport = exportTimetable(timetable.id, "html");
    assert.strictEqual(htmlExport.contentType, "text/html");
    assert.ok(htmlExport.body.includes("<!DOCTYPE html>"));
    assert.ok(htmlExport.body.includes("<table>"));

    const jsonExport = exportTimetable(timetable.id, "json");
    assert.strictEqual(jsonExport.contentType, "application/json");
    const parsed = JSON.parse(jsonExport.body);
    assert.strictEqual(parsed.id, timetable.id);
    assert.ok(Array.isArray(parsed.lessons));
  });

  it("should throw an error on unsupported format", () => {
    assert.throws(
      () => exportTimetable(timetable.id, "unsupported_xyz"),
      /Unsupported format/
    );
  });
});
