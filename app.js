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
const farmerRegistrationPanel = document.getElementById("farmerRegistrationPanel");
const farmerQueryPanel = document.getElementById("farmerQueryPanel");
const farmerQueryForm = document.getElementById("farmerQueryForm");
const farmerQueryMessage = document.getElementById("farmerQueryMessage");
const farmerQueryTable = document.getElementById("farmerQueryTable");
const showRegistrationButton = document.getElementById("showRegistrationButton");
const showQueryButton = document.getElementById("showQueryButton");
const captureGpsButton = document.getElementById("captureGpsButton");
const dateTimeAuto = document.getElementById("dateTimeAuto");
const locationAuto = document.getElementById("locationAuto");
const submitFarmerButton = document.getElementById("submitFarmerButton");
const mapPreview = document.getElementById("mapPreview");
const locationMap = document.getElementById("locationMap");
const openMapLink = document.getElementById("openMapLink");
const successModal = document.getElementById("successModal");
const successOkButton = document.getElementById("successOkButton");
const adminGreeting = document.getElementById("adminGreeting");
const technicianGreeting = document.getElementById("technicianGreeting");
const adminStats = document.getElementById("adminStats");
const adminInsights = document.getElementById("adminInsights");
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
const adminTabButtons = document.querySelectorAll("[data-admin-tab]");
const adminPanels = document.querySelectorAll("[data-admin-panel]");
const recentUpdates = document.getElementById("recentUpdates");
const farmerDetailPanel = document.getElementById("farmerDetailPanel");
const profileMenus = {
  admin: {
    button: document.getElementById("adminProfileButton"),
    menu: document.getElementById("adminProfileMenu"),
    photo: document.getElementById("adminProfilePhoto"),
    initials: document.getElementById("adminProfileInitials"),
    menuPhoto: document.getElementById("adminProfileMenuPhoto"),
    name: document.getElementById("adminProfileName"),
    email: document.getElementById("adminProfileEmail"),
    role: document.getElementById("adminProfileRole"),
    logout: document.getElementById("adminProfileLogout")
  },
  technician: {
    button: document.getElementById("technicianProfileButton"),
    menu: document.getElementById("technicianProfileMenu"),
    photo: document.getElementById("technicianProfilePhoto"),
    initials: document.getElementById("technicianProfileInitials"),
    menuPhoto: document.getElementById("technicianProfileMenuPhoto"),
    name: document.getElementById("technicianProfileName"),
    email: document.getElementById("technicianProfileEmail"),
    role: document.getElementById("technicianProfileRole"),
    logout: document.getElementById("technicianProfileLogout")
  }
};

let currentLocation = null;
let adminFarmers = [];
let adminFarmerQueries = [];
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

Object.entries(profileMenus).forEach(([role, profile]) => {
  profile.button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleProfileMenu(role);
  });
  profile.logout.addEventListener("click", logout);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".profile-menu-wrap")) {
    closeProfileMenus();
  }
});
captureGpsButton.addEventListener("click", captureCurrentLocation);
farmerForm.addEventListener("submit", submitFarmerRecord);
farmerQueryForm.addEventListener("submit", submitFarmerQuery);
showRegistrationButton.addEventListener("click", () => showTechnicianWorkflow("registration"));
showQueryButton.addEventListener("click", () => showTechnicianWorkflow("query"));
successOkButton.addEventListener("click", startNewFarmerForm);
exportCsvButton.addEventListener("click", exportFarmerCsv);
adminEditForm.addEventListener("submit", saveAdminFarmerEdit);
document.getElementById("cancelEditFarmer").addEventListener("click", closeAdminEdit);
reminderForm.addEventListener("submit", createReminder);
technicianForm.addEventListener("submit", saveTechnician);
farmerDetailPanel.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-farmer-details]")) {
    closeFarmerDetails();
  }
});
[filterTechnician, filterDistrict, filterStatus, filterProduct, filterInstallDate].forEach((filter) => {
  filter.addEventListener("input", renderAdminFarmers);
});
adminTabButtons.forEach((button) => {
  button.addEventListener("click", () => showAdminTab(button.dataset.adminTab));
});

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    showOnly(loginPage);
    return;
  }

  try {
    await openDashboardByRole(user.uid);
  } catch (error) {
    loginMessage.textContent = getRoleLookupError(error);
    await auth.signOut();
    showOnly(loginPage);
  }
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
    adminGreeting.textContent = "Welcome, " + (userData.name || "Admin");
    setProfileDetails("admin", userData, auth.currentUser);
    showOnly(adminDashboard);
    startAdminDashboard();
    return;
  }

  if (userData.role === "technician") {
    technicianGreeting.textContent = "Welcome, " + (userData.name || "Technician");
    setProfileDetails("technician", userData, auth.currentUser);
    showOnly(technicianDashboard);
    showTechnicianWorkflow("registration");
    resetFarmerForm();
    resetFarmerQueryForm();
    captureCurrentLocation();
    return;
  }

  loginMessage.textContent = "Invalid role: " + (userData.role || "not set");
  await auth.signOut();
  showOnly(loginPage);
}

