import { db } from "./firebase-config.js";

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const displayBookingID = document.getElementById("displayBookingID");
const displayRoom = document.getElementById("displayRoom");
const displayRoomType = document.getElementById("displayRoomType");
const displayCheckin = document.getElementById("displayCheckin");
const displayCheckout = document.getElementById("displayCheckout");
const displayNights = document.getElementById("displayNights");
const displayGuests = document.getElementById("displayGuests");
const displayTotal = document.getElementById("displayTotal");
const bookingStatus = document.getElementById("bookingStatus");

const paymentMethod = document.getElementById("paymentMethod");
const paymentStatus = document.getElementById("paymentStatus");
const transactionId = document.getElementById("transactionId");
const paymentDate = document.getElementById("paymentDate");

function getBookingIDFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("bookingID");
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "--";
    }

    if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString();
    }

    return dateValue;
}

function setStatusBadge(element, status) {
    element.className = "status-badge";

    if (status === "paid" || status === "approved") {
        element.classList.add("status-paid");
    } else if (status === "pending") {
        element.classList.add("status-pending");
    } else if (status === "unpaid") {
        element.classList.add("status-unpaid");
    } else if (status === "rejected" || status === "cancelled") {
        element.classList.add("status-rejected");
    }
}

async function loadConfirmationData() {
    const bookingID = getBookingIDFromURL();

    if (!bookingID) {
        alert("Booking ID not found.");
        window.location.href = "home.html";
        return;
    }

    try {
        const bookingDoc = await getDoc(doc(db, "Bookings", bookingID));

        if (!bookingDoc.exists()) {
            alert("Booking not found.");
            window.location.href = "home.html";
            return;
        }

        const booking = bookingDoc.data();

        displayBookingID.innerHTML = booking.bookingID || bookingID;
        displayRoom.innerHTML = booking.roomName || "--";
        displayRoomType.innerHTML = booking.roomType || "--";
        displayCheckin.innerHTML = formatDate(booking.checkInDate);
        displayCheckout.innerHTML = formatDate(booking.checkOutDate);
        displayNights.innerHTML = booking.numberOfNights || "--";
        displayGuests.innerHTML = booking.numberOfGuests || "--";
        displayTotal.innerHTML = "RM " + (booking.totalPrice || 0);

        bookingStatus.innerHTML = booking.bookingStatus || "pending";
        setStatusBadge(bookingStatus, booking.bookingStatus || "pending");

        const paymentQuery = query(
            collection(db, "Payments"),
            where("bookingID", "==", bookingID)
        );

        const paymentSnapshot = await getDocs(paymentQuery);

        if (paymentSnapshot.empty) {
            paymentMethod.innerHTML = "Not submitted";
            paymentStatus.innerHTML = booking.paymentStatus || "unpaid";
            transactionId.innerHTML = "--";
            paymentDate.innerHTML = "--";
            setStatusBadge(paymentStatus, booking.paymentStatus || "unpaid");
            return;
        }

        paymentSnapshot.forEach(function(paymentDoc) {
            const payment = paymentDoc.data();

            paymentMethod.innerHTML = payment.paymentMethod || "--";
            paymentStatus.innerHTML = payment.paymentStatus || "--";
            transactionId.innerHTML = payment.paymentID || paymentDoc.id;
            paymentDate.innerHTML = formatDate(payment.createdAt);

            setStatusBadge(paymentStatus, payment.paymentStatus);
        });

    } catch (error) {
        alert("Error loading confirmation data: " + error.message);
        console.log(error);
    }
}

loadConfirmationData();