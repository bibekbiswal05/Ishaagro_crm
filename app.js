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

function getLoginError(error) {
  if (error.code === "auth/invalid-credential") {
    return "Invalid email or password.";
  }

  if (error.code === "auth/operation-not-allowed") {
    return "Email/password login is not enabled in Firebase.";
  }

  return error.message || "Login failed.";
}
