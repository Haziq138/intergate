import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const totalBookings = document.getElementById("totalBookings");
const totalPayments = document.getElementById("totalPayments");
const pendingBookings = document.getElementById("pendingBookings");
const paidPayments = document.getElementById("paidPayments");

const bookingSummaryTable = document.getElementById("bookingSummary");
const paymentSummaryTable = document.getElementById("paymentSummary");
const reportTableBody = document.getElementById("reportTableBody");
const generatedDate = document.getElementById("generatedDate");
const printBtn = document.getElementById("printBtn");

function formatStatus(status) {
    if (!status) {
        return "Pending";
    }

    const cleanStatus = String(status).trim().toLowerCase();

    return cleanStatus.charAt(0).toUpperCase() + cleanStatus.slice(1);
}

function getStatusBadge(status) {
    const formattedStatus = formatStatus(status);
    const statusClass = formattedStatus.toLowerCase().replaceAll(" ", "-");

    return `
        <span class="status-badge status-${statusClass}">
            ${formattedStatus}
        </span>
    `;
}

function getTotalPrice(booking) {
    return Number(
        booking.totalPrice ||
        booking.total ||
        booking.totalAmount ||
        booking.roomTotal ||
        0
    );
}

async function loadReport() {
    try {
        const snapshot = await getDocs(collection(db, "Bookings"));

        let totalBookingCount = 0;
        let totalRevenue = 0;
        let pendingBookingCount = 0;
        let paidPaymentCount = 0;

        const bookingStatus = {
            Pending: 0,
            Approved: 0,
            Rejected: 0,
            Cancelled: 0,
            Completed: 0
        };

        const paymentStatus = {
            Unpaid: 0,
            Pending: 0,
            Paid: 0,
            Rejected: 0
        };

        reportTableBody.innerHTML = "";

        snapshot.forEach(function (docSnap) {
            const booking = docSnap.data();

            totalBookingCount++;

            const bookingStat = formatStatus(booking.bookingStatus || "Pending");
            const paymentStat = formatStatus(booking.paymentStatus || "Unpaid");
            const totalPrice = getTotalPrice(booking);

            totalRevenue += totalPrice;

            if (bookingStat === "Pending") {
                pendingBookingCount++;
            }

            if (paymentStat === "Paid") {
                paidPaymentCount++;
            }

            if (bookingStatus[bookingStat] !== undefined) {
                bookingStatus[bookingStat]++;
            }

            if (paymentStatus[paymentStat] !== undefined) {
                paymentStatus[paymentStat]++;
            }

            reportTableBody.innerHTML += `
                <tr>
                    <td>${booking.bookingID || docSnap.id}</td>
                    <td>${booking.customerName || booking.name || booking.userName || booking.userID || "--"}</td>
                    <td>${booking.roomName || booking.roomType || "--"}</td>
                    <td>RM ${totalPrice.toFixed(2)}</td>
                    <td>${getStatusBadge(bookingStat)}</td>
                    <td>${getStatusBadge(paymentStat)}</td>
                </tr>
            `;
        });

        if (totalBookingCount === 0) {
            reportTableBody.innerHTML = `
                <tr>
                    <td colspan="6">No booking records found.</td>
                </tr>
            `;
        }

        totalBookings.textContent = totalBookingCount;
        totalPayments.textContent = "RM " + totalRevenue.toFixed(2);
        pendingBookings.textContent = pendingBookingCount;
        paidPayments.textContent = paidPaymentCount;

        bookingSummaryTable.innerHTML = "";

        for (let status in bookingStatus) {
            bookingSummaryTable.innerHTML += `
                <tr>
                    <td>${getStatusBadge(status)}</td>
                    <td>${bookingStatus[status]}</td>
                </tr>
            `;
        }

        paymentSummaryTable.innerHTML = "";

        for (let status in paymentStatus) {
            paymentSummaryTable.innerHTML += `
                <tr>
                    <td>${getStatusBadge(status)}</td>
                    <td>${paymentStatus[status]}</td>
                </tr>
            `;
        }

        if (generatedDate) {
            generatedDate.textContent =
                "Report generated on: " + new Date().toLocaleString();
        }

    } catch (error) {
        console.log(error);
        alert("Error loading report: " + error.message);
    }
}

printBtn.addEventListener("click", function () {
    window.print();
});

loadReport();