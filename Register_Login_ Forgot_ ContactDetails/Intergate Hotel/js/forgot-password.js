import { db } from "./firebase-config.js";
import { collection, getDocs, query, where, doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const forgotPasswordForm = document.getElementById("forgotPasswordForm");

forgotPasswordForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("resetEmail").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();

    if (email === "" || newPassword === "") {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const q = query(collection(db, "Users"), where("email", "==", email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            alert("Email not found in database.");
            return;
        }

        let userDocID = "";

        snapshot.forEach(function(docSnap) {
            userDocID = docSnap.id;
        });

        await updateDoc(doc(db, "Users", userDocID), {
            password: newPassword,
            updatedAt: new Date()
        });

        const resetID = "reset" + Date.now();

        await setDoc(doc(db, "PasswordReset", resetID), {
            resetID: resetID,
            email: email,
            resetToken: "token_" + Date.now(),            status: "used",
            createdAt: new Date()
        });

        alert("Password reset successful. Please login with your new password.");
        window.location.href = "login.html";

    } catch (error) {
        alert("Error: " + error.message);
        console.log(error);
    }
});