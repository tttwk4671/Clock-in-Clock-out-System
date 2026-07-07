const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
const localEnvPath = path.resolve(rootDir, '.env.local');
const envPath = path.resolve(rootDir, '.env');

console.log('records.js rootDir=', rootDir);
console.log('records.js localEnvPath=', localEnvPath);
console.log('records.js envPath=', envPath);
console.log('.env.local exists=', fs.existsSync(localEnvPath));
console.log('.env exists=', fs.existsSync(envPath));
console.log('.env.local content start----');
if (fs.existsSync(localEnvPath)) console.log(fs.readFileSync(localEnvPath, 'utf8'));
console.log('.env.local content end----');

const localResult = dotenv.config({ path: localEnvPath });
console.log('dotenv localResult=', localResult);
const envResult = dotenv.config({ path: envPath });
console.log('dotenv envResult=', envResult);
console.log('after dotenv load SUPABASE_URL=', JSON.stringify(process.env.SUPABASE_URL));
console.log('after dotenv load SUPABASE_KEY=', JSON.stringify(process.env.SUPABASE_SERVICE_ROLE_KEY));

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
  if (!SUPABASE_URL) {
    return "SUPABASE_URL is missing.";
  }
  if (!SUPABASE_KEY) {
    return "SUPABASE_SERVICE_ROLE_KEY is missing.";
  }
  if (SUPABASE_URL.includes("/rest/v1")) {
    return "SUPABASE_URL should be the base project URL, not the REST API URL (remove /rest/v1).";
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL)) {
    return "SUPABASE_URL looks invalid. Use the base URL like https://xxxxxx.supabase.co.";
  }
  if (/^https?:\/\//.test(SUPABASE_KEY)) {
    return "SUPABASE_SERVICE_ROLE_KEY looks like a URL. Use the service_role secret key, not the URL.";
  }
  return null;
}

const envError = validateSupabaseEnv();
if (envError) {
  console.error("Supabase 環境變數錯誤：", envError, {
    SUPABASE_URL,
    SUPABASE_KEY: SUPABASE_KEY ? `${SUPABASE_KEY.slice(0, 10)}...` : undefined,
  });
}

const supabase = !envError
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    })
  : null;

async function handleGet(req, res) {
  const { person, type } = req.query;
  let query = supabase.from(TABLE_NAME).select("*").order("created_at", { ascending: false });

  if (person) {
    query = query.ilike("person", `%${person}%`);
  }
  if (type && (type === "in" || type === "out")) {
    query = query.eq("type", type);
  }

  const result = await query;
  const data = result.data || [];
  const error = result.error;
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data.map((row) => ({
    date: row.date,
    role: row.role,
    person: row.person,
    vehicle: row.vehicle || "",
    type: row.type,
    time: row.time,
  })));
}

async function handlePost(req, res) {
  const { date, role, person, vehicle, type, time } = req.body;

  if (!date || !role || !person || !type || !time) {
    return res.status(400).json({ error: "缺少必要打卡資料" });
  }

  const result = await supabase.from(TABLE_NAME).insert([
    { date, role, person, vehicle: vehicle || "", type, time },
  ]);

  const data = result.data;
  const error = result.error;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data || data.length === 0) {
    return res.status(500).json({ error: "Insert returned no data" });
  }

  return res.status(201).json(data[0]);
}

async function handleDelete(req, res) {
  const { error } = await supabase.from(TABLE_NAME).delete().not("id", "eq", 0);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.json({ success: true });
}

module.exports = async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Supabase 環境變數未設定" });
  }

  try {
    // Debug endpoint: /api/records?debug=1 -> test connectivity to SUPABASE_URL
    if (req.query && req.query.debug === '1') {
      try {
        const urlObj = new URL(SUPABASE_URL);
        const dns = require('dns').promises;
        let dnsInfo;
        try {
          dnsInfo = await dns.lookup(urlObj.hostname);
        } catch (dnsErr) {
          dnsInfo = { error: dnsErr.message };
        }

        try {
          const healthUrl = `${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/health`;
          const pingRes = await fetch(healthUrl, { method: 'GET' });
          const text = await (pingRes.text().catch(() => ''));
          return res.status(200).json({ ok: true, status: pingRes.status, healthUrl, host: urlObj.hostname, dns: dnsInfo, bodyPreview: text.slice(0, 200) });
        } catch (e) {
          return res.status(500).json({ error: 'Supabase connectivity test failed', message: e.message, stack: e.stack ? e.stack.split('\n').slice(0,5) : undefined, host: urlObj.hostname, dns: dnsInfo });
        }
      } catch (e) {
        return res.status(500).json({ error: 'Debug failed', message: e.message, stack: e.stack ? e.stack.split('\n').slice(0,5) : undefined });
      }
    }
    if (req.method === "GET") {
      return await handleGet(req, res);
    }
    if (req.method === "POST") {
      return await handlePost(req, res);
    }
    if (req.method === "DELETE") {
      return await handleDelete(req, res);
    }
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
