import { db } from "./firebase-config.js";

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
    limit
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const bookingHistoryContainer = document.getElementById("bookingHistoryContainer");

let allBookings = [];

function formatDate(dateValue) {
    if (!dateValue) {
        return "--";
    }

    if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString();
    }

    return dateValue;
}

function getStatusClass(status) {
    if (!status) {
        return "status-pending";
    }

    const lowerStatus = status.toLowerCase();

    if (lowerStatus === "approved" || lowerStatus === "paid" || lowerStatus === "confirmed") {
        return "status-approved";
    } else if (lowerStatus === "pending") {
        return "status-pending";
    } else if (lowerStatus === "unpaid") {
        return "status-unpaid";
    } else if (lowerStatus === "rejected") {
        return "status-rejected";
    } else if (lowerStatus === "cancelled") {
        return "status-cancelled";
    } else if (lowerStatus === "completed") {
        return "status-completed";
    }

    return "status-pending";
}

function showEmptyState() {
    bookingHistoryContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-calendar-alt"></i>
            <p>No bookings found!</p>
            <a href="booking.html" class="book-now-btn">Book Now</a>
        </div>
    `;
}

async function getPaymentByBookingID(bookingID) {
    try {
        const paymentQuery = query(
            collection(db, "Payments"),
            where("bookingID", "==", bookingID),
            limit(1)
        );

        const paymentSnapshot = await getDocs(paymentQuery);

        if (paymentSnapshot.empty) {
            return null;
        }

        let paymentData = null;

        paymentSnapshot.forEach(function(paymentDoc) {
            paymentData = {
                docID: paymentDoc.id,
                ...paymentDoc.data()
            };
        });

        return paymentData;

    } catch (error) {
        console.log(error);
        return null;
    }
}

async function loadBookingHistory() {
    const currentUserID = localStorage.getItem("currentUserID");

    if (!currentUserID) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    try {
        const bookingQuery = query(
            collection(db, "Bookings"),
            where("userID", "==", currentUserID)
        );

        const bookingSnapshot = await getDocs(bookingQuery);

        if (bookingSnapshot.empty) {
            showEmptyState();
            return;
        }

        allBookings = [];

        bookingSnapshot.forEach(function (bookingDoc) {
            allBookings.push({
                docID: bookingDoc.id,
                ...bookingDoc.data()
            });
        });

        allBookings.sort(function (a, b) {
            const dateA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });

        bookingHistoryContainer.innerHTML = "";

        allBookings.forEach(function (booking) {
            const bookingID = booking.bookingID || booking.docID;
            const bookingStatus = booking.bookingStatus || "pending";
            const paymentStatus = booking.paymentStatus || "unpaid";

            const disabledAction =
                bookingStatus.toLowerCase() === "cancelled" ||
                bookingStatus.toLowerCase() === "completed" ||
                bookingStatus.toLowerCase() === "rejected";

            bookingHistoryContainer.innerHTML += `
                <div class="booking-card">
                    <div class="booking-header">
                        <div>
                            <strong>${booking.roomName || "Room"}</strong>
                            <div class="booking-id">${bookingID}</div>
                        </div>

                        <span class="status ${getStatusClass(bookingStatus)}">
                            ${bookingStatus}
                        </span>
                    </div>

                    <div class="booking-details">
                        <div class="detail-item">
                            <i class="fas fa-bed"></i>
                            <span>${booking.roomType || "--"}</span>
                        </div>

                        <div class="detail-item">
                            <i class="fas fa-calendar-check"></i>
                            <span>Check-in: ${formatDate(booking.checkInDate)}</span>
                        </div>

                        <div class="detail-item">
                            <i class="fas fa-calendar-day"></i>
                            <span>Check-out: ${formatDate(booking.checkOutDate)}</span>
                        </div>

                        <div class="detail-item">
                            <i class="fas fa-moon"></i>
                            <span>${booking.numberOfNights || 0} night(s)</span>
                        </div>

                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <span>${booking.numberOfGuests || booking.guests || 1} guest(s)</span>
                        </div>

                        <div class="detail-item">
                            <i class="fas fa-money-bill"></i>
                            <span>RM ${booking.totalPrice || 0}</span>
                        </div>

                        <div class="detail-item">
                            <i class="fas fa-credit-card"></i>
                            <span>
                                Payment:
                                <span class="status ${getStatusClass(paymentStatus)}">
                                    ${paymentStatus}
                                </span>
                            </span>
                        </div>
                    </div>

                    <div class="booking-footer">
                        <div class="booking-date">
                            Created: ${formatDate(booking.createdAt)}
                        </div>

                        <div class="action-buttons">
                            <button 
                                class="update-btn updateBookingBtn"
                                data-doc-id="${booking.docID}"
                                data-room-price="${booking.roomPrice || 0}"
                                ${disabledAction ? "disabled" : ""}
                            >
                                Update
                            </button>

                            <button 
                                class="cancel-btn cancelBookingBtn"
                                data-doc-id="${booking.docID}"
                                ${disabledAction ? "disabled" : ""}
                            >
                                Cancel
                            </button>

                            <button 
                                class="receipt-btn receiptBookingBtn"
                                data-booking-id="${bookingID}"
                            >
                                Receipt
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        addButtonEvents();

    } catch (error) {
        alert("Error loading booking history: " + error.message);
        console.log(error);
    }
}

