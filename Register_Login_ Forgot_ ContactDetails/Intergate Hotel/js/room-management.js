import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

/* =========================
   CLOUDINARY CONFIG
   ========================= */

// Cloud name kau
const CLOUDINARY_CLOUD_NAME = "dpbhyxdij";

// Upload preset mesti wujud dekat Cloudinary
// Settings > Upload > Upload presets
// Preset name mesti: room_images
// Signing mode mesti: Unsigned
const CLOUDINARY_UPLOAD_PRESET = "intergate_payment_proof";
/* =========================
   HTML ELEMENTS
   ========================= */

const roomForm = document.getElementById("roomForm");
const editRoomDocID = document.getElementById("editRoomDocID");

const roomName = document.getElementById("roomName");
const roomType = document.getElementById("roomType");
const roomPrice = document.getElementById("roomPrice");
const roomStatus = document.getElementById("roomStatus");
const roomImage = document.getElementById("roomImage");
const imagePreviewBox = document.getElementById("imagePreviewBox");
const roomDescription = document.getElementById("roomDescription");

const roomSearch = document.getElementById("roomSearch");
const roomFilter = document.getElementById("roomFilter");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const roomTableBody = document.getElementById("roomTableBody");
const messageBox = document.getElementById("messageBox");
const saveRoomBtn = document.getElementById("saveRoomBtn");
const formTitle = document.getElementById("formTitle");

let allRooms = [];

/* =========================
   MESSAGE FUNCTION
   ========================= */

function showMessage(message, type) {
    messageBox.innerHTML = message;

    if (type === "success") {
        messageBox.className = "message-box message-success";
    } else {
        messageBox.className = "message-box message-error";
    }

    setTimeout(function () {
        messageBox.className = "message-box";
        messageBox.innerHTML = "";
    }, 4000);
}

/* =========================
   CLEAR FORM
   ========================= */

function clearForm() {
    editRoomDocID.value = "";
    roomForm.reset();

    imagePreviewBox.innerHTML = "<p>No image selected</p>";

    saveRoomBtn.innerHTML = '<i class="fas fa-save"></i> Save Room';
    formTitle.innerHTML = "Add Room Form";
    cancelEditBtn.style.display = "none";
}

/* =========================
   GENERATE ROOM ID
   ========================= */

function generateRoomID() {
    return "room" + Date.now();
}

/* =========================
   UPLOAD IMAGE TO CLOUDINARY
   ========================= */

async function uploadRoomImageToCloudinary(file) {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "room_images");

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.log("Cloudinary error:", data);

        throw new Error(
            data.error && data.error.message
                ? data.error.message
                : "Room image upload failed."
        );
    }

    return {
        imageURL: data.secure_url,
        publicID: data.public_id
    };
}

/* =========================
   IMAGE PREVIEW
   ========================= */

roomImage.addEventListener("change", function () {
    const file = roomImage.files[0];

    if (!file) {
        imagePreviewBox.innerHTML = "<p>No image selected</p>";
        return;
    }

    imagePreviewBox.innerHTML = `
        <img src="${URL.createObjectURL(file)}" alt="Room Preview">
        <p>${file.name}</p>
    `;
});

/* =========================
   LOAD ROOM DATA
   ========================= */

async function loadRooms() {
    try {
        roomTableBody.innerHTML = `
            <tr>
                <td colspan="9">Loading room records...</td>
            </tr>
        `;

        const roomSnapshot = await getDocs(collection(db, "Rooms"));

        allRooms = [];

        roomSnapshot.forEach(function (roomDoc) {
            allRooms.push({
                docID: roomDoc.id,
                ...roomDoc.data()
            });
        });

        displayRooms(allRooms);

    } catch (error) {
        console.log("Firebase load error:", error);

        roomTableBody.innerHTML = `
            <tr>
                <td colspan="9">Failed to load room records: ${error.message}</td>
            </tr>
        `;

        showMessage("Error loading room records: " + error.message, "error");
    }
}

/* =========================
   DISPLAY ROOM DATA
   ========================= */

