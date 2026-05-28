const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(".")); // serves your index.html

/* REGISTER */
app.post("/register", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.send("Email and password required");

    if (!email.endsWith("@nitw.ac.in"))
        return res.send("Only NITW email allowed");

    try {
        db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run(email, password);
        res.send("Registered");
    } catch (err) {
        res.send("User exists");
    }
});

/* LOGIN */
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) return res.send("Invalid");

    const user = db.prepare("SELECT * FROM users WHERE email=? AND password=?").get(email, password);

    if (user) {
        db.prepare("INSERT INTO logins (email) VALUES (?)").run(email);
        res.send("Success");
    } else {
        res.send("Invalid");
    }
});

/* SAVE ATTENDANCE */
app.post("/attendance", (req, res) => {
    const { email, subject, attended, total } = req.body;

    if (parseInt(attended) > parseInt(total))
        return res.send("Error: Attended cannot exceed total");

    if (parseInt(attended) < 0 || parseInt(total) < 0)
        return res.send("Error: Values cannot be negative");

    db.prepare("INSERT INTO attendance (email, subject, attended, total) VALUES (?, ?, ?, ?)").run(email, subject, attended, total);
    res.send("Saved");
});

/* SAVE GPA */
app.post("/gpa", (req, res) => {
    const { email, cgpa } = req.body;
    db.prepare("INSERT INTO gpa (email, cgpa) VALUES (?, ?)").run(email, cgpa);
    res.send("Saved");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));