function addButtonEvents() {
    const updateButtons = document.querySelectorAll(".updateBookingBtn");
    const cancelButtons = document.querySelectorAll(".cancelBookingBtn");
    const receiptButtons = document.querySelectorAll(".receiptBookingBtn");

    updateButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const docID = this.getAttribute("data-doc-id");
            const roomPrice = Number(this.getAttribute("data-room-price"));
            updateBooking(docID, roomPrice);
        });
    });

    cancelButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const docID = this.getAttribute("data-doc-id");
            cancelBooking(docID);
        });
    });

    receiptButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const bookingID = this.getAttribute("data-booking-id");
            viewPaymentReceipt(bookingID);
        });
    });
}

async function updateBooking(docID, roomPrice) {
    const newCheckIn = prompt("Enter new check-in date (YYYY-MM-DD):");
    const newCheckOut = prompt("Enter new check-out date (YYYY-MM-DD):");

    if (!newCheckIn || !newCheckOut) {
        alert("Update cancelled. Please enter both dates.");
        return;
    }

    const checkInDate = new Date(newCheckIn);
    const checkOutDate = new Date(newCheckOut);

    if (checkOutDate <= checkInDate) {
        alert("Check-out date must be after check-in date.");
        return;
    }

    const timeDifference = checkOutDate - checkInDate;
    const numberOfNights = timeDifference / (1000 * 60 * 60 * 24);
    const totalPrice = roomPrice * numberOfNights;

    try {
        await updateDoc(doc(db, "Bookings", docID), {
            checkInDate: newCheckIn,
            checkOutDate: newCheckOut,
            numberOfNights: numberOfNights,
            totalPrice: totalPrice,
            bookingStatus: "pending",
            updatedAt: serverTimestamp()
        });

        alert("Booking updated successfully.");
        loadBookingHistory();

    } catch (error) {
        alert("Error updating booking: " + error.message);
        console.log(error);
    }
}

async function cancelBooking(docID) {
    const confirmCancel = confirm("Are you sure you want to cancel this booking?");

    if (!confirmCancel) {
        return;
    }

    try {
        await updateDoc(doc(db, "Bookings", docID), {
            bookingStatus: "cancelled",
            updatedAt: serverTimestamp()
        });

        alert("Booking cancelled successfully.");
        loadBookingHistory();

    } catch (error) {
        alert("Error cancelling booking: " + error.message);
        console.log(error);
    }
}

async function viewPaymentReceipt(bookingID) {
    const booking = allBookings.find(function(item) {
        return item.bookingID === bookingID || item.docID === bookingID;
    });

    if (!booking) {
        alert("Booking data not found.");
        return;
    }

    const payment = await getPaymentByBookingID(bookingID);

    const receiptID = payment ? "receipt_" + (payment.paymentID || bookingID) : "receipt_" + bookingID;
    const paymentID = payment ? payment.paymentID || payment.docID || "--" : "--";
    const paymentMethod = payment ? payment.paymentMethod || "--" : "--";
    const paymentStatus = payment ? payment.paymentStatus || booking.paymentStatus || "unpaid" : booking.paymentStatus || "unpaid";
    const paymentProofURL = payment ? payment.paymentProofURL || "" : "";
    const paymentProofName = payment ? payment.paymentProofName || "" : "";
    const verifiedBy = payment ? payment.verifiedBy || "--" : "--";
    const verifiedAt = payment ? formatDate(payment.verifiedAt) : "--";
    const paymentDate = payment ? formatDate(payment.createdAt) : "--";

    let proofDisplay = "No payment proof";

    if (paymentProofURL) {
        proofDisplay = `<a href="${paymentProofURL}" target="_blank">View Payment Proof</a>`;
    } else if (paymentProofName) {
        proofDisplay = paymentProofName;
    }

    const receiptWindow = window.open("", "_blank");

    receiptWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Receipt</title>

            <style>
                body {
                    font-family: Georgia, 'Times New Roman', Times, serif;
                    background: #f4f4f4;
                    padding: 30px;
                    color: #222;
                }

                .receipt {
                    max-width: 750px;
                    margin: auto;
                    background: white;
                    border-radius: 14px;
                    padding: 30px;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.12);
                    border-top: 8px solid maroon;
                }

                .receipt-header {
                    text-align: center;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 18px;
                    margin-bottom: 22px;
                }

                .receipt-header h1 {
                    color: maroon;
                    margin-bottom: 8px;
                    letter-spacing: 1px;
                }

                .receipt-header p {
                    color: #555;
                    margin: 4px 0;
                }

                .section-title {
                    color: maroon;
                    font-size: 18px;
                    margin-top: 24px;
                    margin-bottom: 12px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 6px;
                }

                .info-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 20px;
                    padding: 9px 0;
                    border-bottom: 1px solid #f0f0f0;
                }

                .label {
                    font-weight: bold;
                    color: #444;
                }

                .value {
                    text-align: right;
                    color: #222;
                }

                .total-row {
                    font-size: 20px;
                    font-weight: bold;
                    color: maroon;
                    border-top: 2px dashed #ccc;
                    margin-top: 12px;
                    padding-top: 16px;
                }

                .note {
                    margin-top: 25px;
                    background: #fff3cd;
                    color: #856404;
                    padding: 14px;
                    border-radius: 10px;
                    font-size: 14px;
                }

