const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
let func = require("../app");
const { getAll, Append } = require("../crud");

// User model
const User = require("../models/User");

// Login Page
router.get("/login", (req, res) => res.render("login"));

// Register Page
router.get("/register", (req, res) => res.render("register"));

// Register Handle
router.post("/register", (req, res) => {
  const { name, password, password2 } = req.body;
  let errors = [];

  //Check required fields
  if (!name || !password || !password2) {
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

  // if (!name.match(/^[0-9a-zA-Z]+$/)) {
  //   errors.push({ msg: "নাম শুধুমাত্র আলফা নিউমেরিক হতে হবে" });
  // }

  if (errors.length > 0) {
    res.render("register", {
      errors,
      name,
      password,
      password2,
    });
  } else {
    // Validation Passed
    (async function () {
      let users;
      users = getAll("./storage/users.json");
      if (users.length > 0) {
        users = users.filter((x) => x.username == name);
        return users[0];
      }
    })()
      .then((user) => {
        if (user) {
          //User exists
          errors.push({ msg: "এই নাম আগে থেকেই আছে!" });
          res.render("register", {
            errors,
            name,
            password,
            password2,
          });
        } else {
          let newUser = new User({
            username: name,
            name: name,
            password: password,
          });

          // Hash Password
          bcrypt.genSalt(10, (err, salt) =>
            bcrypt.hash(newUser.password, salt, (err, hash) => {
              if (err) throw err;

              // Set password to hashed
              newUser.password = hash;

              // Save user
              (async function () {
                let user = Append("./storage/users.json", newUser);
                if (user) return user;
              })()
                .then((user) => {
                  req.flash(
                    "success_msg",
                    "রেজিস্টার সম্পন্ন হয়েছে আলহামদুলিল্লাহ! এখন অনুমোদনের জন্য এডমিনকে জানান"
                  );
                  func.func(user);
                  res.redirect("/users/login");
                })
                .catch((err) => console.log(err));
            })
          );
        }
      })
      .catch((err) => console.log(err));
  }
});

//Login handle
router.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true,
  })(req, res, next);
});

//Logout Handle
router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success_msg", "লগআউট সম্পন্ন হয়েছে, ফী আমানিল্লাহ!");
    res.redirect("/users/login");
  });
});

module.exports = router;
