module.exports = function (app, httpsServer) {

    // a route for an adminstrator to see how many are online
    app.get('/admin/rooms', function (req, res) {
        res.send(rooms);
    })

    var rooms = {}
    var sockets = {}
    var nextId = 1
    
    const WebSocket = require('ws')
    const wss = new WebSocket.Server({server: httpsServer})

    wss.on("connection", socket => {

        var id = nextId++
        sockets[id] = socket
        var name
        var room = {users:{}}

        socket.on("close", (code, reason) => {
            if (name) {
                delete room.users[name]
                sendToRoom({msgtype: "userDisconnected", name: name})
            }
            delete sockets[id]
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
                signal(msg)
            }
            else {
                console.log(msg.msgtype)
            }
        })
        

        /*
        socket.on("updateLocalUserData", data => {
            if (room.users[name]) {
                room.users[name].data = data
            }
            socket.to(roomName).emit("updateRemoteUserData", {
                name: name,
                data, data
            });
        });

        socket.on("updateRoomData", data => {
            if (room) {
                room.data = data
            }
        });


*/

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
                rooms[msg.room] = {users: {}}
            }
            room = rooms[msg.room]
            name = msg.name
            roomName = msg.room

            //todo what if this user already exists
            room.users[name] = {id, name, data: msg.data}

            sendToRoom({msgtype: "update-user-list", data: room.users})
            send({msgtype: "joined", data: room.users})
            if (room.data) {
                send({msgtype:"command", command: room.data});

            }
        }

        var leave = () => {
            if (name) {
                delete room.users[name]
            }
            sendToRoom({msgtype: "userLeft", name})
        }

        var signal = signal => {
            signal.fromId = id
            if (!signal.from) {
                signal.from = name
            }
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

    })

}