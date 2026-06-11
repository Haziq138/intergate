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
   DATABASE COLLECTION
   ========================= */

// Kalau database team kau guna collection lain, tukar nama dekat sini sahaja.
// Contoh: "Users", "Customers", atau "customers"
const CUSTOMER_COLLECTION_NAME = "Users";

/* =========================
   HTML ELEMENTS
   ========================= */

const customerForm = document.getElementById("customerForm");
const editCustomerDocID = document.getElementById("editCustomerDocID");

const customerName = document.getElementById("customerName");
const customerEmail = document.getElementById("customerEmail");
const customerPhone = document.getElementById("customerPhone");
const customerRole = document.getElementById("customerRole");
const customerDescription = document.getElementById("customerDescription");

const customerSearch = document.getElementById("customerSearch");
const roleFilter = document.getElementById("roleFilter");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const customerTableBody = document.getElementById("customerTableBody");
const messageBox = document.getElementById("messageBox");
const saveCustomerBtn = document.getElementById("saveCustomerBtn");
const formTitle = document.getElementById("formTitle");

let allCustomers = [];

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
    editCustomerDocID.value = "";
    customerForm.reset();

    saveCustomerBtn.innerHTML = '<i class="fas fa-save"></i> Save Customer';
    formTitle.innerHTML = "Add / Update Customer Form";
    cancelEditBtn.style.display = "none";
}

/* =========================
   NORMALIZE CUSTOMER DATA
   ========================= */

function normalizeCustomer(docID, data) {
    return {
        docID: docID,
        customerID: data.customerID || data.userID || docID,
        name: data.name || data.fullName || data.customerName || "",
        email: data.email || "",
        phone: data.phone || data.phoneNumber || data.customerPhone || "",
        role: data.role || "Customer",
        description: data.description || data.customerDescription || "",
        createdAt: data.createdAt || "",
        updatedAt: data.updatedAt || ""
    };
}

/* =========================
   LOAD CUSTOMERS
   ========================= */

async function loadCustomers() {
    try {
        customerTableBody.innerHTML = `
            <tr>
                <td colspan="7">Loading customer records...</td>
            </tr>
        `;

        const customerSnapshot = await getDocs(collection(db, CUSTOMER_COLLECTION_NAME));

        allCustomers = [];

        customerSnapshot.forEach(function (customerDoc) {
            const data = customerDoc.data();

            allCustomers.push(
                normalizeCustomer(customerDoc.id, data)
            );
        });

        displayCustomers(allCustomers);

    } catch (error) {
        console.log("Firebase load customer error:", error);

        customerTableBody.innerHTML = `
            <tr>
                <td colspan="7">Failed to load customer records: ${error.message}</td>
            </tr>
        `;

        showMessage("Error loading customer records: " + error.message, "error");
    }
}

/* =========================
   DISPLAY CUSTOMERS
   ========================= */

