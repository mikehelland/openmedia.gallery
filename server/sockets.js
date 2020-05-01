function setupSockets(httpsServer) {

    var io = require('socket.io')(httpsServer);
    console.log("sockets to https");

    omg.live = {}

    var rooms = {};
    var omgSocket = io.of("/omg-live");
    omgSocket.on("connection", function (socket) {
        var room = "";
        var user = "";
        socket.on("startBasic", function (data) {
            room = "basic_" + data.room;
            user = data.user;
            socket.join(room);
        });
        socket.on("startSession", function (data) {
            room = data.room;
            user = data.user;
            socket.join(room);
            
            if (!rooms[room]) {
                data.song.username = user
                data.song.last_modified = Date.now()
                rooms[room] = {users:{}, song: data.song};
                socket.emit("join", {});
            }
            else {
                socket.emit("join", rooms[room]);
            }
            
            rooms[room].users[user] = Date.now();
            omgSocket.in(room).emit("chat", {text: "[" + room + "]: " + user + " has joined"});
        });
        socket.on("joinSession", function (data) {
            room = data.room;
            user = data.user;
        
            if (!rooms[room]) {
                socket.emit("join", false);
                return
            }
        
            socket.join(room);        
            socket.emit("join", rooms[room]);
            
            var userString = "";
            var users = 0;
            for (var u in rooms[room].users) {
                userString += " " + u;
                users++;
            }
            socket.emit("chat", {text: "[" + room + "]: " + users + " users in room"});
            if (users) {
                socket.emit("chat", {text: userString});
            }
            rooms[room].users[user] = Date.now();
            omgSocket.in(room).emit("chat", {text: "[" + room + "]: " + user + " has joined"});
        });
        socket.on("leaveSession", function (data) {
            delete rooms[room].users[user];
            if (Object.keys(rooms[room].users).length === 0) {
                delete rooms[room];
            }
            else {
                omgSocket.in(room).emit("chat", {text: "[" + room + "]: " + user + " has left"});
            }
            socket.leave(room);
            room = "";
        });
        socket.on("basic", function (data) {
            io.of("/omg-live").to("basic_" + data.room).emit("basic", data);
        });
        socket.on("data", function (data) {
            socket.to(room).emit("data", data);
            if (data.action === "loadSong") {
                rooms[room].song = data.value;
            }
            else {
                try {
                    omg.live.updateSong(rooms[room].song, data);
                }
                catch (e) {}
            }
        });
        socket.on("chat", function (data) {
            omgSocket.in(room).emit("chat", data);
        });
        socket.on("rtc", function (data) {
            if (data.message && data.message.type === "offer") {
                rooms[room].offer = data;
                rooms[room].serverUser = user;
            }
            else if (data.message && data.message.type === "answer") {
                //send it to whoever made the offer!
                socket.to(room).emit("rtc", data);
            }
            else if (data.message && data.message.candidate) {
                socket.to(room).emit("rtc", data);
            }
        });
        socket.on("disconnect", function () {
            if (rooms[room]) {
                if (rooms[room].serverUser === user) {
                    rooms[room].offer = undefined;
                }
                delete rooms[room].users[user];

                if (Object.keys(rooms[room].users).length === 0) {
                    delete rooms[room];
                }
            }
            omgSocket.in(room).emit("chat", {text: user + " has left"});
        });
    });

}