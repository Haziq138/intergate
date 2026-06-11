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

const paymentListContainer = document.getElementById("paymentListContainer");
const paymentSearchInput = document.getElementById("paymentSearchInput");
const paymentSearchBtn = document.getElementById("paymentSearchBtn");
const paymentStatusFilter = document.getElementById("paymentStatusFilter");

let allPayments = [];

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

function getStatusClass(status) {
    const value = (status || "pending").toLowerCase();

    if (value === "paid") {
        return "status-paid";
    }

    if (value === "rejected") {
        return "status-rejected";
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
        // Cara 1: Kalau document ID dalam Users sama dengan userID
        const userDoc = await getDoc(doc(db, "Users", userID));

        if (userDoc.exists()) {
            const user = userDoc.data();

            return (
                user.name ||
                user.fullName ||
                user.customerName ||
                user.username ||
                user.email ||
                userID
            );
        }

        // Cara 2: Kalau userID disimpan sebagai field dalam Users
        const userQuery = query(
            collection(db, "Users"),
            where("userID", "==", userID)
        );

        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
            let customerName = "";

            userSnapshot.forEach(function(docSnap) {
                const user = docSnap.data();

                customerName =
                    user.name ||
                    user.fullName ||
                    user.customerName ||
                    user.username ||
                    user.email ||
                    "";
            });

            return customerName;
        }

        return "";

    } catch (error) {
        console.log(error);
        return userID;
    }
}

async function loadPayments() {
    if (!protectStaffPage()) {
        return;
    }

    try {
        const paymentSnapshot = await getDocs(collection(db, "Payments"));

        if (paymentSnapshot.empty) {
            paymentListContainer.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-row">No payment records found.</td>
                </tr>
            `;
            return;
        }

        allPayments = [];

for (const paymentDoc of paymentSnapshot.docs) {
    const payment = paymentDoc.data();
    const customerName = await getCustomerName(payment.userID);

    if (!payment.customerName && customerName && customerName !== payment.userID) {
        await updateDoc(doc(db, "Payments", paymentDoc.id), {
            customerName: customerName
        });
    }

    allPayments.push({
        ...payment,
        docID: paymentDoc.id,
        customerName: customerName || payment.customerName || payment.userID || "--"
    });
}

        allPayments.sort(function(a, b) {
            const dateA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });

        displayPayments(allPayments);

    } catch (error) {
        alert("Error loading payment records: " + error.message);
        console.log(error);
    }
}

function displayPayments(payments) {
    if (payments.length === 0) {
        paymentListContainer.innerHTML = `
            <tr>
                <td colspan="8" class="empty-row">No matching payment record found.</td>
            </tr>
        `;
        return;
    }

    paymentListContainer.innerHTML = "";

    payments.forEach(function(payment) {
        const paymentID = payment.paymentID || payment.docID;
        const paymentStatus = payment.paymentStatus || "pending";

let proofDisplay = `<span class="no-proof">No proof</span>`;

if (payment.paymentProofURL) {
    proofDisplay = `
        <a href="${payment.paymentProofURL}" target="_blank" class="proof-link">
            View Proof
        </a>
    `;
} else if (payment.paymentProofName) {
    proofDisplay = `<span>${payment.paymentProofName}</span>`;
}

        paymentListContainer.innerHTML += `
            <tr>
                <td>${paymentID}</td>
                <td>${payment.bookingID || "--"}</td>
                <td>${payment.customerName || payment.userID || "--"}</td>
                <td>${payment.paymentMethod || "--"}</td>
                <td>${proofDisplay}</td>
                <td>
                    <span class="status ${getStatusClass(paymentStatus)}">${paymentStatus}</span>
                </td>
                <td>
                    <select class="status-select paymentStatusSelect" data-doc-id="${payment.docID}">
                        <option value="pending" ${paymentStatus === "pending" ? "selected" : ""}>Pending</option>
                        <option value="paid" ${paymentStatus === "paid" ? "selected" : ""}>Paid</option>
                        <option value="rejected" ${paymentStatus === "rejected" ? "selected" : ""}>Rejected</option>
                        <option value="unpaid" ${paymentStatus === "unpaid" ? "selected" : ""}>Unpaid</option>
                    </select>
                </td>
                <td>
                    <button class="verify-btn" data-doc-id="${payment.docID}" data-booking-id="${payment.bookingID || ""}">
                        Save
                    </button>
                </td>
            </tr>
        `;
    });

    addVerifyEvents();
}

function addVerifyEvents() {
    const verifyButtons = document.querySelectorAll(".verify-btn");

    verifyButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const paymentDocID = this.getAttribute("data-doc-id");
            const bookingID = this.getAttribute("data-booking-id");

            const statusSelect = document.querySelector(`.paymentStatusSelect[data-doc-id="${paymentDocID}"]`);
            const selectedStatus = statusSelect.value;

            updatePaymentStatus(paymentDocID, bookingID, selectedStatus);
        });
    });
}

async function updatePaymentStatus(paymentDocID, bookingID, selectedStatus) {
    const confirmUpdate = confirm("Update payment status to " + selectedStatus + "?");

    if (!confirmUpdate) {
        return;
    }

    try {
        const currentStaffID = localStorage.getItem("currentUserID") || "staff";

        await updateDoc(doc(db, "Payments", paymentDocID), {
            paymentStatus: selectedStatus,
            verifiedBy: currentStaffID,
            verifiedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        await updateRelatedBookingPaymentStatus(bookingID, selectedStatus);

        alert("Payment status updated successfully.");
        loadPayments();

    } catch (error) {
        alert("Error updating payment status: " + error.message);
        console.log(error);
    }
}

async function updateRelatedBookingPaymentStatus(bookingID, selectedStatus) {
    if (!bookingID) {
        return;
    }

    const directBookingRef = doc(db, "Bookings", bookingID);
    const directBookingDoc = await getDoc(directBookingRef);

    if (directBookingDoc.exists()) {
        await updateDoc(directBookingRef, {
            paymentStatus: selectedStatus,
            updatedAt: serverTimestamp()
        });
        return;
    }

    const bookingQuery = query(
        collection(db, "Bookings"),
        where("bookingID", "==", bookingID)
    );

    const bookingSnapshot = await getDocs(bookingQuery);

    for (const bookingDoc of bookingSnapshot.docs) {
        await updateDoc(doc(db, "Bookings", bookingDoc.id), {
            paymentStatus: selectedStatus,
            updatedAt: serverTimestamp()
        });
    }
}

function filterPayments() {
    const searchText = paymentSearchInput.value.toLowerCase();
    const selectedStatus = paymentStatusFilter.value;

    const filteredPayments = allPayments.filter(function(payment) {
        const paymentID = (payment.paymentID || payment.docID || "").toLowerCase();
        const bookingID = (payment.bookingID || "").toLowerCase();
        const customerName = (payment.customerName || "").toLowerCase();
        const paymentStatus = (payment.paymentStatus || "pending").toLowerCase();

        const matchSearch =
            paymentID.includes(searchText) ||
            bookingID.includes(searchText) ||
            customerName.includes(searchText);

        const matchStatus =
            selectedStatus === "all" ||
            paymentStatus === selectedStatus;

        return matchSearch && matchStatus;
    });

    displayPayments(filteredPayments);
}

paymentSearchBtn.addEventListener("click", filterPayments);
paymentStatusFilter.addEventListener("change", filterPayments);

paymentSearchInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        filterPayments();
    }
});
loadPayments();