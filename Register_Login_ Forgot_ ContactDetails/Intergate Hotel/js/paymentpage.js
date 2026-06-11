import { db } from "./firebase-config.js";

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs,
    limit
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_UPLOAD_PRESET
} from "./cloudinary-config.js";

const paymentProofInput = document.getElementById("paymentProof");
const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
const uploadArea = document.getElementById("uploadArea");
const paymentForm = document.getElementById("paymentForm");

const displayRoom = document.getElementById("displayRoom");
const displayRoomType = document.getElementById("displayRoomType");
const displayCheckIn = document.getElementById("displayCheckIn");
const displayCheckOut = document.getElementById("displayCheckOut");
const displayNights = document.getElementById("displayNights");
const displayGuests = document.getElementById("displayGuests");
const displayTotal = document.getElementById("displayTotal");

const urlParams = new URLSearchParams(window.location.search);
const bookingID = urlParams.get("bookingID");

let bookingData = null;
let bookingDocID = null;

function formatDate(dateValue) {
    if (!dateValue) {
        return "--";
    }

    if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString();
    }

    return dateValue;
}

function displayBookingSummary() {
    if (!bookingData) {
        return;
    }

    displayRoom.innerHTML = bookingData.roomName || "--";
    displayRoomType.innerHTML = bookingData.roomType || "--";
    displayCheckIn.innerHTML = formatDate(bookingData.checkInDate);
    displayCheckOut.innerHTML = formatDate(bookingData.checkOutDate);
    displayNights.innerHTML = bookingData.numberOfNights || bookingData.nights || "--";
    displayGuests.innerHTML = bookingData.numberOfGuests || bookingData.guests || "--";
    displayTotal.innerHTML = "RM " + (bookingData.totalPrice || 0);
}

async function uploadPaymentProofToCloudinary(file) {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "payment_proofs");

const cloudinaryURL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const response = await fetch(cloudinaryURL, {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    if (!response.ok) {
        console.log(data);
        throw new Error(data.error?.message || "Cloudinary upload failed.");
    }

    return {
        paymentProofURL: data.secure_url,
        cloudinaryPublicID: data.public_id
    };
}

async function loadBookingData() {
    if (!bookingID) {
        alert("Booking ID not found in URL.");
        window.location.href = "history.html";
        return;
    }

    try {
        const directBookingRef = doc(db, "Bookings", bookingID);
        const directBookingSnap = await getDoc(directBookingRef);

        if (directBookingSnap.exists()) {
            bookingData = directBookingSnap.data();
            bookingDocID = directBookingSnap.id;
            displayBookingSummary();
            return;
        }

        const bookingQuery = query(
            collection(db, "Bookings"),
            where("bookingID", "==", bookingID),
            limit(1)
        );

        const bookingSnapshot = await getDocs(bookingQuery);

        if (bookingSnapshot.empty) {
            alert("Booking record not found.");
            window.location.href = "history.html";
            return;
        }

        bookingSnapshot.forEach(function(docSnap) {
            bookingData = docSnap.data();
            bookingDocID = docSnap.id;
        });

        displayBookingSummary();

    } catch (error) {
        console.log(error);
        alert("Error loading booking data: " + error.message);
    }
}

function setupPaymentMethodDisplay() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');

    paymentMethods.forEach(function(method) {
        method.addEventListener("change", function() {
            if (this.value === "online transfer") {
                uploadArea.style.display = "block";
            } else {
                uploadArea.style.display = "none";
                paymentProofInput.value = "";
            }
        });
    });
}

async function confirmPayment() {
    if (!bookingData || !bookingDocID) {
        alert("Booking data not loaded yet.");
        return;
    }

    const userID = localStorage.getItem("currentUserID");
    const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = selectedPaymentMethod ? selectedPaymentMethod.value : "";
    const proofFile = paymentProofInput.files[0];

    if (!userID) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    if (!paymentMethod) {
        alert("Please select payment method.");
        return;
    }

    let paymentStatus = "unpaid";
    let paymentProofName = "";
    let paymentProofURL = "";
    let cloudinaryPublicID = "";

    try {
        confirmPaymentBtn.disabled = true;
        confirmPaymentBtn.innerHTML = "Processing...";

        if (paymentMethod === "online transfer") {
            if (!proofFile) {
                alert("Please upload payment proof.");
                confirmPaymentBtn.disabled = false;
                confirmPaymentBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Payment';
                return;
            }

            const uploadResult = await uploadPaymentProofToCloudinary(proofFile);

            paymentStatus = "pending";
            paymentProofName = proofFile.name;
            paymentProofURL = uploadResult.paymentProofURL;
            cloudinaryPublicID = uploadResult.cloudinaryPublicID;
        }

        if (paymentMethod === "cash") {
            paymentStatus = "unpaid";
        }

        const paymentID = "payment_" + bookingID;

        await setDoc(doc(db, "Payments", paymentID), {
            paymentID: paymentID,
            bookingID: bookingID,
            userID: userID,

            customerName: bookingData.customerName || bookingData.name || "",
            roomID: bookingData.roomID || "",
            roomName: bookingData.roomName || "",
            roomType: bookingData.roomType || "",

            checkInDate: bookingData.checkInDate || "",
            checkOutDate: bookingData.checkOutDate || "",
            numberOfNights: bookingData.numberOfNights || bookingData.nights || 0,
            numberOfGuests: bookingData.numberOfGuests || bookingData.guests || 0,

            totalPrice: bookingData.totalPrice || 0,
            paymentMethod: paymentMethod,
            paymentStatus: paymentStatus,

            paymentProofName: paymentProofName,
            paymentProofURL: paymentProofURL,
            cloudinaryPublicID: cloudinaryPublicID,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            verifiedBy: "",
            verifiedAt: ""
        });

        await updateDoc(doc(db, "Bookings", bookingDocID), {
            paymentMethod: paymentMethod,
            paymentStatus: paymentStatus,
            updatedAt: serverTimestamp()
        });

        alert("Payment submitted successfully.");
        window.location.href = "bookconfirmation.html?bookingID=" + bookingID;

    } catch (error) {
        console.log(error);
        alert("Error submitting payment: " + error.message);

        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Payment';
    }
}

if (paymentForm) {
    paymentForm.addEventListener("submit", function(event) {
        event.preventDefault();
    });
}

confirmPaymentBtn.addEventListener("click", confirmPayment);

setupPaymentMethodDisplay();
loadBookingData();