const fs = require("fs");
const path = require("path");
const pino = require("pino");

const colors = {
  trace: "\x1b[37m",
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  fatal: "\x1b[35m",
  reset: "\x1b[0m",
};

function prettyPrint(log) {
  const timestamp = new Date(log.time).toISOString();
  const color = colors[log.level] || colors.info;
  return `${timestamp} ${color}[${log.name}] ${log.level}: ${log.msg}${colors.reset}`;
}

const prettyStream = {
  write: (chunk) => {
    try {
      const log = JSON.parse(chunk);
      console.log(prettyPrint(log));
    } catch (err) {
      console.error("[LOGGER ERROR] Failed to parse log:", err);
    }
  },
};

function getCurrentDate() {
  return new Date().toISOString().split("T")[0];
}

const jsonlStream = (filePath) =>
  fs.createWriteStream(filePath, { flags: "a" });

function createLogger(moduleName, format = "plain" | "jsonl") {
  const logDir = "logs";

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const date = getCurrentDate();
  const fileExtension = format === "jsonl" ? "jsonl" : "log";
  const fileName = `${date}-${moduleName}.${fileExtension}`;
  const logFilePath = path.join(logDir, fileName);

  const logFileStream =
    format === "jsonl"
      ? jsonlStream(logFilePath)
      : fs.createWriteStream(logFilePath, { flags: "a" });

  const streams = [{ stream: prettyStream }, { stream: logFileStream }];

  const options = {
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    base: { name: moduleName },
  };

  return pino(options, pino.multistream(streams));
}

module.exports = {
  createLogger,
};
