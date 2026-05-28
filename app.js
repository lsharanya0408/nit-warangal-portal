let userEmail = "";

// ─── AUTH ────────────────────────────────────────────────

function register() {
    var emailVal = document.getElementById("email").value;
    var passVal = document.getElementById("password").value;

    fetch("/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email: emailVal, password: passVal })
    }).then(function(r) { return r.text(); }).then(alert);
}

function login() {
    var emailVal = document.getElementById("email").value;
    var passVal = document.getElementById("password").value;

    fetch("/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email: emailVal, password: passVal })
    })
    .then(function(r) { return r.text(); })
    .then(function(res) {
        if (res === "Success") {
            userEmail = emailVal;
            document.getElementById("auth").classList.add("hidden");
            document.getElementById("dashboard").classList.remove("hidden");
        } else {
            document.getElementById("msg").innerText = "Invalid login";
        }
    });
}

// ─── TAB SWITCHING ───────────────────────────────────────

function show(tab) {
    document.querySelectorAll(".tab").forEach(function(t) {
        t.classList.add("hidden");
    });
    document.getElementById(tab).classList.remove("hidden");
}

// ─── ATTENDANCE ──────────────────────────────────────────

function saveAttendance() {
    var subjectVal = document.getElementById("subject").value.trim();
    var a = parseInt(document.getElementById("attended").value);
    var t = parseInt(document.getElementById("total").value);

    // FIX 1: Validate attended cannot exceed total
    if (isNaN(a) || isNaN(t) || t <= 0) {
        document.getElementById("attResult").innerText = "Please enter valid values.";
        return;
    }

    if (a > t) {
        document.getElementById("attResult").innerText = "Error: Attended classes cannot exceed total classes!";
        return;
    }

    if (a < 0) {
        document.getElementById("attResult").innerText = "Error: Values cannot be negative!";
        return;
    }

    var percent = (a / t) * 100;

    fetch("/attendance", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email: userEmail, subject: subjectVal, attended: a, total: t })
    });

    document.getElementById("attResult").innerText = "Attendance: " + percent.toFixed(2) + "%";
    drawChart(a, t);
}

// ─── BUNK CALCULATOR ─────────────────────────────────────
function calcBunk() {
    var rows = document.querySelectorAll(".bunk-row");

    for (var i = 0; i < rows.length; i++) {
        var subj = rows[i].querySelector(".bunk-subj").value.trim() || ("Subject " + (i + 1));
        var a = parseInt(rows[i].querySelector(".bunk-attended").value);
        var t = parseInt(rows[i].querySelector(".bunk-total").value);
        var rem = parseInt(rows[i].querySelector(".bunk-remaining").value);
        var resultSpan = rows[i].querySelector(".bunk-result");

        if (isNaN(a) || isNaN(t) || isNaN(rem) || t <= 0 || rem < 0) {
            resultSpan.innerText = "Enter valid values";
            resultSpan.style.color = "orange";
            continue;
        }

        if (a > t) {
            resultSpan.innerText = "Attended > Total!";
            resultSpan.style.color = "red";
            continue;
        }

        // CORRECT FORMULA:
        // Total classes at end = t + rem
        // Minimum to attend overall = ceil(0.75 * (t + rem))
        // Still need to attend = max(0, required - a)
        // Can bunk = rem - stillNeed

        var totalFinal = t + rem;
        var required = Math.ceil(0.75 * totalFinal);
        var stillNeed = Math.max(0, required - a);
        var canBunk = rem - stillNeed;

        if (canBunk <= 0) {
            var deficit = stillNeed - rem; // how many you're still short even if you attend all
            if (deficit > 0) {
                resultSpan.innerText = "Short by " + deficit;
            } else {
                resultSpan.innerText = "Must attend all " + rem;
            }
            resultSpan.style.color = "red";
        } else {
            resultSpan.innerText = canBunk + "";
            resultSpan.style.color = "#00ff88";
        }
    }
}

// ─── GPA CALCULATOR ──────────────────────────────────────

function calcGPA() {
    var gradesVal = document.getElementById("grades").value;
    var arr = gradesVal.split(",");
    var sum = 0;
    var valid = true;

    for (var i = 0; i < arr.length; i++) {
        var g = parseFloat(arr[i].trim());
        if (isNaN(g)) { valid = false; break; }
        sum += g;
    }

    if (!valid || arr.length === 0) {
        document.getElementById("gpaResult").innerText = "Enter valid comma-separated grades.";
        return;
    }

    var gpa = sum / arr.length;

    fetch("/gpa", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email: userEmail, cgpa: gpa })
    });

    document.getElementById("gpaResult").innerText = "CGPA: " + gpa.toFixed(2);
}

// ─── CHART ───────────────────────────────────────────────

var existingChart = null;

function drawChart(a, t) {
    // FIX 5: Destroy old chart before drawing new one (prevents canvas reuse error)
    if (existingChart) {
        existingChart.destroy();
    }

    existingChart = new Chart(document.getElementById("myChart"), {
        type: "pie",
        data: {
            labels: ["Attended", "Missed"],
            datasets: [{
                data: [a, t - a],
                backgroundColor: ["#00ff88", "#ff4444"]
            }]
        }
    });
}