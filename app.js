firebase.initializeApp(window.firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const loginPage = document.getElementById("loginPage");
const adminDashboard = document.getElementById("adminDashboard");
const technicianDashboard = document.getElementById("technicianDashboard");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const togglePassword = document.getElementById("togglePassword");
const farmerForm = document.getElementById("farmerForm");
const farmerMessage = document.getElementById("farmerMessage");
const captureGpsButton = document.getElementById("captureGpsButton");
const dateTimeAuto = document.getElementById("dateTimeAuto");
const locationAuto = document.getElementById("locationAuto");
const submitFarmerButton = document.getElementById("submitFarmerButton");
const mapPreview = document.getElementById("mapPreview");
const locationMap = document.getElementById("locationMap");
const openMapLink = document.getElementById("openMapLink");
const successModal = document.getElementById("successModal");
const successOkButton = document.getElementById("successOkButton");
const adminStats = document.getElementById("adminStats");
const upcomingReminders = document.getElementById("upcomingReminders");
const farmerRecordsTable = document.getElementById("farmerRecordsTable");
const exportCsvButton = document.getElementById("exportCsvButton");
const filterTechnician = document.getElementById("filterTechnician");
const filterDistrict = document.getElementById("filterDistrict");
const filterStatus = document.getElementById("filterStatus");
const filterProduct = document.getElementById("filterProduct");
const filterInstallDate = document.getElementById("filterInstallDate");
const adminEditPanel = document.getElementById("adminEditPanel");
const adminEditForm = document.getElementById("adminEditForm");
const editFarmerMessage = document.getElementById("editFarmerMessage");
const reminderForm = document.getElementById("reminderForm");
const reminderFarmer = document.getElementById("reminderFarmer");
const reminderAssignedTo = document.getElementById("reminderAssignedTo");
const reminderMessage = document.getElementById("reminderMessage");
const technicianForm = document.getElementById("technicianForm");
const technicianList = document.getElementById("technicianList");
const technicianMessage = document.getElementById("technicianMessage");
const technicianPasswordLabel = document.getElementById("technicianPasswordLabel");

let currentLocation = null;
let adminFarmers = [];
let adminTechnicians = [];
let adminReminders = [];
let adminUnsubscribers = [];
let adminListenersStarted = false;

togglePassword.addEventListener("click", () => {
  const password = document.getElementById("password");
  password.type = password.type === "password" ? "text" : "password";
  togglePassword.setAttribute("aria-label", password.type === "password" ? "Show password" : "Hide password");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Checking...";

  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    loginMessage.textContent = getLoginError(error);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }
});

document.getElementById("adminLogout").addEventListener("click", logout);
document.getElementById("technicianLogout").addEventListener("click", logout);
captureGpsButton.addEventListener("click", captureCurrentLocation);
farmerForm.addEventListener("submit", submitFarmerRecord);
successOkButton.addEventListener("click", startNewFarmerForm);
exportCsvButton.addEventListener("click", exportFarmerCsv);
adminEditForm.addEventListener("submit", saveAdminFarmerEdit);
document.getElementById("cancelEditFarmer").addEventListener("click", closeAdminEdit);
reminderForm.addEventListener("submit", createReminder);
technicianForm.addEventListener("submit", saveTechnician);
[filterTechnician, filterDistrict, filterStatus, filterProduct, filterInstallDate].forEach((filter) => {
  filter.addEventListener("input", renderAdminFarmers);
});

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    showOnly(loginPage);
    return;
  }

  await openDashboardByRole(user.uid);
});

async function openDashboardByRole(uid) {
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    loginMessage.textContent = "No role found in Firestore users collection.";
    await auth.signOut();
    showOnly(loginPage);
    return;
  }

  const userData = userDoc.data();

  if (userData.active === false) {
    loginMessage.textContent = "Your account is inactive.";
    await auth.signOut();
    showOnly(loginPage);
    return;
  }

  if (userData.role === "admin") {
    showOnly(adminDashboard);
    startAdminDashboard();
    return;
  }

  if (userData.role === "technician") {
    showOnly(technicianDashboard);
    resetFarmerForm();
    captureCurrentLocation();
    return;
  }

  loginMessage.textContent = "Invalid role: " + (userData.role || "not set");
  await auth.signOut();
  showOnly(loginPage);
}

