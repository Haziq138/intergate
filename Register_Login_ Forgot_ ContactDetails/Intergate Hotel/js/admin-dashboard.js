import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

/* =========================
   HTML ELEMENTS
   ========================= */

const totalRooms = document.getElementById("totalRooms");
const totalCustomers = document.getElementById("totalCustomers");
const totalBookings = document.getElementById("totalBookings");
const totalPayments = document.getElementById("totalPayments");

const latestBookingTableBody = document.getElementById("latestBookingTableBody");
const dashboardMessage = document.getElementById("dashboardMessage");

/* =========================
   MESSAGE
   ========================= */

function showMessage(message, type) {
    dashboardMessage.innerHTML = message;

    if (type === "success") {
        dashboardMessage.className = "message-box message-success";
    } else {
        dashboardMessage.className = "message-box message-error";
    }
}

/* =========================
   HELPER FUNCTIONS
   ========================= */

function safeText(value) {
    if (value === undefined || value === null || value === "") {
        return "--";
    }

    return value;
}

function formatMoney(value) {
    const numberValue = Number(value);

    if (isNaN(numberValue)) {
        return "RM 0";
    }

    return "RM " + numberValue.toFixed(2);
}

function getDateValue(value) {
    if (!value) {
        return 0;
    }

    if (value.toDate) {
        return value.toDate().getTime();
    }

    const parsedDate = new Date(value).getTime();

    if (isNaN(parsedDate)) {
        return 0;
    }

    return parsedDate;
}

function getStatusClass(status) {
    if (!status) {
        return "";
    }

    return status.toString().toLowerCase().replace(/\s+/g, "-");
}

function createStatusBadge(status) {
    const displayStatus = safeText(status);
    const statusClass = getStatusClass(displayStatus);

    return `<span class="status-badge ${statusClass}">${displayStatus}</span>`;
}

/* =========================
   LOAD DASHBOARD SUMMARY
   ========================= */

async function loadDashboardSummary() {
    try {
        const roomSnapshot = await getDocs(collection(db, "Rooms"));
        totalRooms.innerHTML = roomSnapshot.size;

        const userSnapshot = await getDocs(collection(db, "Users"));

        let customerCount = 0;

        userSnapshot.forEach(function (userDoc) {
            const user = userDoc.data();
            const role = (user.role || "").toLowerCase();

            if (role === "customer") {
                customerCount++;
            }
        });

        totalCustomers.innerHTML = customerCount;

        const bookingSnapshot = await getDocs(collection(db, "Bookings"));
        totalBookings.innerHTML = bookingSnapshot.size;

        let paymentCount = 0;

        try {
            const paymentSnapshot = await getDocs(collection(db, "payments"));
            paymentCount = paymentSnapshot.size;
        } catch (error) {
            console.log("Lowercase payments collection not found or no permission:", error);
        }

        if (paymentCount === 0) {
            try {
                const paymentSnapshotUppercase = await getDocs(collection(db, "Payments"));
                paymentCount = paymentSnapshotUppercase.size;
            } catch (error) {
                console.log("Uppercase Payments collection not found or no permission:", error);
            }
        }

        totalPayments.innerHTML = paymentCount;

    } catch (error) {
        console.log("Dashboard summary error:", error);
        showMessage("Error loading dashboard summary: " + error.message, "error");
    }
}

/* =========================
   LOAD LATEST BOOKINGS
   ========================= */

async function loadLatestBookings() {
    try {
        latestBookingTableBody.innerHTML = `
            <tr>
                <td colspan="6">Loading latest booking records...</td>
            </tr>
        `;

        const bookingSnapshot = await getDocs(collection(db, "Bookings"));

        let bookings = [];

        bookingSnapshot.forEach(function (bookingDoc) {
            const booking = bookingDoc.data();

            bookings.push({
                docID: bookingDoc.id,

                bookingID:
                    booking.bookingID ||
                    booking.bookingId ||
                    bookingDoc.id,

                customerName:
                    booking.customerName ||
                    booking.name ||
                    booking.customer ||
                    booking.userName ||
                    booking.userID ||
                    "--",

                roomName:
                    booking.roomName ||
                    booking.roomType ||
                    booking.room ||
                    booking.roomID ||
                    "--",

                totalPrice:
                    booking.totalPrice ||
                    booking.total ||
                    booking.price ||
                    0,

                bookingStatus:
                    booking.bookingStatus ||
                    booking.status ||
                    "Pending",

                paymentStatus:
                    booking.paymentStatus ||
                    booking.payment_status ||
                    "Pending",

                createdAt:
                    booking.createdAt ||
                    booking.updatedAt ||
                    booking.bookingDate ||
                    booking.date ||
                    ""
            });
        });

        bookings.sort(function (a, b) {
            return getDateValue(b.createdAt) - getDateValue(a.createdAt);
        });

        bookings = bookings.slice(0, 5);

        displayLatestBookings(bookings);

    } catch (error) {
        console.log("Latest booking error:", error);

        latestBookingTableBody.innerHTML = `
            <tr>
                <td colspan="6">Failed to load latest booking records: ${error.message}</td>
            </tr>
        `;

        showMessage("Error loading latest booking records: " + error.message, "error");
    }
}

/* =========================
   DISPLAY LATEST BOOKINGS
   ========================= */

function displayLatestBookings(bookings) {
    latestBookingTableBody.innerHTML = "";

    if (bookings.length === 0) {
        latestBookingTableBody.innerHTML = `
            <tr>
                <td colspan="6">No booking records found.</td>
            </tr>
        `;
        return;
    }

    bookings.forEach(function (booking) {
        latestBookingTableBody.innerHTML += `
            <tr>
                <td>${safeText(booking.bookingID)}</td>
                <td>${safeText(booking.customerName)}</td>
                <td>${safeText(booking.roomName)}</td>
                <td>${formatMoney(booking.totalPrice)}</td>
                <td>${createStatusBadge(booking.bookingStatus)}</td>
                <td>${createStatusBadge(booking.paymentStatus)}</td>
            </tr>
        `;
    });
}

/* =========================
   START PAGE
   ========================= */

loadDashboardSummary();
loadLatestBookings();