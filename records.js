const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
const localEnvPath = path.resolve(rootDir, '.env.local');
const envPath = path.resolve(rootDir, '.env');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(localEnvPath);
loadEnvFile(envPath);

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const TABLE_NAME = "records";

function validateSupabaseEnv() {
  if (!SUPABASE_URL) return "SUPABASE_URL is missing.";
  if (!SUPABASE_KEY) return "SUPABASE_SERVICE_ROLE_KEY is missing.";
  return null;
}

const envError = validateSupabaseEnv();
const supabase = !envError ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null;

// 標準化的資料結構轉換
function formatRecordRow(row) {
  if (!row) return null;
  return {
    id: row.id !== undefined ? row.id : (row.Id !== undefined ? row.Id : (row.ID !== undefined ? row.ID : "")),
    date: row.date || row.Date || "",
    role: row.role || row.Role || "",
    person: row.person || row.Person || "",
    vehicle: row.vehicle || row.Vehicle || "",
    companion: row.companion || row.Companion || "", 
    remarks: row.remarks || row.Remarks || "",       
    type: row.type || row.Type || "",
    time: row.time || row.Time || "",
  };
}

async function handleGet(req, res) {
  const { person, type } = req.query;
  let query = supabase.from(TABLE_NAME).select("*").order("created_at", { ascending: false });

  if (person) query = query.ilike("person", `%${person}%`);
  if (type && (type === "in" || type === "out")) query = query.eq("type", type);

  const result = await query;
  if (result.error) return res.status(500).json({ error: result.error.message });

  return res.json((result.data || []).map(formatRecordRow).filter(Boolean));
}

async function handlePost(req, res) {
  const { date, role, person, vehicle, companion, remarks, type, time } = req.body;

  if (!date || !role || !person || !type || !time) {
    return res.status(400).json({ error: "缺少必要打卡資料" });
  }

  // 1. 建立明確的寫入物件（全小寫對齊您的資料庫）
  const insertData = { 
    date, 
    role, 
    person, 
    vehicle: vehicle || "", 
    companion: companion || "", 
    remarks: remarks || "", 
    type, 
    time 
  };

  console.log('準備寫入 Supabase:', insertData);

  // 2. ✨ 強制指定 select 返回所有特定欄位，克服快取與 schema 延遲更新問題
  const result = await supabase
    .from(TABLE_NAME)
    .insert([insertData])
    .select('id, date, role, person, vehicle, companion, remarks, type, time');

  if (result.error) {
    console.error('寫入失敗:', result.error.message);
    return res.status(500).json({ error: result.error.message });
  }

  const data = result.data;
  if (!data || data.length === 0) {
    return res.status(500).json({ error: "資料庫寫入成功但未回傳資料" });
  }

  console.log('資料庫回傳結果:', data[0]);
  
  // 3. ✨ 提取回傳陣列中的第一個物件進行格式轉換
  return res.status(201).json(formatRecordRow(data[0]));
}

async function handleDelete(req, res) {
  const recordId = req.query.id;
  if (recordId) {
    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", recordId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: `已刪除編號 ${recordId} 的紀錄` });
  } else {
    const { error } = await supabase.from(TABLE_NAME).delete().not("id", "eq", 0);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: "已清除所有打卡紀錄" });
  }
}

module.exports = async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Supabase 環境變數未設定" });
  try {
    if (req.method === "GET") return await handleGet(req, res);
    if (req.method === "POST") return await handlePost(req, res);
    if (req.method === "DELETE") return await handleDelete(req, res);
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
