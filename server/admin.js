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

    app.use("/admin", express.static('admin', {index: "index.htm"}));

}