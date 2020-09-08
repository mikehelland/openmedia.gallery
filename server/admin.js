module.exports = (app, express) => {
    const fs = require('fs')
    app.use('/admin', function(req,res,next){
        if (!req.user) {
            return res.redirect("/signin.htm?fwd=%2fadmin" + encodeURIComponent(req.url));
        }

        if (req.user && req.user.admin) {
            next();
        }
        else {
            res.status(404).send("Not found");
        }
    });


    app.get('/admin/users', function (req, res) {
        if (!req.user || !req.user.admin) {
            return res.send({})
        }

        var options = {}
        var find = {}

        var callback = function (err, docs) {
            if (err) {
                res.send(err);
            }
            else {
                res.send(docs);
            }
        };

        var db = app.get("db");
        options.columns = ["username", "id", "admin", "btc_address", "created_at", "last_login", "uploaded_bytes", "upload_limit"]
        db.users.find(find, options, callback)
    })

    app.get('/admin/gallery-stats', function (req, res) {
        if (!req.user || !req.user.admin) {
            return res.send({})
        }

        var callback = function (err, docs) {
            if (err) {
                res.send(err);
            }
            else {
                res.send(docs);
            }
        };

        var db = app.get("db");
        db.run("select body ->> 'type' as type, count(id) from things group by body ->> 'type'", callback)
    })

    app.get('/admin/uploads', function (req, res) {
        if (!req.user || !req.user.admin) {
            return res.send({})
        }
        
        var uploads = []
        var dir = "www/uploads/" + (req.query.dir || "")
        fs.readdir(dir, (err, contents)=>{
            contents.forEach(file  => {
                if (file.startsWith(".")) {
                    return
                }
                uploads.push(file)

                //fs.stat(uploadDir + "/" + userDir, (err, stat) => {
                //    if (stat && stat.isDirectory()) {
                //    }
                //})
            })
            res.send(uploads)
        })
    })

    app.post('/admin/data/', function (req, res) {
        if (!req.user || !req.user.admin) {
            return res.send({})
        }

        var db = app.get("db")
        var post = () => db.saveDoc("things", req.body, (err, result) => res.send(err || result))
        req.body.last_modified = Date.now();
    
        if (!req.body.id) {
            post()
        }
        else {
            // if the record doesn't exist, we have to make it
            db.things.findDoc(req.body.id, (err, result) => {
                if (!result) {
                    db.run(`insert into things (id, body) values (${req.body.id}, '{}')`, (err, result) => {
                        post()            
                    })
                }
                else {
                    post()
                }
            })
        }
        
    })

    app.get('/admin/update', function (req, res) {
        if (!req.user || !req.user.admin) {
            return res.send({})
        }

        const { exec } = require("child_process");

        exec("./update.sh", (error, stdout, stderr) => {
            let output = ""
            if (error) {
                output += `<pre>error: ${error.message}</pre>`
            }
            if (stderr) {
                output += `\n<pre>stderr: \n${stderr}</pre>`
            }
            if (stdout) {
                output += `\n<pre>stdout: \n${stdout}</pre>`
            }

            res.send(output)
        });
    })

    app.get('/admin/stop_server', function (req, res) {
        if (!req.user || !req.user.admin) {
            return res.send({})
        }

        process.exit(1)
    })

    app.use("/admin", express.static('admin', {index: "index.htm"}));

}