function displayCustomers(customerList) {
    customerTableBody.innerHTML = "";

    if (customerList.length === 0) {
        customerTableBody.innerHTML = `
            <tr>
                <td colspan="7">No customer records found.</td>
            </tr>
        `;
        return;
    }

    customerList.forEach(function (customer) {
        customerTableBody.innerHTML += `
            <tr>
                <td>${customer.customerID || customer.docID}</td>
                <td>${customer.name || "--"}</td>
                <td>${customer.email || "--"}</td>
                <td>${customer.phone || "--"}</td>
                <td>${customer.role || "--"}</td>

                <td>
                    <button class="edit-btn" data-doc-id="${customer.docID}">
                        Edit
                    </button>
                </td>

                <td>
                    <button class="delete-btn" data-doc-id="${customer.docID}">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });

    addCustomerButtonEvents();
}

/* =========================
   EDIT / DELETE BUTTON EVENTS
   ========================= */

function addCustomerButtonEvents() {
    const editButtons = document.querySelectorAll(".edit-btn");
    const deleteButtons = document.querySelectorAll(".delete-btn");

    editButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const docID = this.getAttribute("data-doc-id");
            editCustomer(docID);
        });
    });

    deleteButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const docID = this.getAttribute("data-doc-id");
            deleteCustomer(docID);
        });
    });
}

/* =========================
   EDIT CUSTOMER
   ========================= */

function editCustomer(docID) {
    const selectedCustomer = allCustomers.find(function (customer) {
        return customer.docID === docID;
    });

    if (!selectedCustomer) {
        showMessage("Customer record not found.", "error");
        return;
    }

    editCustomerDocID.value = selectedCustomer.docID;
    customerName.value = selectedCustomer.name || "";
    customerEmail.value = selectedCustomer.email || "";
    customerPhone.value = selectedCustomer.phone || "";
    customerRole.value = selectedCustomer.role || "";
    customerDescription.value = selectedCustomer.description || "";

    saveCustomerBtn.innerHTML = '<i class="fas fa-save"></i> Update Customer';
    formTitle.innerHTML = "Update Customer Form";
    cancelEditBtn.style.display = "inline-block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================
   DELETE CUSTOMER
   ========================= */

async function deleteCustomer(docID) {
    const confirmDelete = confirm("Are you sure you want to delete this customer record?");

    if (!confirmDelete) {
        return;
    }

    try {
        await deleteDoc(doc(db, CUSTOMER_COLLECTION_NAME, docID));

        showMessage("Customer deleted successfully.", "success");
        loadCustomers();

    } catch (error) {
        console.log("Delete customer error:", error);
        showMessage("Error deleting customer: " + error.message, "error");
    }
}

/* =========================
   ADD / UPDATE CUSTOMER
   ========================= */

customerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nameValue = customerName.value.trim();
    const emailValue = customerEmail.value.trim();
    const phoneValue = customerPhone.value.trim();
    const roleValue = customerRole.value;
    const descriptionValue = customerDescription.value.trim();
    const docID = editCustomerDocID.value;

    if (!nameValue || !emailValue || !phoneValue || !roleValue) {
        showMessage("Please fill in all required customer details.", "error");
        return;
    }

    try {
        saveCustomerBtn.disabled = true;
        saveCustomerBtn.innerHTML = "Saving...";

        if (docID) {
            await updateDoc(doc(db, CUSTOMER_COLLECTION_NAME, docID), {
                name: nameValue,
                email: emailValue,
                phone: phoneValue,
                role: roleValue,
                description: descriptionValue,
                updatedAt: serverTimestamp()
            });

            showMessage("Customer updated successfully.", "success");

        } else {
            await addDoc(collection(db, CUSTOMER_COLLECTION_NAME), {
                customerID: "CUS" + Date.now(),
                name: nameValue,
                email: emailValue,
                phone: phoneValue,
                role: roleValue,
                description: descriptionValue,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            showMessage("Customer added successfully.", "success");
        }

        clearForm();
        loadCustomers();

    } catch (error) {
        console.log("Save customer error:", error);
        showMessage("Error saving customer: " + error.message, "error");

    } finally {
        saveCustomerBtn.disabled = false;

        if (editCustomerDocID.value) {
            saveCustomerBtn.innerHTML = '<i class="fas fa-save"></i> Update Customer';
        } else {
            saveCustomerBtn.innerHTML = '<i class="fas fa-save"></i> Save Customer';
        }
    }
});

/* =========================
   SEARCH AND FILTER
   ========================= */

function searchAndFilterCustomers() {
    const keyword = customerSearch.value.toLowerCase().trim();
    const selectedRole = roleFilter.value.toLowerCase();

    const filteredCustomers = allCustomers.filter(function (customer) {
        const name = (customer.name || "").toLowerCase();
        const email = (customer.email || "").toLowerCase();
        const phone = (customer.phone || "").toLowerCase();
        const role = (customer.role || "").toLowerCase();

        const matchesKeyword =
            name.includes(keyword) ||
            email.includes(keyword) ||
            phone.includes(keyword);

        const matchesRole =
            selectedRole === "all" ||
            role === selectedRole;

        return matchesKeyword && matchesRole;
    });

    displayCustomers(filteredCustomers);
}

searchBtn.addEventListener("click", function () {
    searchAndFilterCustomers();
});

customerSearch.addEventListener("keyup", function () {
    searchAndFilterCustomers();
});

roleFilter.addEventListener("change", function () {
    searchAndFilterCustomers();
});

/* =========================
   RESET SEARCH
   ========================= */

resetBtn.addEventListener("click", function () {
    customerSearch.value = "";
    roleFilter.value = "all";
    displayCustomers(allCustomers);
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

loadCustomers();