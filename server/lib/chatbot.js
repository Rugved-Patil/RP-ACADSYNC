// chatbot.js — Node.js bridge to Python Gemini 3.6 Flash Assistant
const { spawn } = require("child_process");
const path = require("path");

function askChatbot({ message, history = [], apiKey = null }) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.resolve(__dirname, "../chatbot/assistant.py");
    
    // Spawn python3 process
    const py = spawn("python3", [pythonScript], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    let stdoutData = "";
    let stderrData = "";

    py.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    py.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    py.on("close", (code) => {
      if (code !== 0 && !stdoutData.trim()) {
        return resolve({
          error: `Chatbot process exited with code ${code}. ${stderrData.trim()}`,
          success: false,
        });
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err) {
        if (stdoutData.trim()) {
          resolve({ reply: stdoutData.trim(), success: true });
        } else {
          resolve({
            error: `Failed to parse chatbot response: ${err.message}. Stderr: ${stderrData}`,
            success: false,
          });
        }
      }
    });

    py.on("error", (err) => {
      resolve({
        error: `Failed to start Python assistant: ${err.message}`,
        success: false,
      });
    });

    // Send payload via stdin
    const payload = JSON.stringify({ message, history, apiKey });
    py.stdin.write(payload);
    py.stdin.end();
  });
}

module.exports = { askChatbot };
