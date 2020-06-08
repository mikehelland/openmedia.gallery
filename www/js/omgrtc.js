function OMGRealTime(signalingServer) {
    this.userName = Math.round(Math.random() * 100000) + ""
    this.remoteUsers = {}

    this.autoRejoin = true
    var url = signalingServer || location.origin
    url = url.replace("https://", "wss://")
    this.socket = new WebSocket(url)

    this.socket.onopen = (e) => {
        if (this.onready) this.onready()
    }

    this.socket.onclose = () => {
        if (this.ondisconnect) this.ondisconnect()
    }

    this.socket.onmessage = e => {
        try {
            var msg = JSON.parse(e.data)
        }
        catch (e) {
            console.log("Did not parse websocket message", e)
        }

        if (!msg || !msg.msgtype) {
            return
        }

        if (this.events[msg.msgtype]) {
            this.events[msg.msgtype](msg)
        }
    }

    this.events = {}
    
    this.on("joined", msg => {
        this.updateUserList(msg.data)
        this.isJoined = true
        if (this.onjoined) this.onjoined(this.remoteUsers)
    })
    
    this.on("update-user-list", msg => this.updateUserList(msg.data))
    this.on("userLeft", msg => this.onUserLeft(msg.name))
    this.on("userDisconnected", msg => this.onUserDisconnected(msg.name))

    this.on("signaling", data => this.onSignal(data))

    this.on("updateRemoteUserData", msg => this.updateRemoteUserData(msg))

    this.on("reconnect", () => {
        if (this.autoRejoin && this.isJoined) {
            this.isRejoining = true
            this.join(this.roomName, this.userName)
        }
    })
}

OMGRealTime.prototype.log = function (message) {
    console.log(message)
    if (this.onlog) {
        this.onlog(message)
    }
}

OMGRealTime.prototype.on = function (eventName, handler) {
    this.events[eventName] = handler
}

OMGRealTime.prototype.emit = function (type, data) {
    data.msgtype = type
    this.socket.send(JSON.stringify(data))
}


OMGRealTime.prototype.getUserMedia = function (callback) {
    if (this.localStream) {
        if (callback) callback(this.localVideo)
        return
    }
    this.log("Getting camera and microphone")

    this.localVideo = document.createElement("video")
    this.localVideo.allowfullscreen = false
    this.localVideo.playsinline = true
    this.localVideo.controls = true

    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then((stream) => {
        this.log("Got camera and microphone.")

        this.localStream = stream
        this.localVideo.srcObject = stream
        this.localVideo.muted = true
        
        this.localVideo.onplaying = () => {
            if (this.localVideo.clientWidth < this.localVideo.clientHeight) {
                this.localVideo.style.height  = this.localVideo.clientWidth / (4/3) + "px"
            }
            if (callback) callback(this.localVideo)
        }
        this.localVideo.play()
    })
}
OMGRealTime.prototype.join = function (roomName, userName) {
    this.userName = userName
    this.roomName = roomName
    this.log("Joining room.")
    this.emit("join", {
        name: userName,
        room: roomName
    })
}

OMGRealTime.prototype.updateUserList = function (users) {
    this.log("Updating user list.")
    for (var name in users) {
        if (name == this.userName) continue;
        if (!this.remoteUsers[name]) {
            this.setupNewUser(name, users[name])
        }
        else {
            // if they have a new socket, 
            this.remoteUsers[name].id = users[name].id
            if (this.remoteUsers[name].disconnected) {
                this.remoteUsers[name].disconnected = false
                if (this.onuserreconnected) {
                    this.onuserreconnected(name, this.remoteUsers[name])
                }            
            }
        }
    }
    for (name in this.remoteUsers) {
        if (!users[name]) {
        }
    }
}

OMGRealTime.prototype.onUserLeft = function (name) {
    if (this.onuserleft) {
        this.onuserleft(name, this.remoteUsers[name])
    }
    if (this.remoteUsers[name].peerConnection) {
        this.remoteUsers[name].peerConnection.close()
    }
    delete this.remoteUsers[name]
}

OMGRealTime.prototype.onUserDisconnected = function (name) {
    if (this.remoteUsers[name]) {
        this.remoteUsers[name].disconnected = true
        if (this.onuserdisconnected) {
            this.onuserdisconnected(name, this.remoteUsers[name])
        }
    }
}


