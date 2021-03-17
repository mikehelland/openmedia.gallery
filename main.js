const {app, express, listen} = require("./server/setup")

// connect to the database
require("./server/database")(app)

require("./server/authentication")(app)
require("./server/routes")(app)


// the server can support different types by adding to www/apps/
require("./server/types")(app, express)

//setup a route for payments
if (process.env.OMG_SQUARE) {
    require("./server/paymentprocessor")(app)
}

require("./server/admin")(app, express)

app.use(express.static('custom/www', {index: "index.htm"}));
app.use(express.static('www', {index: "index.htm"}));

const httpsServer = listen()

require("./server/sockets")(app, httpsServer)
