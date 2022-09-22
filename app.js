// This is the server

const express = require("express");
const app = express();
app.use(express.static("public"));

let http = require("http").Server(app);
const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log("Server listening on", port);
});

let io = require("socket.io")(http);
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("enter", (room) => {
    console.log("enter to room", room);
    room = room.trim();
    const myRoom = io.sockets.adapter.rooms.get(room) || { size: 0 };
    const numClients = myRoom.size;
    console.log(room, "has", numClients, "clients");

    if (numClients == 0) {
      socket.join(room);
      socket.emit("created", room);
    } else if (numClients == 1) {
      socket.join(room);
      socket.emit("joined", room);
    } else {
      socket.emit("full", room);
    }
  });

  socket.on("ready", (room) => {
    console.log("server: received ready");
    socket.broadcast.to(room).emit("ready");
  });

  socket.on("candidate", (event) => {
    console.log("server: received candidate");
    socket.broadcast.to(event.room).emit("candidate", event);
  });

  socket.on("offer", (event) => {
    console.log("server: received offer");
    socket.broadcast.to(event.room).emit("offer", event.sdp);
  });

  socket.on("answer", (event) => {
    console.log("server: received answer");
    socket.broadcast.to(event.room).emit("answer", event.sdp);
  });
});
