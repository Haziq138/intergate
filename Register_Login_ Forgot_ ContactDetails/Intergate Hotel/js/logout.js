const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", function(event) {
        event.preventDefault();

        localStorage.removeItem("currentUserID");
        localStorage.removeItem("currentUserRole");

        alert("Logout successful!");

        window.location.href = "login.html";
    });
}