async function logout() {
  stopAdminDashboard();
  await auth.signOut();
  showOnly(loginPage);
}

function showOnly(activePage) {
  loginPage.classList.add("hidden");
  adminDashboard.classList.add("hidden");
  technicianDashboard.classList.add("hidden");
  activePage.classList.remove("hidden");
}

function startAdminDashboard() {
  if (adminListenersStarted) {
    renderAdminDashboard();
    return;
  }

  adminListenersStarted = true;
  renderAdminDashboard();

  adminUnsubscribers.push(db.collection("farmers").onSnapshot((snapshot) => {
    adminFarmers = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((farmer) => farmer.id !== "_setup")
      .sort((a, b) => getTimeValue(b.createdAt || b.dateTime) - getTimeValue(a.createdAt || a.dateTime));
    renderAdminDashboard();
  }, showAdminDataError));

  adminUnsubscribers.push(db.collection("users").where("role", "==", "technician").onSnapshot((snapshot) => {
    adminTechnicians = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderAdminDashboard();
  }, showAdminDataError));

  adminUnsubscribers.push(db.collection("reminders").onSnapshot((snapshot) => {
    adminReminders = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((reminder) => reminder.id !== "_setup")
      .sort((a, b) => String(a.reminderDate || "").localeCompare(String(b.reminderDate || "")));
    renderAdminDashboard();
  }, showAdminDataError));
}

function showAdminDataError(error) {
  farmerRecordsTable.innerHTML = `<div class="empty-state">Unable to load admin data: ${escapeHtml(error.message || "Check Firestore rules.")}</div>`;
}

function stopAdminDashboard() {
  adminUnsubscribers.forEach((unsubscribe) => unsubscribe());
  adminUnsubscribers = [];
  adminListenersStarted = false;
  adminFarmers = [];
  adminTechnicians = [];
  adminReminders = [];
}

function renderAdminDashboard() {
  renderAdminStats();
  renderAdminDropdowns();
  renderAdminFarmers();
  renderUpcomingReminders();
  renderTechnicianList();
}

function renderAdminStats() {
  const total = adminFarmers.length;
  const pending = adminFarmers.filter((farmer) => farmer.status === "Pending").length;
  const completed = adminFarmers.filter((farmer) => farmer.status === "Completed").length;
  const today = adminFarmers.filter((farmer) => isToday(farmer.createdAt || farmer.dateTime)).length;

  adminStats.innerHTML = [
    statCard("Total Farmers", total),
    statCard("Pending Installations", pending),
    statCard("Completed Installations", completed),
    statCard("Today's Submissions", today)
  ].join("");
}

function statCard(label, value) {
  return `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`;
}

function renderAdminDropdowns() {
  const selectedTechnician = filterTechnician.value;
  const selectedReminderFarmer = reminderFarmer.value;
  const selectedAssignedTo = reminderAssignedTo.value;

  filterTechnician.innerHTML = `<option value="">All technicians</option>${adminTechnicians.map((tech) => (
    `<option value="${tech.id}">${escapeHtml(tech.name || tech.email || "Technician")}</option>`
  )).join("")}`;
  filterTechnician.value = selectedTechnician;

  reminderFarmer.innerHTML = `<option value="">Select farmer</option>${adminFarmers.map((farmer) => (
    `<option value="${farmer.id}">${escapeHtml(farmer.farmerName || "Farmer")} - ${escapeHtml(farmer.village || farmer.district || "")}</option>`
  )).join("")}`;
  reminderFarmer.value = selectedReminderFarmer;

  reminderAssignedTo.innerHTML = `<option value="">Select technician</option>${adminTechnicians.map((tech) => (
    `<option value="${tech.id}">${escapeHtml(tech.name || tech.email || "Technician")}</option>`
  )).join("")}`;
  reminderAssignedTo.value = selectedAssignedTo;
}

function getFilteredFarmers() {
  const technicianId = filterTechnician.value;
  const district = filterDistrict.value.trim().toLowerCase();
  const status = filterStatus.value;
  const productType = filterProduct.value;
  const installationDate = filterInstallDate.value;

  return adminFarmers.filter((farmer) => {
    return (!technicianId || farmer.technicianId === technicianId)
      && (!district || String(farmer.district || "").toLowerCase().includes(district))
      && (!status || farmer.status === status)
      && (!productType || farmer.productType === productType)
      && (!installationDate || farmer.installationDate === installationDate);
  });
}