function displayRooms(roomList) {
    roomTableBody.innerHTML = "";

    if (roomList.length === 0) {
        roomTableBody.innerHTML = `
            <tr>
                <td colspan="9">No room records found.</td>
            </tr>
        `;
        return;
    }

    roomList.forEach(function (room) {
        roomTableBody.innerHTML += `
            <tr>
                <td>${room.roomID || room.docID}</td>

                <td>
                    ${
                        room.image
                            ? `<img src="${room.image}" class="room-thumb" alt="Room Image">`
                            : "--"
                    }
                </td>

                <td>${room.roomName || "--"}</td>
                <td>${room.roomType || "--"}</td>
                <td>RM ${room.price || room.roomPrice || 0}</td>
                <td>${room.status || "--"}</td>
                <td>${room.description || "--"}</td>

                <td>
                    <button class="edit-btn" data-doc-id="${room.docID}">
                        Edit
                    </button>
                </td>

                <td>
                    <button class="delete-btn" data-doc-id="${room.docID}">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });

    addRoomButtonEvents();
}

/* =========================
   EDIT AND DELETE BUTTON EVENTS
   ========================= */

function addRoomButtonEvents() {
    const editButtons = document.querySelectorAll(".edit-btn");
    const deleteButtons = document.querySelectorAll(".delete-btn");

    editButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const docID = this.getAttribute("data-doc-id");
            editRoom(docID);
        });
    });

    deleteButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const docID = this.getAttribute("data-doc-id");
            deleteRoom(docID);
        });
    });
}

/* =========================
   EDIT ROOM
   ========================= */

function editRoom(docID) {
    const selectedRoom = allRooms.find(function (room) {
        return room.docID === docID;
    });

    if (!selectedRoom) {
        showMessage("Room record not found.", "error");
        return;
    }

    editRoomDocID.value = selectedRoom.docID;
    roomName.value = selectedRoom.roomName || "";
    roomType.value = selectedRoom.roomType || "";
    roomPrice.value = selectedRoom.price || selectedRoom.roomPrice || "";
    roomStatus.value = selectedRoom.status || "";
    roomDescription.value = selectedRoom.description || "";

    if (selectedRoom.image) {
        imagePreviewBox.innerHTML = `
            <img src="${selectedRoom.image}" alt="Current Room Image">
            <p>Current image</p>
        `;
    } else {
        imagePreviewBox.innerHTML = "<p>No image selected</p>";
    }

    saveRoomBtn.innerHTML = '<i class="fas fa-save"></i> Update Room';
    formTitle.innerHTML = "Update Room Form";
    cancelEditBtn.style.display = "inline-block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================
   DELETE ROOM
   ========================= */

async function deleteRoom(docID) {
    const confirmDelete = confirm("Are you sure you want to delete this room?");

    if (!confirmDelete) {
        return;
    }

    try {
        await deleteDoc(doc(db, "Rooms", docID));

        showMessage("Room deleted successfully.", "success");
        loadRooms();

    } catch (error) {
        console.log("Delete error:", error);
        showMessage("Error deleting room: " + error.message, "error");
    }
}

/* =========================
   ADD / UPDATE ROOM
   ========================= */

roomForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nameValue = roomName.value.trim();
    const typeValue = roomType.value.trim();
    const priceValue = Number(roomPrice.value);
    const statusValue = roomStatus.value;
    const imageFile = roomImage.files[0];
    const descriptionValue = roomDescription.value.trim();
    const docID = editRoomDocID.value;

    if (!nameValue || !typeValue || !priceValue || !statusValue || !descriptionValue) {
        showMessage("Please fill in all required room details.", "error");
        return;
    }

    if (priceValue <= 0) {
        showMessage("Room price must be greater than 0.", "error");
        return;
    }

    try {
        saveRoomBtn.disabled = true;
        saveRoomBtn.innerHTML = "Saving...";

        if (docID) {
            let imageURL = "";
            let imagePublicID = "";

            const currentRoom = allRooms.find(function (room) {
                return room.docID === docID;
            });

            if (currentRoom) {
                imageURL = currentRoom.image || "";
                imagePublicID = currentRoom.cloudinaryPublicID || "";
            }

            if (imageFile) {
                const uploadedImage = await uploadRoomImageToCloudinary(imageFile);
                imageURL = uploadedImage.imageURL;
                imagePublicID = uploadedImage.publicID;
            }

            await updateDoc(doc(db, "Rooms", docID), {
                roomName: nameValue,
                roomType: typeValue,
                price: priceValue,
                roomPrice: priceValue,
                status: statusValue,
                image: imageURL,
                cloudinaryPublicID: imagePublicID,
                description: descriptionValue,
                updatedAt: serverTimestamp()
            });

            showMessage("Room updated successfully.", "success");

        } else {
            const roomID = generateRoomID();

            let imageURL = "";
            let imagePublicID = "";

            if (imageFile) {
                const uploadedImage = await uploadRoomImageToCloudinary(imageFile);
                imageURL = uploadedImage.imageURL;
                imagePublicID = uploadedImage.publicID;
            }

            await addDoc(collection(db, "Rooms"), {
                roomID: roomID,
                roomName: nameValue,
                roomType: typeValue,
                price: priceValue,
                roomPrice: priceValue,
                status: statusValue,
                image: imageURL,
                cloudinaryPublicID: imagePublicID,
                description: descriptionValue,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            showMessage("Room added successfully.", "success");
        }

        clearForm();
        loadRooms();

    } catch (error) {
        console.log("Save error:", error);
        showMessage("Error saving room: " + error.message, "error");

    } finally {
        saveRoomBtn.disabled = false;

        if (editRoomDocID.value) {
            saveRoomBtn.innerHTML = '<i class="fas fa-save"></i> Update Room';
        } else {
            saveRoomBtn.innerHTML = '<i class="fas fa-save"></i> Save Room';
        }
    }
});

/* =========================
   SEARCH AND FILTER
   ========================= */

function searchAndFilterRooms() {
    const keyword = roomSearch.value.toLowerCase().trim();
    const statusFilter = roomFilter.value.toLowerCase();

    const filteredRooms = allRooms.filter(function (room) {
        const name = (room.roomName || "").toLowerCase();
        const type = (room.roomType || "").toLowerCase();
        const status = (room.status || "").toLowerCase();

        const matchesKeyword =
            name.includes(keyword) ||
            type.includes(keyword);

        const matchesStatus =
            statusFilter === "all" ||
            status === statusFilter;

        return matchesKeyword && matchesStatus;
    });

    displayRooms(filteredRooms);
}

searchBtn.addEventListener("click", function () {
    searchAndFilterRooms();
});

roomSearch.addEventListener("keyup", function () {
    searchAndFilterRooms();
});

roomFilter.addEventListener("change", function () {
    searchAndFilterRooms();
});

/* =========================
   RESET SEARCH
   ========================= */

resetBtn.addEventListener("click", function () {
    roomSearch.value = "";
    roomFilter.value = "all";
    displayRooms(allRooms);
});

/* =========================
   CANCEL EDIT
   ========================= */

cancelEditBtn.addEventListener("click", function () {
    clearForm();
});

/* =========================
   START PAGE
   ========================= */

loadRooms();