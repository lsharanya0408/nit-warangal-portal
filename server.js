const express = require("express");
const cors = require("cors");
const { getDb, save } = require("./database");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("."));

/* REGISTER */
app.post("/register", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.send("Email and password required");
    if (!email.endsWith("@nitw.ac.in"))
        return res.send("Only NITW email allowed");

    const db = await getDb();
    try {
        db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, password]);
        save();
        res.send("Registered");
    } catch (err) {
        res.send("User exists");
    }
});

/* LOGIN */
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) return res.send("Invalid");

    const db = await getDb();
    const result = db.exec("SELECT * FROM users WHERE email=? AND password=?", [email, password]);

    if (result.length > 0 && result[0].values.length > 0) {
        db.run("INSERT INTO logins (email) VALUES (?)", [email]);
        save();
        res.send("Success");
    } else {
        res.send("Invalid");
    }
});

/* SAVE ATTENDANCE */
app.post("/attendance", async (req, res) => {
    const { email, subject, attended, total } = req.body;

    if (parseInt(attended) > parseInt(total))
        return res.send("Error: Attended cannot exceed total");
    if (parseInt(attended) < 0 || parseInt(total) < 0)
        return res.send("Error: Values cannot be negative");

    const db = await getDb();
    db.run("INSERT INTO attendance (email, subject, attended, total) VALUES (?, ?, ?, ?)",
        [email, subject, attended, total]);
    save();
    res.send("Saved");
});

/* SAVE GPA */
app.post("/gpa", async (req, res) => {
    const { email, cgpa } = req.body;

    const db = await getDb();
    db.run("INSERT INTO gpa (email, cgpa) VALUES (?, ?)", [email, cgpa]);
    save();
    res.send("Saved");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));