import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const bookingListContainer = document.getElementById("bookingListContainer");
const bookingSearchInput = document.getElementById("bookingSearchInput");
const bookingSearchBtn = document.getElementById("bookingSearchBtn");
const bookingStatusFilter = document.getElementById("bookingStatusFilter");

const checkTimeModal = document.getElementById("checkTimeModal");
const closeCheckTimeModalBtn = document.getElementById("closeCheckTimeModal");
const cancelCheckTimeBtn = document.getElementById("cancelCheckTimeBtn");
const saveCheckTimeBtn = document.getElementById("saveCheckTimeBtn");

let allBookings = [];

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
        return dateValue.toDate().toLocaleDateString("en-MY");
    }

    if (dateValue.seconds) {
        const date = new Date(dateValue.seconds * 1000);
        return date.toLocaleDateString("en-MY");
    }

    return dateValue;
}

function formatDateWithTime(dateValue, timeValue) {
    const dateText = formatDate(dateValue);

    if (dateText === "--" && !timeValue) {
        return "--";
    }

    if (dateText === "--" && timeValue) {
        return timeValue;
    }

    if (timeValue) {
        return dateText + "<br>" + timeValue;
    }

    return dateText;
}

function convertDateToInput(dateValue) {
    if (!dateValue) {
        return "";
    }

    let date;

    if (dateValue.toDate) {
        date = dateValue.toDate();
    } else if (dateValue.seconds) {
        date = new Date(dateValue.seconds * 1000);
    } else {
        date = new Date(dateValue);
    }

    if (isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().split("T")[0];
}

function getStatusClass(status) {
    const value = (status || "pending").toLowerCase();

    if (value === "approved" || value === "paid") {
        return "status-approved";
    }

    if (value === "rejected") {
        return "status-rejected";
    }

    if (value === "cancelled") {
        return "status-cancelled";
    }

    if (value === "completed") {
        return "status-completed";
    }

    if (value === "unpaid") {
        return "status-unpaid";
    }

    return "status-pending";
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

async function loadBookings() {
    if (!protectStaffPage()) {
        return;
    }

    try {
        const bookingSnapshot = await getDocs(collection(db, "Bookings"));

        if (bookingSnapshot.empty) {
            bookingListContainer.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-row">No booking records found.</td>
                </tr>
            `;
            return;
        }

        allBookings = [];

        for (const bookingDoc of bookingSnapshot.docs) {
            const booking = bookingDoc.data();
            const customerName = await getCustomerName(booking.userID);

            allBookings.push({
                docID: bookingDoc.id,
                customerName: customerName,
                ...booking
            });
        }

        allBookings.sort(function(a, b) {
            const dateA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });

        displayBookings(allBookings);

    } catch (error) {
        alert("Error loading bookings: " + error.message);
        console.log(error);
    }
}

function displayBookings(bookings) {
    if (bookings.length === 0) {
        bookingListContainer.innerHTML = `
            <tr>
                <td colspan="10" class="empty-row">No matching booking record found.</td>
            </tr>
        `;
        return;
    }

    bookingListContainer.innerHTML = "";

    bookings.forEach(function(booking) {
        const bookingID = booking.bookingID || booking.docID;
        const bookingStatus = booking.bookingStatus || "pending";
        const paymentStatus = booking.paymentStatus || "unpaid";

        const checkInDateTime = formatDateWithTime(
            booking.checkInDate || booking.checkIn,
            booking.checkInTime || booking.checkIn_time
        );

        const checkOutDateTime = formatDateWithTime(
            booking.checkOutDate || booking.checkOut,
            booking.checkOutTime || booking.checkOut_time
        );

        bookingListContainer.innerHTML += `
            <tr>
                <td>${bookingID}</td>

                <td>${booking.customerName || booking.userID || "--"}</td>

                <td>
                    ${booking.roomName || "--"}<br>
                    <small>${booking.roomType || ""}</small>
                </td>

                <td>${checkInDateTime}</td>

                <td>${checkOutDateTime}</td>

                <td>RM ${booking.totalPrice || 0}</td>

                <td>
                    <span class="status ${getStatusClass(bookingStatus)}">${bookingStatus}</span>
                </td>

                <td>
                    <span class="status ${getStatusClass(paymentStatus)}">${paymentStatus}</span>
                </td>

                <td>
                    <select class="status-select bookingStatusSelect" data-doc-id="${booking.docID}">
                        <option value="pending" ${bookingStatus === "pending" ? "selected" : ""}>Pending</option>
                        <option value="cancelled" ${bookingStatus === "cancelled" ? "selected" : ""}>Cancelled</option>
                        <option value="completed" ${bookingStatus === "completed" ? "selected" : ""}>Completed</option>
                    </select>
                </td>

                <td>
                    <button class="checktime-btn" data-doc-id="${booking.docID}">
                        Set Check In/Out
                    </button>

                    <button class="approve-btn" data-doc-id="${booking.docID}">
                        Approve
                    </button>

                    <button class="reject-btn" data-doc-id="${booking.docID}">
                        Reject
                    </button>

                    <button class="save-btn" data-doc-id="${booking.docID}">
                        Save
                    </button>
                </td>
            </tr>
        `;
    });

    addButtonEvents();
}

function addButtonEvents() {
    const checkTimeButtons = document.querySelectorAll(".checktime-btn");
    const approveButtons = document.querySelectorAll(".approve-btn");
    const rejectButtons = document.querySelectorAll(".reject-btn");
    const saveButtons = document.querySelectorAll(".save-btn");

    checkTimeButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const docID = this.getAttribute("data-doc-id");
            openCheckTimeModal(docID);
        });
    });

    approveButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const docID = this.getAttribute("data-doc-id");
            updateBookingStatus(docID, "approved");
        });
    });

    rejectButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const docID = this.getAttribute("data-doc-id");
            updateBookingStatus(docID, "rejected");
        });
    });

    saveButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const docID = this.getAttribute("data-doc-id");
            const statusSelect = document.querySelector(`.bookingStatusSelect[data-doc-id="${docID}"]`);
            updateBookingStatus(docID, statusSelect.value);
        });
    });
}

function openCheckTimeModal(docID) {
    const booking = allBookings.find(function(item) {
        return item.docID === docID;
    });

    if (!booking) {
        alert("Booking record not found.");
        return;
    }

    document.getElementById("checkTimeDocID").value = booking.docID;
    document.getElementById("modalBookingID").textContent = booking.bookingID || booking.docID;
    document.getElementById("modalCustomerName").textContent = booking.customerName || booking.userID || "--";
    document.getElementById("modalRoomName").textContent = booking.roomName || "--";

    document.getElementById("modalCheckInDate").value =
        convertDateToInput(booking.checkInDate || booking.checkIn);

    document.getElementById("modalCheckInTime").value =
        booking.checkInTime || booking.checkIn_time || "";

    document.getElementById("modalCheckOutDate").value =
        convertDateToInput(booking.checkOutDate || booking.checkOut);

    document.getElementById("modalCheckOutTime").value =
        booking.checkOutTime || booking.checkOut_time || "";

    checkTimeModal.style.display = "block";
}

function closeCheckTimeModal() {
    checkTimeModal.style.display = "none";
}

async function saveCheckTime() {
    const docID = document.getElementById("checkTimeDocID").value;

    const checkInDate = document.getElementById("modalCheckInDate").value;
    const checkInTime = document.getElementById("modalCheckInTime").value;
    const checkOutDate = document.getElementById("modalCheckOutDate").value;
    const checkOutTime = document.getElementById("modalCheckOutTime").value;

    if (!checkInDate || !checkInTime || !checkOutDate || !checkOutTime) {
        alert("Please fill in check-in and check-out date/time.");
        return;
    }

    try {
        await updateDoc(doc(db, "Bookings", docID), {
            checkInDate: checkInDate,
            checkInTime: checkInTime,
            checkOutDate: checkOutDate,
            checkOutTime: checkOutTime,
            updatedAt: serverTimestamp()
        });

        alert("Check-in and check-out date/time updated successfully.");

        closeCheckTimeModal();
        loadBookings();

    } catch (error) {
        alert("Error updating check-in/check-out: " + error.message);
        console.log(error);
    }
}

async function updateBookingStatus(docID, newStatus) {
    const confirmUpdate = confirm("Update booking status to " + newStatus + "?");

    if (!confirmUpdate) {
        return;
    }

    try {
        await updateDoc(doc(db, "Bookings", docID), {
            bookingStatus: newStatus,
            updatedAt: serverTimestamp()
        });

        alert("Booking status updated successfully.");
        loadBookings();

    } catch (error) {
        alert("Error updating booking status: " + error.message);
        console.log(error);
    }
}

function filterBookings() {
    const searchText = bookingSearchInput.value.toLowerCase();
    const selectedStatus = bookingStatusFilter.value;

    const filteredBookings = allBookings.filter(function(booking) {
        const bookingID = (booking.bookingID || booking.docID || "").toLowerCase();
        const customerName = (booking.customerName || "").toLowerCase();
        const roomName = (booking.roomName || "").toLowerCase();
        const bookingStatus = (booking.bookingStatus || "pending").toLowerCase();

        const matchSearch =
            bookingID.includes(searchText) ||
            customerName.includes(searchText) ||
            roomName.includes(searchText);

        const matchStatus =
            selectedStatus === "all" ||
            bookingStatus === selectedStatus;

        return matchSearch && matchStatus;
    });

    displayBookings(filteredBookings);
}

bookingSearchBtn.addEventListener("click", filterBookings);
bookingStatusFilter.addEventListener("change", filterBookings);

bookingSearchInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        filterBookings();
    }
});

if (saveCheckTimeBtn) {
    saveCheckTimeBtn.addEventListener("click", saveCheckTime);
}

if (closeCheckTimeModalBtn) {
    closeCheckTimeModalBtn.addEventListener("click", closeCheckTimeModal);
}

if (cancelCheckTimeBtn) {
    cancelCheckTimeBtn.addEventListener("click", closeCheckTimeModal);
}

loadBookings();