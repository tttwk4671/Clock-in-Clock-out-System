const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "records.json");

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function loadRecords() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

function saveRecords(records) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
}

app.get("/api/records", (req, res) => {
  const records = loadRecords();
  const { person, type } = req.query;
  let filtered = records;

  if (person) {
    const normalized = person.toLowerCase();
    filtered = filtered.filter((record) => record.person.toLowerCase().includes(normalized));
  }
  if (type && (type === "in" || type === "out")) {
    filtered = filtered.filter((record) => record.type === type);
  }

  res.json(filtered);
});

app.post("/api/records", (req, res) => {
  const { date, role, person, vehicle, type, time } = req.body;
  if (!date || !role || !person || !type || !time) {
    return res.status(400).json({ error: "缺少必要打卡資料" });
  }

  const records = loadRecords();
  const newRecord = { date, role, person, vehicle: vehicle || "", type, time };
  records.unshift(newRecord);
  saveRecords(records);
  res.status(201).json(newRecord);
});

app.delete("/api/records", (req, res) => {
  saveRecords([]);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
