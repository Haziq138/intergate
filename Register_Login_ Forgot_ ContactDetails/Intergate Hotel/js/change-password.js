import { db } from "./firebase-config.js";

import {
    collection,
    query,
    where,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const changePasswordBtn = document.getElementById("changePasswordBtn");

changePasswordBtn.addEventListener("click", async function() {

    const currentPassword = document.getElementById("currentPassword").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    const currentUserID = localStorage.getItem("currentUserID");

    if (!currentUserID) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    if (currentPassword === "" || newPassword === "" || confirmPassword === "") {
        alert("Please fill in all fields.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("New password does not match.");
        return;
    }

    try {
        const q = query(
            collection(db, "Users"),
            where("userID", "==", currentUserID)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            alert("User not found.");
            return;
        }

        let passwordUpdated = false;

        for (const docSnap of snapshot.docs) {
            const user = docSnap.data();

            if (user.password !== currentPassword) {
                alert("Old password is incorrect.");
                return;
            }

            await updateDoc(docSnap.ref, {
                password: newPassword,
                updatedAt: new Date()
            });

            passwordUpdated = true;
        }

        if (passwordUpdated) {
            alert("Password updated successfully.");
            window.location.href = "profile.html";
        }

    } catch (error) {
        alert("Error: " + error.message);
        console.log(error);
    }
});