OMGRealTime.prototype.setupNewUser = function (name, data) {
    this.remoteUsers[name] = data
    this.remoteUsers[name].video = document.createElement("video")
    this.remoteUsers[name].video.playinline = true
    this.remoteUsers[name].video.controls = true
    this.remoteUsers[name].video.allowFullScreen = false
    if (this.onnewuser) this.onnewuser(name, this.remoteUsers[name])
}

OMGRealTime.prototype.onIncomingCall = async function(data) {
    this.log("incoming-offer")
    var remoteUsers = this.remoteUsers
    var name = data.from
    var user = remoteUsers[name]
    if (!user) {
        this.log("incoming caller doesn't exist", data)
        // todo not there
    }
    if (user.peerConnection) {
        this.log("incoming connection already exists", name)
        // todo 
    }

    user.caller = true
    user.peerConnection = this.createPeerConnection(user)

    await user.peerConnection.setRemoteDescription(data.offer)

    const answer = await user.peerConnection.createAnswer();
    await user.peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    if (this.onconnection) {
        this.onconnection(user)
    }

    this.log("make-answer")
    this.emit("signaling", {
        type: "answer-made",
        answer,
        toId: user.id
    });    
};

    

OMGRealTime.prototype.onAnswerMade = async function(data) {
    var remoteUsers = this.remoteUsers
    this.log("answer-made")
    var name = data.from
    var user = remoteUsers[name]
    if (!user) {
        this.log("onanswermade calleeName doesn't exist", name)
        // todo not there
    }
    if (!user.peerConnection) {
        this.log("onanswermade calleeName connection doesn't exists", name)
        // todo 
    }

    await user.peerConnection.setRemoteDescription(data.answer);
    this.log("ok?")    
};

OMGRealTime.prototype.onCandidate = function (data) {
    var name = data.from
    var user = this.remoteUsers[name]
    if (!user) {
        this.log("caller doesn't exist", name)
        // todo not there
    }

    var candidate = new RTCIceCandidate({
        sdpMLineIndex: data.label,
        //sdpMid: data.id,
        candidate: data.candidate + "",
    })
    
    user.peerConnection.addIceCandidate(candidate)
}

OMGRealTime.prototype.callUser = async function(name, callback) {
    this.log("call", name)
    var user = this.remoteUsers[name]
    if (!user) {
        this.log("callUser doesn't exist", name)
        return
    }

    user.callee = true

    user.outgoingCallCallback = callback
    var whenReady = () => {
        this.emit("signaling", {
            from: this.userName,
            to: name,
            toId: user.id,
            type: "call"
        })
    }

    if (!this.localStream) {
        this.getUserMedia(() => {
            whenReady()
        })
    }
    else {
        whenReady()
    }
}
    

OMGRealTime.prototype.createPeerConnection = function (user) {
    this.log("creating peer connection")
    var peerConnection = new RTCPeerConnection({
        iceServers: [     // Information about ICE servers - Use your own! 
            {
                urls: ["stun:stun.openmedia.gallery:3478"]
            },
            {
                urls: ["turn:turn.openmedia.gallery:3478"],
                credential: "12345",
                username: "omgrtc"
            },
            /* using more than two stun/turn servers slows down discovery?
            {
                urls: ["stun:stun.openmusic.gallery:3478"]
            },
            {
                urls: ["turn:turn.openmusic.gallery:3478"],
                credential: "12345",
                username: "omgrtc"
            }*/
        ]
    });

    peerConnection.onicecandidate = (event) => {
        console.log("onicecandidate")
        if (event.candidate) {
            this.emit("signaling", {
                type: "candidate",
                toId: user.id,
                candidate: event.candidate.candidate,
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid
            });
        }
    };

    peerConnection.onnegotiationneeded = () => {
        //should only need to do this when calling, not being called
        if (!user.callee) {
            return
        }

        this.log("negotiating connection...")
        peerConnection.createOffer().then(function(offer) {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            this.emit("signaling", {
                type: "offer",
                offer: peerConnection.localDescription, 
                toId: user.id
            })
        })
        .catch((error) => this.log("error negotiating"));
    };

    peerConnection.ontrack = function({ streams: [stream] }) {
        try {
            user.video.onplaying = () => {
                if (user.video.clientWidth < user.video.clientHeight) {
                    user.video.style.height  = user.video.clientWidth / (4/3) + "px"
                }
            }    

            user.video.srcObject = stream;
            user.video.play()
        }
        catch (e) {
            console.log("user stream ended")
        }
    };

    var hasConnected = false
    peerConnection.onconnectionstatechange = e => {
        this.log(peerConnection.connectionState)
        if (peerConnection.connectionState === "disconnected") {
            if (this.onuservideodisconnected) {
                this.onuservideodisconnected(user.name, user)
            }
        }
        else if (peerConnection.connectionState === "connected") {
            if (hasConnected) {
                if (this.onuserreconnected) {
                    this.onuserreconnected(user.name, user)
                }            
            }
            hasConnected = true
        }
    }

    this.localStream.getTracks().forEach(track => peerConnection.addTrack(track, this.localStream));
    /*peerConnection.onremovetrack = handleRemoveTrackEvent;
    peerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    peerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    peerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;*/


    this.log("peer connection created")
    return peerConnection
}