async function logout() {
  closeProfileMenus();
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

function showAdminTab(tabName) {
  adminTabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.adminTab === tabName);
  });
  adminPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.adminPanel !== tabName);
  });
}

function setProfileDetails(profileType, userData, firebaseUser) {
  const profile = profileMenus[profileType];
  const name = userData.name || firebaseUser?.displayName || (profileType === "admin" ? "Admin" : "Technician");
  const email = userData.email || firebaseUser?.email || "";
  const role = userData.role || profileType;
  const initials = getInitials(name, email);
  const photoUrl = userData.photoURL || userData.photoUrl || firebaseUser?.photoURL || createProfilePhoto(name, email, role);

  profile.photo.src = photoUrl;
  profile.menuPhoto.src = photoUrl;
  profile.initials.textContent = initials;
  profile.name.textContent = name;
  profile.email.textContent = email || "Email not available";
  profile.role.textContent = role.charAt(0).toUpperCase() + role.slice(1);
}

function toggleProfileMenu(profileType) {
  Object.entries(profileMenus).forEach(([role, profile]) => {
    const isActive = role === profileType && profile.menu.classList.contains("hidden");
    profile.menu.classList.toggle("hidden", !isActive);
    profile.button.setAttribute("aria-expanded", String(isActive));
  });
}

