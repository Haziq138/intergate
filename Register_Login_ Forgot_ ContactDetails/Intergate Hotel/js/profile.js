import { db } from "./firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profilePhone = document.getElementById("profilePhone");

async function loadProfile() {
    const currentUserID = localStorage.getItem("currentUserID");

    if (!currentUserID) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    try {
        const q = query(collection(db, "Users"), where("userID", "==", currentUserID));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            alert("User not found.");
            return;
        }

        snapshot.forEach(function(docSnap) {
            const user = docSnap.data();

            profileName.innerHTML = user.name || "-";
            profileEmail.innerHTML = user.email || "-";
            profilePhone.innerHTML = user.phone || "-";
        });

    } catch (error) {
        alert("Error loading profile: " + error.message);
        console.log(error);
    }
}

loadProfile();