let divChatLobby = document.getElementById("chatLobby");
let divChatRoom = document.getElementById("chatRoom");
let inputRoomNumber = document.getElementById("roomNumber");
let enterButton = document.getElementById("enter");
let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

let roomNumber, localStream, remoteStream, rtcPeerConnection, isCaller;
const iceServer = {
  iceServer: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

const streamConstraints = {
  audio: false,
  video: { width: 720, height: 480 },
};

const socket = io();

enterButton.onclick = () => {
  if (inputRoomNumber.value === "") {
    alert("please type a room number");
  } else {
    roomNumber = inputRoomNumber.value;
    socket.emit("enter", roomNumber);
    divChatLobby.style = "display: none"; // hide the chat lobby
    divChatRoom.style = "display: block";
  }
};

socket.on("created", (room) => {
  console.log("created");
  navigator.mediaDevices
    .getUserMedia(streamConstraints)
    .then((stream) => {
      localStream = stream;
      localVideo.srcObject = stream;
      isCaller = true;
    })
    .catch((err) => {
      console.log("An error occured", err);
    });
});

socket.on("joined", (room) => {
  console.log("joined");
  navigator.mediaDevices
    .getUserMedia(streamConstraints)
    .then((stream) => {
      localStream = stream;
      localVideo.srcObject = stream;
      socket.emit("ready", roomNumber);
    })
    .catch((err) => {
      console.log("An error occured", err);
    });
});

socket.on("ready", () => {
  console.log("ready");
  if (isCaller) {
    rtcPeerConnection = new RTCPeerConnection(iceServer);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = onAddStream;
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    //rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection
      .createOffer()
      .then((sessionDescription) => {
        rtcPeerConnection.setLocalDescription(sessionDescription);
        socket.emit("offer", {
          type: "offer",
          sdp: sessionDescription,
          room: roomNumber,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

socket.on("offer", (event) => {
  console.log("offer");
  if (!isCaller) {
    rtcPeerConnection = new RTCPeerConnection(iceServer);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = onAddStream;
    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    //rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
    rtcPeerConnection
      .createAnswer()
      .then((sessionDescription) => {
        rtcPeerConnection.setLocalDescription(sessionDescription);
        socket.emit("answer", {
          type: "answer",
          sdp: sessionDescription,
          room: roomNumber,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

socket.on("answer", (event) => {
  console.log("answer");
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

socket.on("candidate", (event) => {
  console.log("candidate");
  const candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  rtcPeerConnection.addIceCandidate(candidate);
});

function onAddStream(event) {
  remoteVideo.srcObject = event.streams[0];
  remoteStream = event.streams[0];
}

function onIceCandidate(event) {
  if (event.candidate) {
    console.log("sending ice candidate", event.candidate);
    socket.emit("candidate", {
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
      room: roomNumber,
    });
  }
}
