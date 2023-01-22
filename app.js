const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");
const fs = require("fs");
const crypto = require("crypto");

// Socket IO Config
const app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);

const { getAll, Append, Update } = require("./crud");

// Mongo models
const Message = require("./models/Message");
const User = require("./models/User");
const Chat = require("./models/Chat");

// Passport config
require("./config/passport")(passport);

// EJS
app.use(expressLayouts);
app.set("view engine", "ejs");

// Public
var path = require("path");
app.use(express.static(path.resolve("./public")));

// Bodyparser
app.use(express.urlencoded({ extended: false }));

// Express session
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global Vars
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

// Routes
app.use("/", require("./routes/index"));
app.use("/users/", require("./routes/users"));

const PORT = process.env.PORT || 5000;

server.listen(PORT, console.log(`Server started on port ${PORT}`));

global.users = [];
tmpUsers = [];
connections = [];

let totalApproved = 0;
let totalPending = 0;
let chatOption = "undefined";
let firstLoad = true;

const algorithm = "aes-256-cbc";
let key = crypto.randomBytes(32);
let iv = crypto.randomBytes(16);

function encrypt(text) {
  try {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString("hex");
  } catch (ex) {
    console.log(ex);
    return "failed to encrypt";
  }
}

function decrypt(text) {
  try {
    let encryptedText = Buffer.from(text, "hex");
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (ex) {
    console.log(ex);
    return "failed to decrypt";
  }
}

// Connection
io.sockets.on("connection", function (socket) {
  connections.push(socket);
  updateUsernames(); // To update users list on startup
  // Get chats from mongo

  // getting last 50 messages
  let output = getAll("./storage/messages.json").reverse().slice(0, 50);

  let unrecognized = false;
  if (firstLoad) {
    firstLoad = false;

    // Need to delete notice as old encryption will not work
    const chat = "./storage/chat.json";
    fs.unlink(chat, (err) => {
      if (err) {
        return;
      }
    });

    if (output.length > 0) {
      io.sockets.emit("chat deleted");

      unrecognized = true;

      const chatlog = "./routes/chatlog.txt";
      const messages = "./storage/messages.json";

      fs.unlink(chatlog, (err) => {
        if (err) {
          return;
        }
      });

      fs.unlink(messages, (err) => {
        if (err) {
          return;
        }
      });
    }
  }

  if (unrecognized) {
    socket.emit("output", []);
  } else {
    for (let i = 0; i < output.length; i++) {
      output[i].message = decrypt(output[i].message);
    }

    // Emit the messages
    socket.emit("output", output);
  }

  socket.on("load chat", function () {
    let chatOption = false;
    (async function () {
      let chat;
      chat = getAll("./storage/chat.json");
      if (chat.length > 0) {
        chat = chat.filter((x) => x.key == "chat");
        return chat;
      }
    })()
      .then((chat) => {
        if (chat) {
          chatOption = chat[0].isEnabled;
        } else {
          chatOption = true;
          let newChat = new Chat({
            key: "chat",
            isEnabled: true,
            notice: "",
          });
          (async function () {
            let chat = Append("./storage/chat.json", newChat);
            if (chat) return chat;
          })()
            .then((chat) => {
              console.log("Chat Enabled: " + chat.isEnabled);
            })
            .catch((err) => console.log(err));
        }
        socket.emit("chat-toggle", chatOption);
      })
      .catch((err) => console.log(err));
  });

  // Save Notice
  socket.on("notice", function (data) {
    let chat = getAll("./storage/chat.json");
    chat.forEach((item) => {
      if (item.key === "chat") {
        if (data) {
          item.notice = encrypt(data);
        } else {
          item.notice = data;
        }
        Update("./storage/chat.json", chat);
      }
    });
    // Send notice change event
    io.sockets.emit("notice updated", data);
  });

  // Save sound preference
  socket.on("sound", function (data) {
    let users = getAll("./storage/users.json");
    users.forEach((item) => {
      if (item.username == data.name) {
        item.sound = data.sound;
        Update("./storage/users.json", users);

        // Send sound preference event
        socket.emit("sound updated", item.sound);
      }
    });
  });

  // Get Sound
  socket.on("get sound", function (data) {
    if (data.name) {
      let users = getAll("./storage/users.json");
      users.forEach((item) => {
        if (item.username == data.name) {
          // Send sound preference event
          socket.emit("sound updated", item.sound);
        }
      });
    }
  });

  // Get Notice
  socket.on("get notice", function () {
    let chat = getAll("./storage/chat.json");
    chat.forEach((item) => {
      if (item.key === "chat") {
        let notice = "";
        if (item.notice) {
          notice = decrypt(item.notice);
        }
        // Send notice change event
        io.sockets.emit("notice updated", notice);
      }
    });
  });

  // Toggle Chat Mode
  socket.on("toggle chat", function () {
    if (chatOption) {
      chatOption = false;
    } else {
      chatOption = true;
    }

    let chat = getAll("./storage/chat.json");
    chat.forEach((item) => {
      if (item.key === "chat") {
        item.isEnabled = chatOption;
        Update("./storage/chat.json", chat);
      }
    });

    // Send toggle event
    io.sockets.emit("chat-toggle", chatOption);
  });

  // Download chat
  socket.on("dwn", function () {
    // console.log('ok');
    let messages = getAll("./storage/messages.json");

    var allmsg = "";
    var l = messages.length;
    for (i = 0; i < l; i++) {
      allmsg +=
        messages[i].name +
        "(" +
        messages[i].time +
        ") : " +
        decrypt(messages[i].message) +
        "\r\n";
    }
    // console.log(output.length);
    // write to a new file named 2pac.txt
    fs.writeFile("./routes/chatlog.txt", allmsg, (err) => {
      // throws an error, you could also catch it here
      if (err) throw err;

      // success case, the file was saved
      // console.log('saved!');
    });
  });

  // Download Users file
  socket.on("Download Users", function () {
    // console.log('ok');
    let users = getAll("./storage/users.json");

    // write to a new file named users.json
    fs.writeFile("./routes/users.json", JSON.stringify(users), (err) => {
      // throws an error, you could also catch it here
      if (err) throw err;

      // success case, the file was saved
      // console.log('saved!');
    });
  });

  // Delete all chats
  socket.on("dlt", function () {
    // Need to delete notice as old encryption will not work
    const chat = "./storage/chat.json";
    fs.unlink(chat, (err) => {
      if (err) {
        return;
      }
    });

    const chatlog = "./routes/chatlog.txt";
    const messages = "./storage/messages.json";

    let output = getAll("./storage/messages.json").slice(0, 50);
    if (output.length > 0) {
      fs.unlink(messages, (err) => {
        if (err) {
          return;
        }
      });
    }

    key = crypto.randomBytes(32);
    iv = crypto.randomBytes(16);

    fs.unlink(chatlog, (err) => {
      if (err) {
        return;
      }
    });

    io.sockets.emit("chat deleted");
  });

  // Load approved users
  socket.on("approved", function () {
    let users = getAll("./storage/users.json")
      .filter((x) => x.isApproved == true)
      .slice(0, 50);

    totalApproved += users.length;
    // Send approved users
    socket.emit("approved users", users);
  });

  // Load pending users
  socket.on("pending", function () {
    let users = getAll("./storage/users.json")
      .filter((x) => x.isApproved == false)
      .slice(0, 50);

    totalPending += users.length;
    // Send pending users
    socket.emit("pending users", users);
  });

  // Load more chats
  socket.on("loadmore", function (data) {
    let output = getAll("./storage/messages.json");

    output.reverse();
    for (i = 0; i < data; i++) {
      output.shift();
    }

    for (let i = 0; i < output.length; i++) {
      output[i].message = decrypt(output[i].message);
    }
    // Send load more messages
    socket.emit("lm-meesages", output.slice(0, 15));
  });

  // Load more approved users
  socket.on("loaduser", function (data) {
    let output = getAll("./storage/users.json").filter(
      (x) => x.isApproved == true
    );

    output.reverse();
    for (i = 0; i < data; i++) {
      output.shift();
    }

    totalApproved += 15;
    // Send load more messages
    socket.emit("lm-users", output.slice(0, 15));
  });

  // Load more pending users
  socket.on("loadpending", function (data) {
    let output = getAll("./storage/users.json").filter(
      (x) => x.isApproved == false
    );

    output.reverse();
    for (i = 0; i < data; i++) {
      output.shift();
    }

    totalPending += 15;
    // Send load more messages
    socket.emit("lm-pending", output.slice(0, 15));
  });

  // Approve user
  socket.on("approve now", function (data, user) {
    totalApproved++;
    const newData = {
      name: data,
      isApproved: true,
      isAdmin: false,
      approvedBy: user,
    };

    // Send load more messages
    io.sockets.emit("new approved", newData, totalApproved);
    io.sockets.emit("remove pending", data);

    let users = getAll("./storage/users.json");
    users.forEach((item) => {
      if (item.name == data) {
        item.isApproved = true;
        item.approvedBy = user;
        Update("./storage/users.json", users);
      }
    });
  });

  // Delete user
  socket.on("delete now", function (data, flag) {
    // Send load more messages
    if (flag === 1) {
      io.sockets.emit("remove pending", data);
    } else {
      io.sockets.emit("remove approved", data);
    }

    let users = getAll("./storage/users.json").filter((x) => x.name != data);
    Update("./storage/users.json", users);
  });

  // Change user role
  socket.on("change role", function (data) {
    let users = getAll("./storage/users.json");
    users.forEach((item) => {
      if (item.name == data) {
        let role = false;
        if (item.isAdmin === false) {
          role = true;
        }
        const newData = {
          name: data,
          isAdmin: role,
        };
        // Send load more messages
        io.sockets.emit("role changed", newData);
        item.isAdmin = role;
        Update("./storage/users.json", users);
      }
    });
  });

  // Delete Single Message
  socket.on("delete message", function (data) {
    let users = getAll("./storage/users.json");
    let messages = getAll("./storage/messages.json");
    users.forEach((item) => {
      if (item.name == data.username) {
        messages = messages.filter((message) => message._id != data.message_id);
        Update("./storage/messages.json", messages);
        // Send message deleted signal
        io.sockets.emit("message deleted", { _id: data.message_id });
      }
    });
  });

  // New user
  socket.on("username", function (data, callback) {
    ut = { username: data.user, time: data.time };
    nope = true;
    tmpNope = true;

    for (var x = 0; x < users.length; x++) {
      if (users[x].username === data.user) {
        nope = false;
      }
    }

    for (var x = 0; x < tmpUsers.length; x++) {
      if (tmpUsers[x].username === data.user) {
        tmpNope = false;
      }
    }

    if (nope) {
      users.push(ut);
      if (tmpNope) {
        tmpUsers.push(ut);
      }
      // New user emitting
      io.sockets.emit("nUser", data);
    }
  });

  // Logout
  socket.on("lg", function (data) {
    // console.log('called');
    for (var i = 0; i < users.length; i++) {
      if (users[i].username == data) {
        users.splice(i, 1);
        break;
      }
    }

    for (var i = 0; i < tmpUsers.length; i++) {
      if (tmpUsers[i].username == data) {
        tmpUsers.splice(i, 1);
        break;
      }
    }

    io.sockets.emit("lgUser", data);
  });

  // Send Message
  socket.on("send message", function (data) {
    const newMessage = new Message({
      name: data.user,
      message: encrypt(data.msg),
      time: data.time,
    });

    // Save user
    (async function () {
      let message = Append("./storage/messages.json", newMessage);
      if (message) return message;
    })()
      .then((message) => {
        io.sockets.emit("new message", {
          user: data.user,
          msg: data.msg,
          time: data.time,
          _id: message._id,
        });
      })
      .catch((err) => console.log(err));

    var clients = io.sockets.clients();
    console.log(clients);
  });

  function updateUsernames() {
    // Emit users list
    socket.emit("get users", users);
  }

  // Hajira - Active users reponse after approx 17sec
  socket.on("hajira", function (data, callback) {
    ut = { username: data.user, time: data.time };
    nope = true;
    tmpNope = true;

    for (var x = 0; x < users.length; x++) {
      if (users[x].username === data.user) {
        nope = false;
      }
    }

    for (var x = 0; x < tmpUsers.length; x++) {
      if (tmpUsers[x].username === data.user) {
        tmpNope = false;
      }
    }

    if (nope) {
      users.push(ut);
      if (tmpNope) {
        tmpUsers.push(ut);
      }
    }
  });
});

// Send active users after approx 30 seconds
setInterval(function () {
  io.sockets.emit("get users", users);
  users = [];
}, 30000);

module.exports.func = (user) => {
  io.sockets.emit("registered", user, totalPending);
};
