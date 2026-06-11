import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    query,
    where,
    doc,
    setDoc,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const roomSelect = document.getElementById("roomSelect");
const roomType = document.getElementById("roomType");
const roomPrice = document.getElementById("roomPrice");
const checkInDate = document.getElementById("checkInDate");
const checkOutDate = document.getElementById("checkOutDate");
const numberOfNights = document.getElementById("numberOfNights");
const numberOfGuests = document.getElementById("numberOfGuests");
const totalPrice = document.getElementById("totalPrice");
const bookingForm = document.getElementById("bookingForm");

let rooms = [];

function getRoomIDFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("roomID");
}

async function loadRooms() {
    try {
        const snapshot = await getDocs(collection(db, "Rooms"));

        rooms = [];
        roomSelect.innerHTML = `<option value="">Select Room</option>`;

        snapshot.forEach(function(docSnap) {
            const room = docSnap.data();
            rooms.push(room);

            roomSelect.innerHTML += `
                <option value="${room.roomID}">
                    ${room.roomName}
                </option>
            `;
        });

        const selectedRoomID = getRoomIDFromURL();

        if (selectedRoomID) {
            roomSelect.value = selectedRoomID;
            displaySelectedRoom();
        }

    } catch (error) {
        alert("Error loading rooms: " + error.message);
        console.log(error);
    }
}

function displaySelectedRoom() {
    const selectedRoomID = roomSelect.value;

    const selectedRoom = rooms.find(function(room) {
        return room.roomID === selectedRoomID;
    });

    if (!selectedRoom) {
        roomType.value = "";
        roomPrice.value = "";
        totalPrice.value = "";
        return;
    }

    roomType.value = selectedRoom.roomType;
    roomPrice.value = selectedRoom.price;

    calculateTotal();
}

function calculateNights() {
    const checkIn = checkInDate.value;
    const checkOut = checkOutDate.value;

    if (checkIn !== "" && checkOut !== "") {
        const checkInObj = new Date(checkIn + "T00:00:00");
        const checkOutObj = new Date(checkOut + "T00:00:00");

        if (checkOutObj <= checkInObj) {
            numberOfNights.value = "";
            totalPrice.value = "";
            return;
        }

        const diffTime = checkOutObj - checkInObj;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        numberOfNights.value = diffDays;
        calculateTotal();
    }
}

function calculateTotal() {
    const price = Number(roomPrice.value);
    const nights = Number(numberOfNights.value);

    if (price > 0 && nights > 0) {
        totalPrice.value = price * nights;
    }
}

roomSelect.addEventListener("change", displaySelectedRoom);
checkInDate.addEventListener("change", calculateNights);
checkOutDate.addEventListener("change", calculateNights);

bookingForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const currentUserID = localStorage.getItem("currentUserID");

    if (!currentUserID) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    const selectedRoomID = roomSelect.value;

    const selectedRoom = rooms.find(function(room) {
        return room.roomID === selectedRoomID;
    });

    if (!selectedRoom) {
        alert("Please select a room.");
        return;
    }

    if (selectedRoom.status.toLowerCase() !== "available") {
    alert("This room is currently unavailable.");
    return;
    }

    if (checkInDate.value === "" || checkOutDate.value === "") {
        alert("Please select check-in and check-out date.");
        return;
    }

    if (numberOfNights.value === "" || Number(numberOfNights.value) <= 0) {
        alert("Check-out date must be after check-in date.");
        return;
    }

    if (numberOfGuests.value === "" || Number(numberOfGuests.value) <= 0) {
        alert("Please enter number of guests.");
        return;
    }

    try {
        const bookingID = "booking" + Date.now();

        await setDoc(doc(db, "Bookings", bookingID), {
            bookingID: bookingID,
            userID: currentUserID,

            roomID: selectedRoom.roomID,
            roomName: selectedRoom.roomName,
            roomType: selectedRoom.roomType,
            roomPrice: Number(selectedRoom.price),

            checkInDate: Timestamp.fromDate(new Date(checkInDate.value + "T00:00:00")),
            checkOutDate: Timestamp.fromDate(new Date(checkOutDate.value + "T00:00:00")),

            numberOfNights: Number(numberOfNights.value),
            numberOfGuests: Number(numberOfGuests.value),
            totalPrice: Number(totalPrice.value),

            bookingStatus: "pending",
            paymentStatus: "unpaid",

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        alert("Booking details saved. Please continue to payment.");

        window.location.href = "paymentpage.html?bookingID=" + bookingID;

    } catch (error) {
        alert("Error saving booking: " + error.message);
        console.log(error);
    }
});

loadRooms();