OMGRealTime.prototype.updateLocalUserData = function (user) {
    this.emit("updateLocalUserData", user)
}

OMGRealTime.prototype.updateRemoteUserData = function (msg) {
    if (msg.name === this.userName) {
        console.log("updating myself over sockets.. fix this")
        return
    }

    if (!this.remoteUsers[msg.name]) {
        this.log("no user to update", msg)
        return
    }   
    this.remoteUsers[msg.name].data = msg.data
}

OMGRealTime.prototype.sendTextMessage = function (remoteUserName, message) {
    if (this.remoteUsers[remoteUserName]) {
        this.emit("signaling", {
            type: "textMessage",
            to: remoteUserName,
            toId: this.remoteUsers[remoteUserName].id,
            from: this.userName,
            message: message
        })    
    }
}

OMGRealTime.prototype.sendCommand = function (remoteUserName, command) {
    if (this.remoteUsers[remoteUserName]) {
        this.emit("signaling", {
            type: "command",
            toId: this.remoteUsers[remoteUserName],
            from: this.userName,
            command: command
        })
    }
}

OMGRealTime.prototype.sendCommandToRoom = function (command) {
    this.emit("signaling", {
        type: "command",
        from: this.userName,
        command: command,
        room: true
    })
}

OMGRealTime.prototype.ontextmessage = function () {}
OMGRealTime.prototype.oncommand = function () {}

OMGRealTime.prototype.onSignal = function (signal) {
    this.log("signal " + signal.type)
    if (signal.type === "call") {
        this.onGetCall(signal)
    }
    else if (signal.type === "pickup") {
        this.onPickUp(signal)
    }
    else if (signal.type === "offer") {
        this.onIncomingCall(signal)
    }
    else if (signal.type === "candidate") {
        this.onCandidate(signal)
    }
    else if (signal.type === "answer-made") {
        this.onAnswerMade(signal)
    }
    else if (signal.type === "textMessage") {
        this.ontextmessage(signal)
    }
    else if (signal.type === "command") {
        this.oncommand(signal)
    }
}

OMGRealTime.prototype.onGetCall = function (signal) {
    this.log("get call " + signal.from)
    var pickUp = () => {
        var msg = {
            type: "pickup",
            from: this.userName,
            to: signal.from,
            toId: signal.fromId
        }
        if (!this.localStream) {
            this.getUserMedia(() => {
                this.emit("signaling", msg)
            })
        }
        else {
            this.emit("signaling", msg)
        }
    }

    if (this.acceptAllCalls) {
        pickUp()
    }
    else if (this.onincomingcall) {
        this.onincomingcall(signal.from, () => {
            pickUp()
        })
    }

}

OMGRealTime.prototype.onPickUp = function (signal) {
    var user = this.remoteUsers[signal.from]
    if (user.outgoingCallCallback) {
        user.outgoingCallCallback(user)
        delete user.outgoingCallCallback
    }
    if (user.peerConnection) {
        this.log("onPickUp connection already exists", name)
        // todo 
    }    
    user.peerConnection = this.createPeerConnection(user)

}

OMGRealTime.prototype.stopMedia = function () {
    if (this.localStream) {
        this.localStream.getTracks().forEach(function(track) {
            track.stop();
        });    
        this.localStream = null
    }
}

OMGRealTime.prototype.closeConnection = function (user) {
    if (user && user.peerConnection) {
        user.peerConnection.close()
    }
}

OMGRealTime.prototype.closeConnections = function () {
    for (var userName in this.remoteUsers) {
        try {
            this.remoteUsers[userName].peerConnection.close()
        }
        catch (e) {console.warn(e)}
    }
}

OMGRealTime.prototype.leave = function () {
    this.emit("leave", {})
}

OMGRealTime.prototype.updateRoomData = function (data) {
    this.emit("updateRoomData", data)
}

