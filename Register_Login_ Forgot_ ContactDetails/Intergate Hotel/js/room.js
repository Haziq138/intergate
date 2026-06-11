import { db } from "./firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const roomDetailsContainer = document.getElementById("roomDetailsContainer");

function getRoomIDFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("roomID");
}

function getRoomStatusClass(status) {
    if (!status) {
        return "status-unavailable";
    }

    const lowerStatus = status.toLowerCase();

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

async function loadRoomDetails() {
    const roomID = getRoomIDFromURL();

    if (!roomID) {
        roomDetailsContainer.innerHTML = "<p>No room selected.</p>";
        return;
    }

    try {
        const q = query(collection(db, "Rooms"), where("roomID", "==", roomID));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            roomDetailsContainer.innerHTML = "<p>Room not found.</p>";
            return;
        }

        snapshot.forEach(function(docSnap) {
            const room = docSnap.data();

            roomDetailsContainer.innerHTML = `
                <div style="
                    background-color: white;
                    width: 650px;
                    margin: 40px auto;
                    padding: 25px;
                    border-radius: 15px;
                    box-shadow: 0px 0px 10px rgba(0,0,0,0.2);
                    font-family: 'Times New Roman', Times, serif;
                ">
                    <img 
                        src="${room.image}" 
                        onerror="this.src='standard.jpg'" 
                        alt="${room.roomName}"
                        style="
                            width: 100%;
                            height: 280px;
                            object-fit: cover;
                            border-radius: 12px;
                            display: block;
                            margin-bottom: 20px;
                        "
                    >

                    <h2>${room.roomName}</h2>
                    <p><strong>Type:</strong> ${room.roomType}</p>
                    <p><strong>Price:</strong> RM ${room.price} per night</p>
                    <p>
                    <span class="status-badge ${getRoomStatusClass(room.status)}">${room.status}</span>
                    </p>                    
                    <p><strong>Description:</strong> ${room.description}</p>

${(room.status || "").toLowerCase().trim() === "available" ? `
    <button type="button" onclick="window.location.href='booking.html?roomID=${room.roomID}'">
        Select Room / Book Now
    </button>
` : `
    <button type="button" disabled style="background-color: gray; color: white; cursor: not-allowed;">
        Room Unavailable
    </button>
`}
                    </div>
            `;
        });

    } catch (error) {
        alert("Error loading room details: " + error.message);
        console.log(error);
    }
}

loadRoomDetails();