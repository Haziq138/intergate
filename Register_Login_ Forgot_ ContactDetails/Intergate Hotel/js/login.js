import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    if (!emailInput || !passwordInput) {
        alert("Input ID in login.html is wrong. Please check id='loginEmail' and id='loginPassword'.");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (email === "" || password === "") {
        alert("Please enter email and password.");
        return;
    }

    try {
        const emailQuery = query(
            collection(db, "Users"),
            where("email", "==", email)
        );

        const emailSnapshot = await getDocs(emailQuery);

        if (emailSnapshot.empty) {
            alert("Email is not registered in the system. Please register first.");
            window.location.href = "register.html";
            return;
        }

        let userData = null;

        emailSnapshot.forEach(function(docSnap) {
            userData = docSnap.data();
        });

        if (userData.password !== password) {
            alert("Incorrect password. Please try again.");
            return;
        }

        localStorage.setItem("currentUserID", userData.userID);
        localStorage.setItem("currentUserRole", userData.role);

        alert("Login successful!");

        if (userData.role === "customer") {
            window.location.href = "home.html";
        }
        else if (userData.role === "staff") {
            window.location.href = "staff-dashboard.html";
        }
        else if (userData.role === "admin") {
            window.location.href = "admin-dashboard.html";
        }
        else {
            alert("Role not found.");
        }

    } catch (error) {
        alert("Error: " + error.message);
        console.log(error);
    }
});
