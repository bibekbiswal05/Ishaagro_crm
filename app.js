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

let currentLocation = null;

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
    const credential = await auth.signInWithEmailAndPassword(email, password);
    await openDashboardByRole(credential.user.uid);
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
    return;
  }

  if (userData.role === "technician") {
    showOnly(technicianDashboard);
    resetFarmerForm();
    return;
  }

  loginMessage.textContent = "Invalid role: " + (userData.role || "not set");
  await auth.signOut();
  showOnly(loginPage);
}

async function logout() {
  await auth.signOut();
  showOnly(loginPage);
}

function showOnly(activePage) {
  loginPage.classList.add("hidden");
  adminDashboard.classList.add("hidden");
  technicianDashboard.classList.add("hidden");
  activePage.classList.remove("hidden");
}

function resetFarmerForm() {
  farmerForm.reset();
  currentLocation = null;
  farmerMessage.textContent = "";
  setAutoDateTime();
  locationAuto.value = "";
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

    resetFarmerForm();
    farmerMessage.textContent = "Farmer data submitted successfully.";
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

function getLoginError(error) {
  if (error.code === "auth/invalid-credential") {
    return "Invalid email or password.";
  }

  if (error.code === "auth/operation-not-allowed") {
    return "Email/password login is not enabled in Firebase.";
  }

  return error.message || "Login failed.";
}