function renderAdminFarmers() {
  const farmers = getFilteredFarmers();

  if (!farmers.length) {
    farmerRecordsTable.innerHTML = `<div class="empty-state">No farmer records found.</div>`;
    return;
  }

  farmerRecordsTable.innerHTML = `
    <table class="records-table">
      <thead>
        <tr>
          <th>Farmer</th>
          <th>Mobile</th>
          <th>District</th>
          <th>Product</th>
          <th>Installation</th>
          <th>Technician</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${farmers.map((farmer) => `
          <tr>
            <td><strong>${escapeHtml(farmer.farmerName || "")}</strong><small>${escapeHtml(farmer.village || "")}</small></td>
            <td>${escapeHtml(farmer.mobileNo || "")}</td>
            <td>${escapeHtml(farmer.district || "")}</td>
            <td>${escapeHtml(farmer.productType || "")}</td>
            <td>${escapeHtml(farmer.installationDate || "Not set")}</td>
            <td>${escapeHtml(getTechnicianName(farmer.technicianId, farmer.technicianEmail))}</td>
            <td><span class="badge ${String(farmer.status || "Pending").toLowerCase()}">${escapeHtml(farmer.status || "Pending")}</span></td>
            <td><button class="table-button" data-edit-farmer="${farmer.id}" type="button">Edit</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  farmerRecordsTable.querySelectorAll("[data-edit-farmer]").forEach((button) => {
    button.addEventListener("click", () => openAdminEdit(button.dataset.editFarmer));
  });
}

