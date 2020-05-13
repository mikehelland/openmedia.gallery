const {app, express, listen} = require("./server/setup")

require("./server/authentication")(app)
require("./server/routes")(app)

// the server can support different types by adding to www/apps/
require("./server/types")(app)

require("./server/admin")(app, express)

app.use(express.static('www', {index: "index.htm"}));

require("./server/database")(app)

const httpsServer = listen()

require("./server/sockets")(app, httpsServer)

//var viewer = require("./viewer.js");
