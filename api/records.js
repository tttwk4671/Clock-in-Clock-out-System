const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const TABLE_NAME = "records";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Supabase 環境變數尚未設定：SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function handleGet(req, res) {
  const { person, type } = req.query;
  let query = supabase.from(TABLE_NAME).select("*").order("created_at", { ascending: false });

  if (person) {
    query = query.ilike("person", `%${person}%`);
  }
  if (type && (type === "in" || type === "out")) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
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

  const { data, error } = await supabase.from(TABLE_NAME).insert([
    { date, role, person, vehicle: vehicle || "", type, time },
  ]);

  if (error) {
    return res.status(500).json({ error: error.message });
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
