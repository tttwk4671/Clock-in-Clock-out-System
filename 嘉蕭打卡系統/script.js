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

const personOptions = {
  hospital: ["蕭妃機", "嘉成", "筱杰", "希大"],
  caregiver: ["蕭妃機", "嘉成", "筱杰", "希大", "新開"],
};

const vehicleOptions = ["嘉蕭91", "嘉蕭92"];
const STORAGE_KEY = "hospital-caregiver-clock-records";

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
    populateVehicles();
  } else {
    vehicleRow.style.display = "none";
  }
}

function populateVehicles() {
  vehicleSelect.innerHTML = "";
  vehicleOptions.forEach((vehicle) => {
    const option = document.createElement("option");
    option.value = vehicle;
    option.textContent = vehicle;
    vehicleSelect.appendChild(option);
  });
}

function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function renderRecords() {
  const records = loadRecords();
  const searchText = searchPersonInput.value.trim().toLowerCase();
  const typeFilter = recordTypeSelect.value;
  const filteredRecords = records.filter((record) => {
    const matchesPerson = !searchText || record.person.toLowerCase().includes(searchText);
    const matchesType = typeFilter === "all" || record.type === typeFilter;
    return matchesPerson && matchesType;
  });

  recordsTableBody.innerHTML = "";
  if (filteredRecords.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" style="text-align:center; padding: 20px; color: #8c98a8;">目前沒有符合條件的打卡紀錄</td>`;
    recordsTableBody.appendChild(row);
    return;
  }
  filteredRecords.forEach((record) => {
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

function addRecord(type) {
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
  const records = loadRecords();
  records.unshift(newRecord);
  saveRecords(records);
  renderRecords();

  const roleLabel = role === "hospital" ? "醫院" : role === "caregiver" ? "民護" : "救護車";
  const vehicleLabel = role === "caregiver" ? `，車號 ${vehicle}` : "";
  statusMessage.textContent = `${roleLabel}：${person}${vehicleLabel}，已記錄${type === "in" ? "上班" : "下班"}時間 ${time}`;
}

roleSelect.addEventListener("change", populatePeople);
clockInButton.addEventListener("click", () => addRecord("in"));
clockOutButton.addEventListener("click", () => addRecord("out"));
searchPersonInput.addEventListener("input", renderRecords);
recordTypeSelect.addEventListener("change", renderRecords);
clearButton.addEventListener("click", () => {
  if (confirm("確定要清除所有打卡紀錄？")) {
    localStorage.removeItem(STORAGE_KEY);
    renderRecords();
    statusMessage.textContent = "已清除所有打卡紀錄。";
  }
});

populatePeople();
renderRecords();
