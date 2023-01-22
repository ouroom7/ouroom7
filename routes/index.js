const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getAll, Update } = require("../crud");

// User model
const User = require("../models/User");

var io = require("../app");

const { ensureAuthenticated } = require("../config/auth");

router.get("/", (req, res) => res.render("login"));
router.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.render("dashboard", {
    name: req.user.name,
  });
});

router.get("/admin", ensureAuthenticated, (req, res) => {
  if (!req.user.isAdmin) {
    req.flash("error_msg", "এডমিন ছাড়া অন্য কারো এই পেজ দেখার অনুমতি নেই");
    res.redirect("/dashboard");
  } else {
    res.render("admin", {
      name: req.user.name,
    });
  }
});

router.get("/password", ensureAuthenticated, (req, res) => {
  res.render("password", {
    name: req.user.name,
  });
});

router.post("/password", ensureAuthenticated, (req, res) => {
  const { name, password, password2 } = req.body;
  let errors = [];

  //Check required fields
  if (!password || !password2) {
    errors.push({ msg: "অনুগ্রহ করে সকল ঘর পূরণ করুন" });
  }

  //Check password match
  if (password != password2) {
    errors.push({ msg: "পাসওয়ার্ড মিলছে না!" });
  }

  //Check password length
  if (password.length < 6) {
    errors.push({ msg: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে" });
  }

  if (errors.length > 0) {
    res.render("password", {
      errors,
      name,
    });
  } else {
    bcrypt.genSalt(10, (err, salt) =>
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) throw err;

        // Set password to hashed
        let pass = hash;

        let users = getAll("./storage/users.json");
        users.forEach((item) => {
          if (item.name == name) {
            item.password = pass;
            Update("./storage/users.json", users);
            req.flash(
              "success_msg",
              "পাসওয়ার্ড পরিবর্তন হয়েছে আলহামদুলিল্লাহ!"
            );
            res.redirect("/dashboard");
          }
        });
      })
    );
  }
});

// Download Chat
router.get("/download", ensureAuthenticated, function (req, res) {
  var file = __dirname + "/chatlog.txt";
  res.download(file); // Set disposition and send it.
});

// Download Users Json File 
router.get("/download-users", ensureAuthenticated, function (req, res) {
  var file = __dirname + "/users.json";
  res.download(file); // Set disposition and send it.
});

module.exports = router;