function openAdminEdit(farmerId) {
  const farmer = adminFarmers.find((item) => item.id === farmerId);
  if (!farmer) return;

  adminEditPanel.classList.remove("hidden");
  adminEditForm.elements.id.value = farmer.id;
  [
    "farmerName", "mobileNo", "district", "block", "gp", "village", "address",
    "productType", "area", "size", "spacing", "crop", "installationDate",
    "farmerShare", "gps", "status"
  ].forEach((field) => {
    if (adminEditForm.elements[field]) {
      adminEditForm.elements[field].value = farmer[field] || (field === "status" ? "Pending" : "");
    }
  });
  editFarmerMessage.textContent = "";
  adminEditPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeAdminEdit() {
  adminEditPanel.classList.add("hidden");
  adminEditForm.reset();
  editFarmerMessage.textContent = "";
}

async function saveAdminFarmerEdit(event) {
  event.preventDefault();
  const id = adminEditForm.elements.id.value;
  const formData = new FormData(adminEditForm);

  try {
    await db.collection("farmers").doc(id).update({
      farmerName: clean(formData.get("farmerName")),
      mobileNo: clean(formData.get("mobileNo")),
      district: clean(formData.get("district")),
      block: clean(formData.get("block")),
      gp: clean(formData.get("gp")),
      village: clean(formData.get("village")),
      address: clean(formData.get("address")),
      productType: formData.get("productType"),
      area: clean(formData.get("area")),
      size: clean(formData.get("size")),
      spacing: clean(formData.get("spacing")),
      crop: clean(formData.get("crop")),
      installationDate: formData.get("installationDate"),
      farmerShare: clean(formData.get("farmerShare")),
      gps: formData.get("gps"),
      status: formData.get("status"),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    editFarmerMessage.textContent = "Farmer record updated.";
  } catch (error) {
    editFarmerMessage.textContent = error.message || "Unable to update farmer.";
  }
}

function renderUpcomingReminders() {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = adminReminders
    .filter((reminder) => reminder.status !== "Completed" && String(reminder.reminderDate || "") >= today)
    .slice(0, 6);

  if (!upcoming.length) {
    upcomingReminders.innerHTML = `<div class="empty-state">No upcoming reminders.</div>`;
    return;
  }

  upcomingReminders.innerHTML = upcoming.map((reminder) => `
    <article class="reminder-item">
      <div>
        <strong>${escapeHtml(reminder.title || "Reminder")}</strong>
        <small>${escapeHtml(getFarmerName(reminder.farmerId))} • ${escapeHtml(reminder.reminderDate || "")}</small>
      </div>
      <span class="badge pending">${escapeHtml(reminder.status || "Pending")}</span>
    </article>
  `).join("");
}

async function createReminder(event) {
  event.preventDefault();
  reminderMessage.textContent = "";

  try {
    await db.collection("reminders").add({
      farmerId: reminderFarmer.value,
      title: clean(document.getElementById("reminderTitle").value),
      reminderDate: document.getElementById("reminderDate").value,
      status: document.getElementById("reminderStatus").value,
      assignedTo: reminderAssignedTo.value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    reminderForm.reset();
    reminderMessage.textContent = "Reminder created.";
  } catch (error) {
    reminderMessage.textContent = error.message || "Unable to create reminder.";
  }
}

function renderTechnicianList() {
  if (!adminTechnicians.length) {
    technicianList.innerHTML = `<div class="empty-state">No technicians found.</div>`;
    return;
  }

  technicianList.innerHTML = adminTechnicians.map((tech) => `
    <article class="technician-item">
      <div>
        <strong>${escapeHtml(tech.name || "Technician")}</strong>
        <small>${escapeHtml(tech.email || "")}</small>
      </div>
      <div class="row-actions">
        <button class="table-button" data-edit-technician="${tech.id}" type="button">Edit</button>
        <button class="danger-button" data-delete-technician="${tech.id}" type="button">Delete</button>
      </div>
    </article>
  `).join("");

  technicianList.querySelectorAll("[data-edit-technician]").forEach((button) => {
    button.addEventListener("click", () => editTechnician(button.dataset.editTechnician));
  });
  technicianList.querySelectorAll("[data-delete-technician]").forEach((button) => {
    button.addEventListener("click", () => deleteTechnician(button.dataset.deleteTechnician));
  });
}

async function saveTechnician(event) {
  event.preventDefault();
  technicianMessage.textContent = "";
  const editingId = document.getElementById("editingTechnicianId").value;
  const name = clean(document.getElementById("technicianName").value);
  const email = clean(document.getElementById("technicianEmail").value);

  try {
    if (editingId) {
      await db.collection("users").doc(editingId).update({
        name,
        email,
        active: true,
        role: "technician",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      technicianMessage.textContent = "Technician updated.";
    } else {
      const secondaryApp = firebase.initializeApp(window.firebaseConfig, "technicianCreate-" + Date.now());
      const credential = await secondaryApp.auth().createUserWithEmailAndPassword(email, document.getElementById("technicianPassword").value);
      await db.collection("users").doc(credential.user.uid).set({
        name,
        email,
        role: "technician",
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await secondaryApp.delete();
      technicianMessage.textContent = "Technician created.";
    }
    technicianForm.reset();
    document.getElementById("editingTechnicianId").value = "";
    technicianPasswordLabel.classList.remove("hidden");
    document.getElementById("technicianPassword").required = true;
  } catch (error) {
    technicianMessage.textContent = error.message || "Unable to save technician.";
  }
}

function editTechnician(id) {
  const tech = adminTechnicians.find((item) => item.id === id);
  if (!tech) return;
  document.getElementById("editingTechnicianId").value = tech.id;
  document.getElementById("technicianName").value = tech.name || "";
  document.getElementById("technicianEmail").value = tech.email || "";
  technicianPasswordLabel.classList.add("hidden");
  document.getElementById("technicianPassword").required = false;
}

async function deleteTechnician(id) {
  await db.collection("users").doc(id).delete();
}

function exportFarmerCsv() {
  const farmers = getFilteredFarmers();
  const headers = ["Farmer Name", "Mobile No", "District", "Block", "GP", "Village", "Address", "Product Type", "Area (Acre)", "Size", "Spacing", "Crop", "Installation Date", "Farmer Share", "GPS", "Status", "Technician", "Location"];
  const rows = farmers.map((farmer) => [
    farmer.farmerName,
    farmer.mobileNo,
    farmer.district,
    farmer.block,
    farmer.gp,
    farmer.village,
    farmer.address,
    farmer.productType,
    farmer.area,
    farmer.size,
    farmer.spacing,
    farmer.crop,
    farmer.installationDate,
    farmer.farmerShare,
    farmer.gps,
    farmer.status,
    getTechnicianName(farmer.technicianId, farmer.technicianEmail),
    farmer.locationText
  ]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "ishaagro-farmer-records.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function resetFarmerForm() {
  farmerForm.reset();
  currentLocation = null;
  farmerMessage.textContent = "";
  setAutoDateTime();
  locationAuto.value = "";
  mapPreview.classList.add("hidden");
  locationMap.removeAttribute("src");
  openMapLink.href = "#";
}

function setAutoDateTime() {
  const now = new Date();
  dateTimeAuto.value = now.toLocaleString();
}

function captureCurrentLocation() {
  farmerMessage.textContent = "Capturing current GPS location...";
  captureGpsButton.disabled = true;

  if (!navigator.geolocation) {
    farmerMessage.textContent = "GPS is not supported in this browser.";
    captureGpsButton.disabled = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      locationAuto.value = currentLocation.lat.toFixed(6) + ", " + currentLocation.lng.toFixed(6);
      updateLocationMap(currentLocation.lat, currentLocation.lng);
      farmerMessage.textContent = "GPS location captured.";
      captureGpsButton.disabled = false;
    },
    (error) => {
      farmerMessage.textContent = "Unable to capture GPS: " + error.message;
      captureGpsButton.disabled = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

function updateLocationMap(lat, lng) {
  const delta = 0.004;
  const bbox = [
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta
  ].join(",");

  locationMap.src = "https://www.openstreetmap.org/export/embed.html?bbox=" + bbox + "&layer=mapnik&marker=" + lat + "," + lng;
  openMapLink.href = "https://www.google.com/maps?q=" + lat + "," + lng;
  mapPreview.classList.remove("hidden");
}

async function submitFarmerRecord(event) {
  event.preventDefault();
  farmerMessage.textContent = "";

  if (!auth.currentUser) {
    farmerMessage.textContent = "Please login again.";
    return;
  }

  if (!currentLocation) {
    farmerMessage.textContent = "Please capture GPS location before submitting.";
    return;
  }

  submitFarmerButton.disabled = true;
  submitFarmerButton.textContent = "Saving...";
  setAutoDateTime();

  try {
    const formData = new FormData(farmerForm);
    const now = new Date();

    await db.collection("farmers").add({
      farmerName: clean(formData.get("farmerName")),
      mobileNo: clean(formData.get("mobileNo")),
      district: clean(formData.get("district")),
      block: clean(formData.get("block")),
      gp: clean(formData.get("gp")),
      village: clean(formData.get("village")),
      address: clean(formData.get("address")),
      dateTime: now,
      dateTimeText: now.toLocaleString(),
      location: currentLocation,
      locationText: locationAuto.value,
      productType: formData.get("productType"),
      area: clean(formData.get("area")),
      size: clean(formData.get("size")),
      spacing: clean(formData.get("spacing")),
      crop: clean(formData.get("crop")),
      installationDate: formData.get("installationDate"),
      farmerShare: clean(formData.get("farmerShare")),
      gps: formData.get("gps"),
      status: "Pending",
      technicianId: auth.currentUser.uid,
      technicianEmail: auth.currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showSuccessModal();
  } catch (error) {
    farmerMessage.textContent = error.message || "Failed to save farmer data.";
  } finally {
    submitFarmerButton.disabled = false;
    submitFarmerButton.textContent = "Submit Farmer";
  }
}

function clean(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTechnicianName(id, fallback) {
  const tech = adminTechnicians.find((item) => item.id === id);
  return tech?.name || tech?.email || fallback || "Unassigned";
}

function getFarmerName(id) {
  const farmer = adminFarmers.find((item) => item.id === id);
  return farmer?.farmerName || "Farmer";
}

function getTimeValue(value) {
  if (!value) return 0;
  if (value.toDate) return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isToday(value) {
  const time = getTimeValue(value);
  if (!time) return false;
  return new Date(time).toDateString() === new Date().toDateString();
}

function showSuccessModal() {
  successModal.classList.remove("hidden");
}

function startNewFarmerForm() {
  successModal.classList.add("hidden");
  resetFarmerForm();
  captureCurrentLocation();
}

function getLoginError(error) {
  if (error.code === "auth/invalid-credential") {
    return "Invalid email or password.";
  }

  if (error.code === "auth/operation-not-allowed") {
    return "Email/password login is not enabled in Firebase.";
  }

  return error.message || "Login failed.";
}
