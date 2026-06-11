import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const totalBookings = document.getElementById("totalBookings");
const pendingBookings = document.getElementById("pendingBookings");
const approvedBookings = document.getElementById("approvedBookings");
const pendingPayments = document.getElementById("pendingPayments");
const latestBookingList = document.getElementById("latestBookingList");

function protectStaffPage() {
    const currentUserID = localStorage.getItem("currentUserID");
    const currentUserRole = localStorage.getItem("currentUserRole");

    if (!currentUserID) {
        alert("Please login first.");
        window.location.href = "login.html";
        return false;
    }

    if (currentUserRole && currentUserRole !== "staff" && currentUserRole !== "admin") {
        alert("Access denied.");
        window.location.href = "login.html";
        return false;
    }

    return true;
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

async function getCustomerName(userID) {
    if (!userID) {
        return "--";
    }

    try {
        const userDoc = await getDoc(doc(db, "Users", userID));

        if (userDoc.exists()) {
            const user = userDoc.data();
            return user.name || user.fullName || user.email || userID;
        }

        const userQuery = query(
            collection(db, "Users"),
            where("userID", "==", userID)
        );

        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            return userID;
        }

        let customerName = userID;

        userSnapshot.forEach(function(docSnap) {
            const user = docSnap.data();
            customerName = user.name || user.fullName || user.email || userID;
        });

        return customerName;

    } catch (error) {
        return userID;
    }
}

async function loadDashboardData() {
    if (!protectStaffPage()) {
        return;
    }

    try {
        const bookingSnapshot = await getDocs(collection(db, "Bookings"));
        const paymentSnapshot = await getDocs(collection(db, "Payments"));

        let totalBookingCount = 0;
        let pendingBookingCount = 0;
        let approvedBookingCount = 0;
        let pendingPaymentCount = 0;
        let bookings = [];

        for (const docSnap of bookingSnapshot.docs) {
            const booking = docSnap.data();
            const bookingStatus = (booking.bookingStatus || "pending").toLowerCase();
            const customerName = await getCustomerName(booking.userID);

            totalBookingCount++;

            if (bookingStatus === "pending") {
                pendingBookingCount++;
            }

            if (bookingStatus === "approved") {
                approvedBookingCount++;
            }

            bookings.push({
                docID: docSnap.id,
                customerName: customerName,
                ...booking
            });
        }

        paymentSnapshot.forEach(function(docSnap) {
            const payment = docSnap.data();
            const paymentStatus = (payment.paymentStatus || "pending").toLowerCase();

            if (paymentStatus === "pending") {
                pendingPaymentCount++;
            }
        });

        totalBookings.innerHTML = totalBookingCount;
        pendingBookings.innerHTML = pendingBookingCount;
        approvedBookings.innerHTML = approvedBookingCount;
        pendingPayments.innerHTML = pendingPaymentCount;

        bookings.sort(function(a, b) {
            const dateA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });

        displayLatestBookings(bookings.slice(0, 5));

    } catch (error) {
        console.log(error);
        latestBookingList.innerHTML = "<p>Error loading staff dashboard data.</p>";
    }
}

function displayLatestBookings(bookings) {
    if (bookings.length === 0) {
        latestBookingList.innerHTML = "<p>No booking records found.</p>";
        return;
    }

    latestBookingList.innerHTML = "";

    bookings.forEach(function(booking) {
        latestBookingList.innerHTML += `
            <div class="latest-item">
                <div>
                    <strong>${booking.customerName || booking.userID || "Customer"}</strong><br>
                    <span>${booking.roomName || "Room"} | ${formatDate(booking.checkInDate)} - ${formatDate(booking.checkOutDate)}</span>
                </div>

                <div>
                    <span class="status status-${booking.bookingStatus || "pending"}">
                        ${booking.bookingStatus || "pending"}
                    </span>
                </div>
            </div>
        `;
    });
}

loadDashboardData();