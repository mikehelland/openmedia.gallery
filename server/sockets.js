module.exports = function (app, httpsServer) {

    app.get('/rooms', function (req, res) {
        var roomsArray = []
        for (var room in rooms) {
            //todo is public?
            rooms[room].type = "ROOM"
            rooms[room].url = room
            roomsArray.push(rooms[room])
        }
        res.send(roomsArray);
    })
    app.get('/admin/rooms', function (req, res) {
        res.send(rooms);
    })

    var admin
    var adminLog = data => {
        if (!admin) {
            return
        }

        admin.send(JSON.stringify(data))
    }

    var rooms = {}
    var sockets = {}
    var nextId = 1

    var handlers = {}

    var types = app.get("types")
    for (var type in types) {
        if (types[type].socketHandler) {
            handlers[type] = require(types[type].socketHandler)
        }
    }
    
    const WebSocket = require('ws')
    const wss = new WebSocket.Server({server: httpsServer})

    wss.on("connection", socket => {
        var isAdmin = false
        var id = nextId++
        sockets[id] = socket
        var name
        var room = {users:{}}
        var roomName
        var typeHandler

        socket.on("close", (code, reason) => {
            if (name) {
                leaveRoom("userDisconnected")
            }
            delete sockets[id]
            if (isAdmin) {
                admin = null
            }
        })


        socket.on('message', messageString => {
            var msg
            try {
                msg = JSON.parse(messageString)
            }
            catch (e) {console.log()}

            if (!msg || !msg.msgtype) {
                console.log("socket.onmessage bad msg msgtype")
            }
            else if (msg.msgtype === "join") {
                join(msg)
            }
            else if (msg.msgtype === "leave") {
                leave()
            }
            else if (msg.msgtype === "signaling") {
                // webrtc offer/candidate stuff
                passOn(msg)
            }
            else if (msg.msgtype === "updateUserData") {
                updateUserData(msg)
            }
            else if (msg.msgtype === "registerAdmin") {
                isAdmin = true
                admin = socket
                socket.send(JSON.stringify({action: "list", rooms: rooms}))
            }
            else if (typeHandler && room) {
                typeHandler(msg, room.thing, passOn)
            }
            else {
                // everything else
                passOn(msg) 
            }
        })        

        var send = msg => {
            socket.send(JSON.stringify(msg))
        }
        var sendToRoom = msg => {
            var str = JSON.stringify(msg)
            for (var user in room.users) {
                if (user !== name && sockets[room.users[user].id] &&
                        sockets[room.users[user].id].readyState === WebSocket.OPEN) {
                    sockets[room.users[user].id].send(str)
                }
            }
        }
        var sendToId = (id, msg) => {
            if (sockets[id] && sockets[id].readyState === WebSocket.OPEN) {
                sockets[id].send(JSON.stringify(msg))
            }
        }

        var join = msg => {

            if (!msg.name || !msg.room) {
                return
            }

            if (!rooms[msg.room]) {
                rooms[msg.room] = {users: {}, 
                                    created_at: Date.now(), 
                                    username: msg.name,
                                    thing: msg.thing
                                }
            }
            room = rooms[msg.room]
            name = msg.name
            roomName = msg.room

            if (room.thing && room.thing.type && handlers[room.thing.type]) {
                typeHandler = handlers[room.thing.type]
            }

            //todo what if this user already exists
            room.users[name] = {id, name, data: msg.data}

            sendToRoom({msgtype: "update-user-list", users: room.users})
            send({msgtype: "joined", room: room})
            if (room.data) {
                send({msgtype:"command", command: room.data});

            }

            adminLog({action: "join", user: name, room: roomName})
        }

        var leave = () => {
            if (name) {
                leaveRoom("userLeft")
                name = null
            }
        }

        var leaveRoom = (reason) => {
            delete room.users[name]
            var lastRoom = room
            if (Object.keys(room.users).length === 0) {
                setTimeout(() => {
                    if (Object.keys(lastRoom.users).length === 0) {
                        delete rooms[roomName]
                        adminLog({action: "room deleted", room: roomName})
                    }
                }, 1000)
            }
            else {
                sendToRoom({msgtype: reason, name: name})
            }
            adminLog({action: "left", user: name, room: roomName})
        }

        var passOn = signal => {
            signal.fromId = id
            signal.from = name

            try {
                if (signal.toId) {
                    sendToId(signal.toId, signal)
                }
                else if (signal.room) {
                    sendToRoom(signal)
                }
            }
            catch (e) {}
        }

        var updateUserData = msg => {
            msg.name = name
            if (room.users[name]) {
                room.users[name].data = msg
            }
            sendToRoom(msg)
        }

        var updateRoomData = data => {
            if (room) {
                room.data = data
            }
        }

    })

}