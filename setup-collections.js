const setupStatus = document.getElementById("setupStatus");
const createCollectionsBtn = document.getElementById("createCollectionsBtn");
const setupRole = document.getElementById("setupRole");
const setupEmail = document.getElementById("setupEmail");

firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

setupRole.addEventListener("change", () => {
  setupEmail.value = setupRole.value === "admin" ? "test@ishaagro.in" : "technician@ishaagro.in";
});

createCollectionsBtn.addEventListener("click", async () => {
  createCollectionsBtn.disabled = true;
  setupStatus.textContent = "Creating collections...";

  try {
    const role = setupRole.value;
    const email = setupEmail.value.trim();
    const password = document.getElementById("setupPassword").value;
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    if (!email || !password) {
      throw new Error("Enter the Firebase Auth email and password first.");
    }

    const credential = await auth.signInWithEmailAndPassword(email, password);
    const uid = credential.user.uid;

    await db.collection("users").doc(uid).set({
      name: role === "admin" ? "Admin" : "Technician",
      email,
      role,
      active: true,
      createdAt: timestamp
    }, { merge: true });

    await db.collection("farmers").doc("_setup").set({
      collectionName: "farmers",
      description: "Farmer registration and installation records.",
      createdAt: timestamp
    });

    await db.collection("reminders").doc("_setup").set({
      collectionName: "reminders",
      description: "Pending installation reminders.",
      createdAt: timestamp
    });

    await db.collection("farmerQueries").doc("_setup").set({
      collectionName: "farmerQueries",
      description: "Farmer query requests submitted by technicians.",
      createdAt: timestamp
    });

    setupStatus.textContent = "Done.\n\n" + role + " document created:\nusers/" + uid + "\n\nCollections created: users, farmers, reminders, farmerQueries.";
  } catch (error) {
    setupStatus.textContent = "Error: " + error.message;
  } finally {
    createCollectionsBtn.disabled = false;
  }
});
