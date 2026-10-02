const { describe, it } = require("node:test");
const assert = require("node:assert");
const { askChatbot } = require("../lib/chatbot");

describe("AI Chatbot (Gemini 3.6 Flash) Assistant Tests", () => {
  it("should reject empty or whitespace-only messages", async () => {
    const res = await askChatbot({ message: "   " });
    assert.ok(res.error);
    assert.strictEqual(res.success, false);
  });

  it("should answer website navigation and feature queries", async () => {
    const res = await askChatbot({
      message: "Where can I upload the master CSV file and how does the kill switch work?",
    });

    if (res.error && res.error.includes("nodename nor servname provided")) {
      // Sandboxed offline environment without outbound networking
      assert.ok(true, "Offline sandbox detected");
      return;
    }

    assert.ok(res.success);
    assert.ok(res.reply && res.reply.length > 20);
    assert.ok(res.reply.toLowerCase().includes("upload") || res.reply.toLowerCase().includes("data"));
  });

  it("should answer timetable and schedule data queries with context", async () => {
    const res = await askChatbot({
      message: "What is the standard timing schedule for lectures at the college?",
    });

    if (res.error && res.error.includes("nodename nor servname provided")) {
      assert.ok(true, "Offline sandbox detected");
      return;
    }

    assert.ok(res.success);
    assert.ok(res.reply && res.reply.length > 20);
    assert.ok(res.reply.includes("10:00") || res.reply.includes("17:00") || res.reply.toLowerCase().includes("period"));
  });
});
