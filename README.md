# Chatroom_Nodejs

A chat app built on Node.js, Express.js, MongoDB, EJS and Socket.io.

# Pre-requisites

To setup and run the project for local development / testing, you will need to use Node.js and NPM. I don't explicitly specify a minimum Node.js/NPM version for the app but I recommend going with whatever the latest LTS version is at the point in time you are setting things up. The minimum vesion of Node.js that I have tested this app on is 16.14.2.

Installers can be found here: https://nodejs.org/en/download

Then install MongoDB by follwoing the guide here: https://www.mongodb.com/docs/manual/installation/

# Installation

The code for the chat app can be found [here](https://framagit.org/a-team/it-projects/-/tree/master/classroom/chatroom_nodejs). Either clone the repo to a local folder on your machine or download and extract the archive if you don't have Git installed.

Open a terminal window session, or the equivalent on your machine, and enter the following command to install all the Node modules needed to run the app:

`npm install`

# Connect MongoDB Locally

Comment the following line in app.js

```
 mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connceted"))
  .catch(err => console.log(err)); 
```
 Then uncomment the follwing line in app.js

```
 mongoose
  .connect("mongodb://localhost:27017/myapp", { useNewUrlParser: true })
  .then(() => console.log("MongoDB Connceted"))
  .catch(err => console.log(err));
```

After that start MongoDB by openning a terminal:

```
sudo service mongodb start
```

# Run the app in development mode

After doing an npm install enter the following npm run command:

```
npm run dev
```

This will start the app and set it up to listen for incoming connections on port 5000. Open up your browser of choice and go to the url http://localhost:5000/ to start using the app itself. The npm run dev command automatically runs the app using the nodemon script so any changes you make to the app's javascript, CSS or HTML code will automatically restart it.
