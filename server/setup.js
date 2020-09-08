var express = require('express');
var app = express();

var compression = require('compression');
app.use(compression());

var http = require('http').Server(app);
var https = require('https');

var cors = require("cors");
app.use(cors());
 
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
app.use(bodyParser.json({limit: '250kb', extended: true}))
app.use(bodyParser.urlencoded({ extended: true}));
app.use(cookieParser());

var session = require('express-session')
var FileStore = require('session-file-store')(session);
var fileStoreOptions = {};

app.use(session({
    store: new FileStore(fileStoreOptions),
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

var fs = require("fs");

app.use(function(request, response, next){
    if(!request.secure){
        var host = request.headers.host
        if (host === "localhost:8080") {
            host = "localhost:8081"
        }
        response.redirect("https://" + host + request.url);
    }
    else {
        next()
    }
});

module.exports.app = app
module.exports.express = express
module.exports.listen = function () {
    var httpPort = process.env.OMG_PORT || 8080;
    http.listen(httpPort, function () {
        console.log(`port ${httpPort} yo`);
    });

    if (!fs.existsSync("privkey.pem") || !fs.existsSync("fullchain.pem")) {
        console.log("did not create https server: missing ./fullchain.pem && ./privkey.pem");
        return
    }

    try {
        var options = {
            key: fs.readFileSync('privkey.pem'),
            cert: fs.readFileSync('fullchain.pem')
        };
        var httpsServer = https.createServer(options, app);
        httpsServer.listen(8081, function () {
            console.log("https port 8081");
        });
    }
    catch (excp) {
        console.log(excp);
        console.log("did not create https server");
    }
    return httpsServer
}