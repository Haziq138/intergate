import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const paymentFilter = document.getElementById("paymentFilter");
const bookingTableBody = document.querySelector("#bookingTable tbody");

let allBookings = [];

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
        <span class="status ${statusClass}">
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

function formatDate(value) {
    if (!value) {
        return "--";
    }

    if (typeof value === "string") {
        return value;
    }

    if (value.seconds) {
        const date = new Date(value.seconds * 1000);
        return date.toLocaleDateString("en-MY");
    }

    if (value.toDate) {
        return value.toDate().toLocaleDateString("en-MY");
    }

    return "--";
}

/* FORMAT DATE WITH TIME FOR CHECK IN / CHECK OUT */
function formatDateWithTime(dateValue, timeValue) {
    if (!dateValue && !timeValue) {
        return "--";
    }

    if (dateValue && dateValue.seconds) {
        const date = new Date(dateValue.seconds * 1000);

        return date.toLocaleString("en-MY", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }

    if (dateValue && dateValue.toDate) {
        const date = dateValue.toDate();

        return date.toLocaleString("en-MY", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }

    const dateText = formatDate(dateValue);

    if (timeValue) {
        return dateText + "<br>" + timeValue;
    }

    return dateText;
}

function getCustomerName(booking) {
    return (
        booking.customerName ||
        booking.name ||
        booking.userName ||
        booking.fullName ||
        booking.userID ||
        "--"
    );
}

function getRoomName(booking) {
    return (
        booking.roomName ||
        booking.roomType ||
        booking.room ||
        "--"
    );
}

async function loadBookings() {
    try {
        const snapshot = await getDocs(collection(db, "Bookings"));

        allBookings = [];

        snapshot.forEach(function (docSnap) {
            allBookings.push({
                docID: docSnap.id,
                ...docSnap.data()
            });
        });

        displayBookings(allBookings);
        updateSummaryCards(allBookings);

    } catch (error) {
        console.log(error);
        alert("Error loading booking overview: " + error.message);
    }
}

function displayBookings(bookings) {
    bookingTableBody.innerHTML = "";

    if (bookings.length === 0) {
        bookingTableBody.innerHTML = `
            <tr>
                <td colspan="9">No booking records found.</td>
            </tr>
        `;
        return;
    }

    bookings.forEach(function (booking) {
        const bookingStatus = booking.bookingStatus || "Pending";
        const paymentStatus = booking.paymentStatus || "Unpaid";
        const totalPrice = getTotalPrice(booking);

        const checkInDate = formatDateWithTime(
            booking.checkInDate || booking.checkIn,
            booking.checkInTime || booking.checkIn_time
        );

        const checkOutDate = formatDateWithTime(
            booking.checkOutDate || booking.checkOut,
            booking.checkOutTime || booking.checkOut_time
        );

        bookingTableBody.innerHTML += `
            <tr>
                <td>${booking.bookingID || booking.docID}</td>
                <td>${getCustomerName(booking)}</td>
                <td>${getRoomName(booking)}</td>
                <td>${checkInDate}</td>
                <td>${checkOutDate}</td>
                <td>RM ${totalPrice.toFixed(2)}</td>
                <td>${getStatusBadge(bookingStatus)}</td>
                <td>${getStatusBadge(paymentStatus)}</td>
                <td>
                    <button class="view-btn" onclick="viewBookingDetails('${booking.bookingID || booking.docID}')">
                        View Details
                    </button>
                </td>
            </tr>
        `;
    });
}

function updateSummaryCards(bookings) {
    const totalCard = document.getElementById("totalBookings");
    const pendingCard = document.getElementById("pendingBookings");
    const approvedCard = document.getElementById("approvedBookings");
    const completedCard = document.getElementById("completedBookings");

    let pending = 0;
    let approved = 0;
    let completed = 0;

    bookings.forEach(function (booking) {
        const status = formatStatus(booking.bookingStatus || "Pending");

        if (status === "Pending") {
            pending++;
        }

        if (status === "Approved") {
            approved++;
        }

        if (status === "Completed") {
            completed++;
        }
    });

    if (totalCard) {
        totalCard.textContent = bookings.length;
    }

    if (pendingCard) {
        pendingCard.textContent = pending;
    }

    if (approvedCard) {
        approvedCard.textContent = approved;
    }

    if (completedCard) {
        completedCard.textContent = completed;
    }
}

function filterBookings() {
    const searchValue = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value.toLowerCase().trim();
    const selectedPayment = paymentFilter.value.toLowerCase().trim();

    const filteredBookings = allBookings.filter(function (booking) {
        const bookingID = (booking.bookingID || booking.docID || "").toLowerCase();
        const customer = getCustomerName(booking).toLowerCase();
        const room = getRoomName(booking).toLowerCase();
        const bookingStatus = (booking.bookingStatus || "Pending").toLowerCase();
        const paymentStatus = (booking.paymentStatus || "Unpaid").toLowerCase();

        const matchesSearch =
            bookingID.includes(searchValue) ||
            customer.includes(searchValue) ||
            room.includes(searchValue);

        const matchesStatus =
            selectedStatus === "" ||
            bookingStatus === selectedStatus;

        const matchesPayment =
            selectedPayment === "" ||
            paymentStatus === selectedPayment;

        return matchesSearch && matchesStatus && matchesPayment;
    });

    displayBookings(filteredBookings);
    updateSummaryCards(filteredBookings);
}

window.viewBookingDetails = function (bookingID) {
    const booking = allBookings.find(function (item) {
        return item.bookingID === bookingID || item.docID === bookingID;
    });

    if (!booking) {
        alert("Booking details not found.");
        return;
    }

    alert(
        "Booking ID: " + (booking.bookingID || booking.docID) +
        "\nCustomer: " + getCustomerName(booking) +
        "\nRoom: " + getRoomName(booking) +
        "\nCheck In: " + formatDateWithTime(
            booking.checkInDate || booking.checkIn,
            booking.checkInTime || booking.checkIn_time
        ).replace("<br>", " ") +
        "\nCheck Out: " + formatDateWithTime(
            booking.checkOutDate || booking.checkOut,
            booking.checkOutTime || booking.checkOut_time
        ).replace("<br>", " ") +
        "\nTotal: RM " + getTotalPrice(booking).toFixed(2) +
        "\nBooking Status: " + (booking.bookingStatus || "Pending") +
        "\nPayment Status: " + (booking.paymentStatus || "Unpaid")
    );
};

searchInput.addEventListener("keyup", filterBookings);
statusFilter.addEventListener("change", filterBookings);
paymentFilter.addEventListener("change", filterBookings);

loadBookings();