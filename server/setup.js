var express = require('express');
var app = express();
app.set('trust proxy', 1)

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

app.use(session({
    store: new FileStore({ttl: 60 * 60 * 24 * 30}),
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {secure: true, maxAge: 60 * 60 * 24 * 30 * 1000}
}));

var fs = require("fs");

// if we're running behind nginx, it will handle https, and we only want http in node
// otherwise, we're handling https ourselves, so enforce it
if (!process.env.OMG_HTTP_ONLY) {
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
}


module.exports.app = app
module.exports.express = express
module.exports.listen = function () {
    var httpPort = process.env.OMG_PORT || 8080;
    http.listen(httpPort, function () {
        console.log(`port ${httpPort} yo`);
    });

    if (process.env.OMG_HTTP_ONLY) {
        return http
    }
    else {
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
}