function closeProfileMenus() {
  Object.values(profileMenus).forEach((profile) => {
    profile.menu.classList.add("hidden");
    profile.button.setAttribute("aria-expanded", "false");
  });
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

  adminUnsubscribers.push(db.collection("farmerQueries").onSnapshot((snapshot) => {
    adminFarmerQueries = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((query) => query.id !== "_setup")
      .sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));
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
  adminFarmerQueries = [];
  adminTechnicians = [];
  adminReminders = [];
}

function renderAdminDashboard() {
  renderAdminStats();
  renderAdminInsights();
  renderAdminDropdowns();
  renderRecentUpdates();
  renderAdminFarmers();
  renderFarmerQueries();
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

function renderAdminInsights() {
  if (!adminInsights) return;

  const total = adminFarmers.length;
  const pending = adminFarmers.filter((farmer) => (farmer.status || "Pending") === "Pending").length;
  const completed = adminFarmers.filter((farmer) => farmer.status === "Completed").length;
  const completionPercent = total ? Math.round((completed / total) * 100) : 0;
  const pendingReminders = adminReminders.filter((reminder) => reminder.status !== "Completed").length;
  const drip = adminFarmers.filter((farmer) => farmer.productType === "Drip").length;
  const sprinkler = adminFarmers.filter((farmer) => farmer.productType === "Sprinkler").length;
  const productTotal = drip + sprinkler;
  const dripPercent = productTotal ? Math.round((drip / productTotal) * 100) : 0;
  const districtRows = countTopValues(adminFarmers, "district", 4);
  const districtCount = new Set(adminFarmers.map((farmer) => clean(farmer.district)).filter(Boolean)).size;
  const technicianRows = countTopValues(adminFarmers, "technicianId", 4, (id) => getTechnicianName(id));

  adminInsights.innerHTML = `
    <article class="insight-card progress-card">
      <div>
        <span class="insight-label">Installation Progress</span>
        <strong>${completionPercent}% completed</strong>
        <small>${completed} completed • ${pending} pending</small>
      </div>
      <div class="donut" style="--progress:${completionPercent * 3.6}deg">
        <span>${completionPercent}%</span>
      </div>
    </article>

    <article class="insight-card">
      <div class="insight-heading">
        <span class="insight-label">Product Mix</span>
        <strong>${productTotal || 0} records</strong>
      </div>
      ${progressRow("Drip", drip, productTotal)}
      ${progressRow("Sprinkler", sprinkler, productTotal)}
      <small class="insight-note">${dripPercent}% of product entries are drip installations.</small>
    </article>

    <article class="insight-card">
      <div class="insight-heading">
        <span class="insight-label">Technician Workload</span>
        <strong>${adminTechnicians.length} technicians</strong>
      </div>
      ${miniList(technicianRows, "No technician activity yet.")}
    </article>

    <article class="insight-card">
      <div class="insight-heading">
        <span class="insight-label">District Spread</span>
        <strong>${districtCount} active areas</strong>
      </div>
      ${miniList(districtRows, "No district data yet.")}
      <div class="reminder-chip">${pendingReminders} pending reminders</div>
    </article>
  `;
}

function countTopValues(records, field, limit, labelFormatter) {
  const counts = new Map();
  records.forEach((record) => {
    const rawValue = clean(record[field]) || "Not set";
    counts.set(rawValue, (counts.get(rawValue) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([value, count]) => ({
      label: labelFormatter ? labelFormatter(value) : value,
      count
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function progressRow(label, value, total) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return `
    <div class="progress-row">
      <div>
        <strong>${escapeHtml(label)}</strong>
        <span>${value} farmer${value === 1 ? "" : "s"}</span>
      </div>
      <div class="progress-track" aria-label="${escapeHtml(label)} ${percent}%">
        <span style="width:${percent}%"></span>
      </div>
      <b>${percent}%</b>
    </div>
  `;
}

function miniList(items, emptyText) {
  if (!items.length) {
    return `<div class="empty-mini">${escapeHtml(emptyText)}</div>`;
  }

  const max = Math.max(...items.map((item) => item.count), 1);
  return items.map((item) => `
    <div class="mini-row">
      <span>${escapeHtml(item.label)}</span>
      <div class="mini-track"><i style="width:${Math.max(12, Math.round((item.count / max) * 100))}%"></i></div>
      <strong>${item.count}</strong>
    </div>
  `).join("");
}

function renderRecentUpdates() {
  const recentFarmers = adminFarmers.slice(0, 5).map((farmer) => ({
    type: "Farmer",
    title: farmer.farmerName || "New farmer",
    detail: `${farmer.status || "Pending"} • ${farmer.village || farmer.district || "Location not set"}`,
    time: getTimeValue(farmer.createdAt || farmer.dateTime)
  }));
  const recentReminders = adminReminders.slice(0, 3).map((reminder) => ({
    type: "Reminder",
    title: reminder.title || "Reminder",
    detail: `${getFarmerName(reminder.farmerId)} • ${reminder.reminderDate || "Date not set"}`,
    time: getTimeValue(reminder.createdAt)
  }));
  const updates = [...recentFarmers, ...recentReminders]
    .sort((a, b) => b.time - a.time)
    .slice(0, 8);

  if (!updates.length) {
    recentUpdates.innerHTML = `<div class="empty-state">No recent updates yet.</div>`;
    return;
  }

  recentUpdates.innerHTML = updates.map((item) => `
    <article class="reminder-item">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.detail)}</small>
      </div>
      <span class="badge">${escapeHtml(item.type)}</span>
    </article>
  `).join("");
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
            <td>
              <select class="status-select ${String(farmer.status || "Pending").toLowerCase()}" data-status-farmer="${farmer.id}">
                <option ${farmer.status === "Pending" || !farmer.status ? "selected" : ""}>Pending</option>
                <option ${farmer.status === "Completed" ? "selected" : ""}>Completed</option>
              </select>
            </td>
            <td>
              <div class="row-actions">
                <button class="table-button" data-view-farmer="${farmer.id}" type="button">View</button>
                <button class="table-button" data-edit-farmer="${farmer.id}" type="button">Edit</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  farmerRecordsTable.querySelectorAll("[data-view-farmer]").forEach((button) => {
    button.addEventListener("click", () => openFarmerDetails(button.dataset.viewFarmer));
  });
  farmerRecordsTable.querySelectorAll("[data-edit-farmer]").forEach((button) => {
    button.addEventListener("click", () => openAdminEdit(button.dataset.editFarmer));
  });
  farmerRecordsTable.querySelectorAll("[data-status-farmer]").forEach((select) => {
    select.addEventListener("change", () => updateFarmerStatus(select.dataset.statusFarmer, select.value));
  });
}

function renderFarmerQueries() {
  if (!farmerQueryTable) return;

  if (!adminFarmerQueries.length) {
    farmerQueryTable.innerHTML = `<div class="empty-state">No farmer queries found.</div>`;
    return;
  }

  farmerQueryTable.innerHTML = `
    <table class="records-table query-table">
      <thead>
        <tr>
          <th>Farmer</th>
          <th>Mobile</th>
          <th>Address</th>
          <th>Area</th>
          <th>Product</th>
          <th>Technician</th>
          <th>Submitted</th>
        </tr>
      </thead>
      <tbody>
        ${adminFarmerQueries.map((query) => `
          <tr>
            <td><strong>${escapeHtml(query.farmerName || "")}</strong></td>
            <td>${escapeHtml(query.mobileNo || "")}</td>
            <td>${escapeHtml(query.address || "")}</td>
            <td>${escapeHtml(query.area || "")}</td>
            <td>${escapeHtml(query.productType || "")}</td>
            <td>${escapeHtml(getTechnicianName(query.technicianId, query.technicianEmail))}</td>
            <td>${escapeHtml(formatDateTime(query.createdAt))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function updateFarmerStatus(farmerId, status) {
  await db.collection("farmers").doc(farmerId).update({
    status,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function openFarmerDetails(farmerId) {
  const farmer = adminFarmers.find((item) => item.id === farmerId);
  if (!farmer) return;

  const hasLocation = farmer.location?.lat && farmer.location?.lng;
  const googleMapUrl = hasLocation ? `https://www.google.com/maps?q=${farmer.location.lat},${farmer.location.lng}` : "";
  const mapEmbed = hasLocation ? getOpenStreetMapEmbed(farmer.location.lat, farmer.location.lng) : "";

  farmerDetailPanel.classList.remove("hidden");
  farmerDetailPanel.innerHTML = `
    <div class="section-heading">
      <h3>Farmer Details</h3>
      <button class="secondary-button" data-close-farmer-details type="button">Close</button>
    </div>
    <div class="detail-grid">
      ${detailItem("Farmer Name", farmer.farmerName)}
      ${detailItem("Mobile No", farmer.mobileNo)}
      ${detailItem("Referal", farmer.referal)}
      ${detailItem("District", farmer.district)}
      ${detailItem("Block", farmer.block)}
      ${detailItem("GP", farmer.gp)}
      ${detailItem("Village", farmer.village)}
      ${detailItem("Address", farmer.address)}
      ${detailItem("Product Type", farmer.productType)}
      ${detailItem("Area (Acre)", farmer.area)}
      ${detailItem("Size", farmer.size)}
      ${detailItem("Spacing", farmer.spacing)}
      ${detailItem("Crop", farmer.crop)}
      ${detailItem("Installation Date", farmer.installationDate)}
      ${detailItem("Farmer Share", farmer.farmerShare)}
      ${detailItem("GPS", farmer.gps)}
      ${detailItem("Status", farmer.status || "Pending")}
      ${detailItem("Technician", getTechnicianName(farmer.technicianId, farmer.technicianEmail))}
      ${detailItem("Submitted At", formatDateTime(farmer.createdAt || farmer.dateTime))}
      ${detailItem("Current Location", farmer.locationText || "Not captured")}
    </div>
    ${hasLocation ? `
      <div class="map-preview detail-map">
        <div class="map-header">
          <strong>Location Map</strong>
          <div class="row-actions">
            <a href="${googleMapUrl}" target="_blank" rel="noopener">Open Map</a>
            <button class="table-button" id="shareLocationButton" type="button">Share Location</button>
          </div>
        </div>
        <iframe title="Farmer location map" loading="lazy" src="${mapEmbed}"></iframe>
      </div>
    ` : `<div class="empty-state">No location captured for this farmer.</div>`}
  `;

  document.getElementById("shareLocationButton")?.addEventListener("click", () => {
    shareLocation(googleMapUrl);
  });

  farmerDetailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeFarmerDetails() {
  farmerDetailPanel.classList.add("hidden");
  farmerDetailPanel.innerHTML = "";
}

function detailItem(label, value) {
  return `<article class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "Not set")}</strong></article>`;
}

function getOpenStreetMapEmbed(lat, lng) {
  const delta = 0.004;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

async function shareLocation(url) {
  if (navigator.share) {
    await navigator.share({ title: "IshaAgro Farmer Location", url });
    return;
  }
  await navigator.clipboard.writeText(url);
  alert("Location link copied.");
}

function openAdminEdit(farmerId) {
  const farmer = adminFarmers.find((item) => item.id === farmerId);
  if (!farmer) return;

  adminEditPanel.classList.remove("hidden");
  adminEditForm.elements.id.value = farmer.id;
  [
    "farmerName", "mobileNo", "referal", "district", "block", "gp", "village", "address",
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
      referal: clean(formData.get("referal")),
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
  const headers = ["Farmer Name", "Mobile No", "Referal", "District", "Block", "GP", "Village", "Address", "Product Type", "Area (Acre)", "Size", "Spacing", "Crop", "Installation Date", "Farmer Share", "GPS", "Status", "Technician", "Location"];
  const rows = farmers.map((farmer) => [
    farmer.farmerName,
    farmer.mobileNo,
    farmer.referal,
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

function showTechnicianWorkflow(workflow) {
  const isQuery = workflow === "query";
  farmerRegistrationPanel.classList.toggle("hidden", isQuery);
  farmerQueryPanel.classList.toggle("hidden", !isQuery);
  showRegistrationButton.classList.toggle("active", !isQuery);
  showQueryButton.classList.toggle("active", isQuery);
}

function resetFarmerQueryForm() {
  farmerQueryForm.reset();
  farmerQueryMessage.textContent = "";
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
      referal: clean(formData.get("referal")),
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

async function submitFarmerQuery(event) {
  event.preventDefault();
  farmerQueryMessage.textContent = "";

  if (!auth.currentUser) {
    farmerQueryMessage.textContent = "Please login again.";
    return;
  }

  const submitButton = farmerQueryForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Saving...";

  try {
    const formData = new FormData(farmerQueryForm);
    await db.collection("farmerQueries").add({
      farmerName: clean(formData.get("farmerName")),
      mobileNo: clean(formData.get("mobileNo")),
      address: clean(formData.get("address")),
      area: clean(formData.get("area")),
      productType: formData.get("productType"),
      technicianId: auth.currentUser.uid,
      technicianEmail: auth.currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    resetFarmerQueryForm();
    farmerQueryMessage.textContent = "Farmer query submitted.";
  } catch (error) {
    farmerQueryMessage.textContent = error.message || "Failed to save farmer query.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Query";
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

function getInitials(name, email) {
  const source = clean(name) || clean(email).split("@")[0] || "IA";
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1
    ? parts[0][0] + parts[1][0]
    : source.slice(0, 2);
  return letters.toUpperCase();
}

function createProfilePhoto(name, email, role) {
  const initials = escapeHtml(getInitials(name, email));
  const roleColor = role === "admin" ? "#2f714a" : "#2f968b";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${roleColor}"/>
          <stop offset="1" stop-color="#8fbd46"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="36" fill="url(#g)"/>
      <circle cx="98" cy="30" r="22" fill="rgba(255,255,255,0.18)"/>
      <text x="64" y="76" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="#ffffff">${initials}</text>
    </svg>
  `;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
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

function formatDateTime(value) {
  const time = getTimeValue(value);
  return time ? new Date(time).toLocaleString() : "Not set";
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

function getRoleLookupError(error) {
  if (error.code === "permission-denied") {
    return "Login successful, but Firestore rules are blocking the users role document. Allow users to read their own users/{uid} document.";
  }

  return error.message || "Unable to load user role.";
}
