// ==========================================
// 1. 初始化 Supabase 連線 (請替換成您的資訊)
// ==========================================
const SUPABASE_URL = "貼上您的 Project URL";
const SUPABASE_KEY = "貼上您的 anon public key";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. 畫面元素選取
// ==========================================
const roleSelect = document.getElementById("roleSelect");
const personSelect = document.getElementById("personSelect");
const clockInButton = document.getElementById("clockInButton");
const clockOutButton = document.getElementById("clockOutButton");
const statusMessage = document.getElementById("statusMessage");
const recordsTableBody = document.querySelector("#recordsTable tbody");
const clearButton = document.getElementById("clearButton");
const vehicleRow = document.getElementById("vehicleRow");
const vehicleSelect = document.getElementById("vehicleSelect");
const searchPersonInput = document.getElementById("searchPersonInput");
const recordTypeSelect = document.getElementById("recordTypeSelect");

// ==========================================
// 3. 固定選單資料
// ==========================================
const personOptions = {
  hospital: ["蕭妃機", "嘉成", "筱杰", "希大"],
  caregiver: ["蕭妃機", "嘉成", "筱杰", "希大", "新開"],
};

const vehicleOptions = ["嘉蕭91", "嘉蕭92"];

// ==========================================
// 4. 工具函式 (時間格式化)
// ==========================================
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 產生人員下拉選單
function populatePeople() {
  const role = roleSelect.value;
  personSelect.innerHTML = "";
  personOptions[role].forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    personSelect.appendChild(option);
  });

  if (role === "caregiver") {
    vehicleRow.style.display = "flex";
    populateVehicles();
  } else {
    vehicleRow.style.display = "none";
  }
}

// 產生車輛下拉選單
function populateVehicles() {
  vehicleSelect.innerHTML = "";
  vehicleOptions.forEach((vehicle) => {
    const option = document.createElement("option");
    option.value = vehicle;
    option.textContent = vehicle;
    vehicleSelect.appendChild(option);
  });
}

// ==========================================
// 5. Supabase 資料庫操作 (核心修改區)
// ==========================================

// 從 Supabase 讀取打卡紀錄
async function loadRecords(searchText = "", typeFilter = "all") {
  let query = supabase.from("打卡紀錄").select("*").order("date", { ascending: false });

  // 如果有輸入搜尋姓名
  if (searchText) {
    query = query.ilike("person", `%${searchText}%`);
  }
  // 如果有篩選上下班類型
  if (typeFilter && typeFilter !== "all") {
    query = query.eq("type", typeFilter);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("無法載入紀錄: " + error.message);
  }
  return data;
}

// 新增打卡紀錄到 Supabase
async function saveRecord(record) {
  const { data, error } = await supabase.from("打卡紀錄").insert([record]);
  if (error) {
    throw new Error("儲存失敗: " + error.message);
  }
  return data;
}

// 清除所有紀錄 (從 Supabase 刪除)
async function clearAllRecords() {
  // 注意：Supabase 安全機制規定，刪除時必須帶有條件，這裡用 .neq("id", 0) 代表刪除所有 id 不等於 0 的資料
  const { data, error } = await supabase.from("打卡紀錄").delete().neq("id", 0);
  if (error) {
    throw new Error("清除失敗: " + error.message);
  }
  return data;
}

// ==========================================
// 6. 渲染畫面與功能實作
// ==========================================
async function renderRecords() {
  const searchText = searchPersonInput.value.trim();
  const typeFilter = recordTypeSelect.value;
  let records = [];
  try {
    records = await loadRecords(searchText, typeFilter);
  } catch (error) {
    statusMessage.textContent = error.message;
  }

  recordsTableBody.innerHTML = "";
  if (!records || records.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" style="text-align:center; padding: 20px; color: #8c98a8;">目前沒有符合條件的打卡紀錄</td>`;
    recordsTableBody.appendChild(row);
    return;
  }
  
  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${record.date}</td>
      <td>${record.role === "hospital" ? "醫院" : record.role === "caregiver" ? "民護" : "救護車"}</td>
      <td>${record.person}</td>
      <td>${record.vehicle || "-"}</td>
      <td>${record.type === "in" ? "上班" : "下班"}</td>
      <td>${record.time}</td>
    `;
    recordsTableBody.appendChild(row);
  });
}

// 點擊打卡按鈕觸發 (已補上關鍵的 async)
async function addRecord(type) {
  const role = roleSelect.value;
  const person = personSelect.value;
  const vehicle = role === "caregiver" ? vehicleSelect.value : "";
  if (!person) {
    statusMessage.textContent = "請先選擇人員。";
    return;
  }

  const now = new Date();
  const date = now.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const time = formatDateTime(now).split(" ")[1];
  const newRecord = { date, role, person, vehicle, type, time };
  
  try {
    await saveRecord(newRecord);
    await renderRecords();
    const roleLabel = role === "hospital" ? "醫院" : role === "caregiver" ? "民護" : "救護車";
    const vehicleLabel = role === "caregiver" ? `，車號 ${vehicle}` : "";
    statusMessage.textContent = `${roleLabel}：${person}${vehicleLabel}，已記錄${type === "in" ? "上班" : "下班"}時間 ${time}`;
  } catch (error) {
    statusMessage.textContent = error.message;
  }
}

// ==========================================
// 7. 事件監聽設定 (已補上關鍵的 async)
// ==========================================
roleSelect.addEventListener("change", populatePeople);
clockInButton.addEventListener("click", () => addRecord("in"));
clockOutButton.addEventListener("click", () => addRecord("out"));
searchPersonInput.addEventListener("input", renderRecords);
recordTypeSelect.addEventListener("change", renderRecords);

clearButton.addEventListener("click", async () => {
  if (confirm("確定要清除所有打卡紀錄？")) {
    try {
      await clearAllRecords();
      await renderRecords();
      statusMessage.textContent = "已清除所有打卡紀錄。";
    } catch (error) {
      statusMessage.textContent = error.message;
    }
  }
});

// 初始化載入
populatePeople();
renderRecords();

