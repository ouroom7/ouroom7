const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { getAll } = require("../crud");

module.exports = function (passport) {
  passport.use(
    new LocalStrategy({ usernameField: "name" }, (name, password, done) => {
      // Match User
      (async function () {
        let users;
        users = getAll("./storage/users.json");
        if (users.length > 0) {
          users = users.filter((x) => x.username == name);
          return users[0];
        }
      })()
        .then((user) => {
          if (!user) {
            return done(null, false, { message: "এই নামে কোনো আইডি নেই" });
          }

          if (!user.isApproved) {
            return done(null, false, { message: "এই আইডি এখনও অনুমোদিত হয়নি" });
          }

          if (users.filter(x => x.username == user.username).length > 0) {
            return done(null, false, { message: "এই আইডি অন্য কোথাও লগইন আছে!" });
          }

          // Match password
          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;

            if (isMatch) {
              return done(null, user);
            } else {
              return done(null, false, { message: "পাসওয়ার্ড ভুল হচ্ছে!" });
            }
          });

          
        })
        .catch((err) => console.log(err));
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    (async function () {
      let users;
      users = getAll("./storage/users.json");
      if (users.length > 0) {
        users = users.filter((x) => x._id == id);
        return users[0];
      }
    })().then((user) => {
      if (user) {
        done(null, user);
      }
    });
  });
};
