import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const roomContainer = document.getElementById("roomContainer");
const facilityContainer = document.getElementById("facilityContainer");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const availabilitySelect = document.getElementById("availabilitySelect");

let rooms = [];

function getRoomStatusClass(status) {
    const lowerStatus = (status || "unavailable").toLowerCase().trim();

    if (lowerStatus === "available") {
        return "status-available";
    }

    if (lowerStatus === "unavailable") {
        return "status-unavailable";
    }

    if (lowerStatus === "occupied") {
        return "status-occupied";
    }

    if (lowerStatus === "on maintenance") {
        return "status-maintenance";
    }

    return "status-unavailable";
}

async function loadRooms() {
    try {
        const snapshot = await getDocs(collection(db, "Rooms"));

        rooms = [];

        snapshot.forEach(function(docSnap) {
            rooms.push(docSnap.data());
        });

        console.log("Rooms loaded:", rooms);

        displayRooms(rooms);

    } catch (error) {
        alert("Error loading rooms: " + error.message);
        console.log(error);
    }
}

function displayRooms(roomList) {
    roomContainer.innerHTML = "";

    if (roomList.length === 0) {
        roomContainer.innerHTML = "<p style='text-align:center;'>No rooms found.</p>";
        return;
    }

    roomList.forEach(function(room) {
        const roomID = room.roomID || "";
        const roomName = room.roomName || "Room Name";
        const roomType = room.roomType || "Room Type";
        const price = room.price || "0";
        const status = room.status || "Unavailable";
        const statusClass = getRoomStatusClass(status);
        const image = room.image || "standard.jpg";

        roomContainer.innerHTML += `
            <div class="paper">
                <img src="${image}" alt="${roomName}" onerror="this.src='standard.jpg'">

                <h3>${roomName}</h3>
                <p><strong>Type:</strong> ${roomType}</p>
                <p><strong>Price:</strong> RM ${price} / night</p>
                <p> 
                <span class="status-badge ${statusClass}">${status}</span>
                </p>
                <button type="button" onclick="window.location.href='room.html?roomID=${room.roomID}'">
    View Details
</button>
            </div>
        `;
    });
}

window.filterRooms = function() {
    const searchText = searchInput.value.toLowerCase();
    const roomTypeValue = filterSelect.value.toLowerCase();
    const availabilityValue = availabilitySelect.value.toLowerCase();

    const filteredRooms = rooms.filter(function(room) {
        const roomName = (room.roomName || "").toLowerCase();
        const roomType = (room.roomType || "").toLowerCase();
        const roomStatus = (room.status || "").toLowerCase();

        const matchSearch = roomName.includes(searchText);
        const matchType = roomTypeValue === "all" || roomType.includes(roomTypeValue);
        const matchAvailability = availabilityValue === "all" || roomStatus === availabilityValue;

        return matchSearch && matchType && matchAvailability;
    });

    displayRooms(filteredRooms);
};

async function loadFacilities() {
    try {
        const snapshot = await getDocs(collection(db, "Facilities"));

        facilityContainer.innerHTML = "";

        snapshot.forEach(function(docSnap) {
            const facility = docSnap.data();

            const facilityName = facility.name || "Facility";
            const description = facility.description || "";
            const icon = facility.icon || "hotel1.jpg";

            facilityContainer.innerHTML += `
                <div class="service-card">
                    <img src="${icon}" alt="${facilityName}" onerror="this.src='hotel1.jpg'">
                    <h3>${facilityName}</h3>
                    <p>${description}</p>
                </div>
            `;
        });

        console.log("Facilities loaded");

    } catch (error) {
        alert("Error loading facilities: " + error.message);
        console.log(error);
    }
}

loadRooms();
loadFacilities();