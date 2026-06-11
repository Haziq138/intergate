import { db } from "./firebase-config.js";
import { collection, getDocs, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const contactForm = document.getElementById("contactForm");
const message = document.getElementById("messageArea");

let userDocID = "";

async function loadUser() {
    const currentUserID = localStorage.getItem("currentUserID");

    if (!currentUserID) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    const q = query(collection(db, "Users"), where("userID", "==", currentUserID));
    const snapshot = await getDocs(q);

    snapshot.forEach(function(docSnap) {
        userDocID = docSnap.id;
        const user = docSnap.data();

        document.getElementById("name").value = user.name || "";
        document.getElementById("phone").value = user.phone || "";
        document.getElementById("email").value = user.email || "";
    });
}

contactForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();

    if (name === "" || phone === "" || email === "") {
        message.style.display = "block";
        message.innerHTML = "Please fill in all fields";
        message.style.backgroundColor = "red";
        message.style.color = "white";
        return;
    }

    try {
        await updateDoc(doc(db, "Users", userDocID), {
            name: name,
            phone: phone,
            email: email,
            updatedAt: new Date()
        });

        message.style.display = "block";
        message.innerHTML = "Saved successfully!";
        message.style.backgroundColor = "green";
        message.style.color = "white";

    } catch (error) {
        message.style.display = "block";
        message.innerHTML = "Error: " + error.message;
        message.style.backgroundColor = "red";
        message.style.color = "white";
        console.log(error);
    }
});

loadUser();