import { db } from "./firebase-config.js";
import { collection, doc, setDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    if (!nameInput || !emailInput || !passwordInput) {
        alert("Input ID in register.html is not correct. Please check id='name', id='email', id='password'.");
        return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (name === "" || email === "" || password === "") {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const q = query(collection(db, "Users"), where("email", "==", email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            alert("Email already exists.");
            return;
        }

        const userID = "user" + Date.now();

        await setDoc(doc(db, "Users", userID), {
            userID: userID,
            name: name,
            email: email,
            password: password,
            phone: "",
            role: "customer",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        alert("Registration successful!");
        window.location.href = "login.html";

    } catch (error) {
        alert("Error: " + error.message);
        console.log(error);
    }
});