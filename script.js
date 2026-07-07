const roleSelect = document.getElementById("roleSelect");
const personSelect = document.getElementById("personSelect");
const clockInButton = document.getElementById("clockInButton");
const clockOutButton = document.getElementById("clockOutButton");
const statusMessage = document.getElementById("statusMessage");
const recordsTableBody = document.querySelector("#recordsTable tbody");
const clearButton = document.getElementById("clearButton");
const vehicleRow = document.getElementById("vehicleRow");
const vehicleSelect = document.getElementById("vehicleSelect");
const companionRow = document.getElementById("companionRow");
const companionSelect = document.getElementById("companionSelect");
const remarksInput = document.getElementById("remarksInput");
const searchPersonInput = document.getElementById("searchPersonInput");
const recordTypeSelect = document.getElementById("recordTypeSelect");

const personOptions = {
  hospital: ["蕭妃機", "嘉成", "筱杰", "希大"],
  caregiver: ["蕭妃機", "嘉成", "筱杰", "希大", "新開"],
};

const vehicleOptions = ["嘉蕭91", "嘉蕭92", "勤務車41", "勤務車42"];
const API_BASE = "/api/records";

function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

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
    companionRow.style.display = "flex";
    populateVehicles();
    populateCompanion();
  } else {
    vehicleRow.style.display = "none";
    companionRow.style.display = "none";
  }
}

function populateVehicles() {
  vehicleSelect.innerHTML = "";
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "無";
  vehicleSelect.appendChild(noneOption);
  
  vehicleOptions.forEach((vehicle) => {
    const option = document.createElement("option");
    option.value = vehicle;
    option.textContent = vehicle;
    vehicleSelect.appendChild(option);
  });
}

function populateCompanion() {
  companionSelect.innerHTML = "";
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "無";
  companionSelect.appendChild(noneOption);
  
  personOptions.caregiver.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    companionSelect.appendChild(option);
  });
}

async function loadRecords(searchText = "", typeFilter = "all") {
  const params = new URLSearchParams();
  if (searchText) {
    params.append("person", searchText);
  }
  if (typeFilter && typeFilter !== "all") {
    params.append("type", typeFilter);
  }
  const response = await fetch(`${API_BASE}?${params.toString()}`);
  if (!response.ok) {
    throw new Error("無法載入紀錄");
  }
  return response.json();
}

async function saveRecord(record) {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(record),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || data?.message || `儲存失敗 (${response.status})`);
  }
  return data;
}

async function clearAllRecords() {
  const response = await fetch(API_BASE, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("清除失敗");
  }
  return response.json();
}

async function deleteRecord(recordId) {
  const response = await fetch(`${API_BASE}?id=${recordId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("刪除失敗");
  }
  return response.json();
}

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
  if (records.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="10" style="text-align:center; padding: 20px; color: #8c98a8;">目前沒有符合條件的打卡紀錄</td>`;
    recordsTableBody.appendChild(row);
    return;
  }
  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${record.id}</td>
      <td>${record.date}</td>
      <td>${record.role === "hospital" ? "醫院" : record.role === "caregiver" ? "民護" : "救護車"}</td>
      <td>${record.person}</td>
      <td>${record.vehicle || "-"}</td>
      <td>${record.companion || "-"}</td>
      <td>${record.remarks || "-"}</td>
      <td>${record.type === "in" ? "上班" : "下班"}</td>
      <td>${record.time}</td>
      <td><button class="delete-btn" onclick="deleteRecordAndRefresh(${record.id})">刪除</button></td>
    `;
    recordsTableBody.appendChild(row);
  });
}

async function addRecord(type) {
  const role = roleSelect.value;
  const person = personSelect.value;
  const vehicle = role === "caregiver" ? vehicleSelect.value : "";
  const companion = role === "caregiver" ? companionSelect.value : "";
  const remarks = remarksInput.value.trim();
  if (!person) {
    statusMessage.textContent = "請先選擇人員。";
    return;
  }

  // 禁用按鈕，顯示處理中
  clockInButton.disabled = true;
  clockOutButton.disabled = true;
  statusMessage.textContent = "⏳ 正在提交...";

  const now = new Date();
  const date = now.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const time = formatDateTime(now).split(" ")[1];
  const newRecord = { date, role, person, vehicle, companion, remarks, type, time };
  try {
    await saveRecord(newRecord);
    statusMessage.textContent = "⏳ 正在重新載入...";
    await renderRecords();
    const roleLabel = role === "hospital" ? "醫院" : role === "caregiver" ? "民護" : "救護車";
    const vehicleLabel = role === "caregiver" && vehicle ? `，車輛 ${vehicle}` : "";
    const companionLabel = role === "caregiver" && companion ? `，隨車人員 ${companion}` : "";
    const remarksLabel = remarks ? `，備註 ${remarks}` : "";
    statusMessage.textContent = `✅ ${roleLabel}：${person}${vehicleLabel}${companionLabel}${remarksLabel}，已記錄${type === "in" ? "上班" : "下班"}時間 ${time}`;
    remarksInput.value = "";
  } catch (error) {
    statusMessage.textContent = `❌ ${error.message}`;
  } finally {
    // 重新啟用按鈕
    clockInButton.disabled = false;
    clockOutButton.disabled = false;
  }
}

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

async function deleteRecordAndRefresh(recordId) {
  if (confirm(`確定要刪除編號 ${recordId} 的打卡紀錄嗎？`)) {
    try {
      await deleteRecord(recordId);
      await renderRecords();
      statusMessage.textContent = `✅ 已刪除編號 ${recordId} 的紀錄。`;
    } catch (error) {
      statusMessage.textContent = `❌ ${error.message}`;
    }
  }
}

populatePeople();
renderRecords();