.buttons {
    text-align: center;
    margin-top: 25px;
    display: flex;
    justify-content: center;
    gap: 12px;
}

                button {
                    background: maroon;
                    color: white;
                    border: none;
                    padding: 12px 26px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: bold;
                    font-family: Georgia, 'Times New Roman', Times, serif;
                }

                button:hover {
                    background: #660000;
                }

                .home-btn {
    background: white;
    color: maroon;
    border: 1px solid maroon;
}

.home-btn:hover {
    background: #f5d6d6;
}

                a {
                    color: maroon;
                    font-weight: bold;
                }

                @media print {
                    body {
                        background: white;
                        padding: 0;
                    }

                    .receipt {
                        box-shadow: none;
                        border-radius: 0;
                    }

                    .buttons {
                        display: none;
                    }
                }
            </style>
        </head>

        <body>
            <div class="receipt">
                <div class="receipt-header">
                    <h1>Intergate Hotel</h1>
                    <p>Payment Receipt</p>
                    <p>Thank you for choosing Intergate Hotel.</p>
                </div>

                <div class="section-title">Receipt Information</div>

                <div class="info-row">
                    <span class="label">Receipt ID</span>
                    <span class="value">${receiptID}</span>
                </div>

                <div class="info-row">
                    <span class="label">Booking ID</span>
                    <span class="value">${bookingID}</span>
                </div>

                <div class="info-row">
                    <span class="label">Payment ID</span>
                    <span class="value">${paymentID}</span>
                </div>

                <div class="info-row">
                    <span class="label">Payment Date</span>
                    <span class="value">${paymentDate}</span>
                </div>

                <div class="section-title">Booking Information</div>

                <div class="info-row">
                    <span class="label">Room Name</span>
                    <span class="value">${booking.roomName || "--"}</span>
                </div>

                <div class="info-row">
                    <span class="label">Room Type</span>
                    <span class="value">${booking.roomType || "--"}</span>
                </div>

                <div class="info-row">
                    <span class="label">Check In</span>
                    <span class="value">${formatDate(booking.checkInDate)}</span>
                </div>

                <div class="info-row">
                    <span class="label">Check Out</span>
                    <span class="value">${formatDate(booking.checkOutDate)}</span>
                </div>

                <div class="info-row">
                    <span class="label">Number of Nights</span>
                    <span class="value">${booking.numberOfNights || 0}</span>
                </div>

                <div class="info-row">
                    <span class="label">Number of Guests</span>
                    <span class="value">${booking.numberOfGuests || booking.guests || 1}</span>
                </div>

                <div class="info-row">
                    <span class="label">Booking Status</span>
                    <span class="value">${booking.bookingStatus || "pending"}</span>
                </div>

                <div class="section-title">Payment Information</div>

                <div class="info-row">
                    <span class="label">Payment Method</span>
                    <span class="value">${paymentMethod}</span>
                </div>

                <div class="info-row">
                    <span class="label">Payment Status</span>
                    <span class="value">${paymentStatus}</span>
                </div>

                <div class="info-row">
                    <span class="label">Payment Proof</span>
                    <span class="value">${proofDisplay}</span>
                </div>

                <div class="info-row">
                    <span class="label">Verified By</span>
                    <span class="value">${verifiedBy}</span>
                </div>

                <div class="info-row">
                    <span class="label">Verified Date</span>
                    <span class="value">${verifiedAt}</span>
                </div>

                <div class="info-row total-row">
                    <span class="label">Total Payment</span>
                    <span class="value">RM ${booking.totalPrice || 0}</span>
                </div>

                <div class="note">
                    Please keep this receipt for your reference. Payment status is subject to staff verification.
                </div>

<div class="buttons">
    <button onclick="window.print()">Print Receipt</button>

    <button class="home-btn" onclick="
        if (window.opener) {
            window.opener.location.href = 'home.html';
            window.close();
        } else {
            window.location.href = 'home.html';
        }
    ">
        Back to Homepage
    </button>
</div>
            </div>
        </body>
        </html>
    `);

    receiptWindow.document.close();
}

loadBookingHistory();