module.exports = (app) => {

    var viewer = require("./viewer.js")
    var findColumns = ["playcount", "commentcount", "id", "body"]

    app.get('/user', function (req, res) {
        if (req.user) {
            delete req.user.password;
            delete req.user.bpassword;
            res.send(req.user);
        } else {
            res.send(false);
        }
    });

    app.post('/user', function (req, res) {
        var db = app.get('db');
        if (!req.user || !req.body) {
            return res.send(false);
        }

        if (req.user.admin || req.user.id === req.body.id) {
            
            if (!req.user.admin) {
                delete req.body.admin
                delete req.body.password;
                delete req.body.bpassword;
                delete req.body.uploaded_bytes;
                delete req.body.upload_limit;
            }

            //this is so postgres accepts it as json, needs to be a string
            if (req.body.sources) {
                req.body.sources = JSON.stringify(req.body.sources)
            }
            db.users.save(req.body, function (err, saveResult) {
                if (err) {
                    res.send(err);
                } 
                else {
                    delete saveResult.password;
                    delete saveResult.bpassword;
                    res.send(saveResult);
                }
            });

        } else {
            res.send(false);
        }
    });


    app.get('/data/', function (req, res) {
        var perPage = req.query.perPage || 20;
        var options = {limit : perPage, order : "created_at desc"};
        var find = {};
        if (req.query.page) {
            options.offset = (parseInt(req.query.page) - 1) * perPage;
        }
        var callback = function (err, docs) {
            if (err) {
                res.send(err);
            }
            else {
                res.send(docs);
            }
        };

        // can only get full records (include playcount, votes etc) without text search
        //todo, wait, what? is that true
        if (req.query.metaData && !req.query.q) {
            getRecords(req, res, options, callback)
        }
        else {
            getDocs(req, res, options, callback)
        }
    })

    app.get('/data/:id', function (req, res) {
        var db = app.get('db');
        var callback = function (err, docs) {
            if (err) {
            res.send(err);
            } else {
            res.send(docs);
            }
        }
        if (req.query.metaData) {
            db.things.find({id: req.params.id}, callback);
        }
        else {
            db.things.findDoc({id: req.params.id}, callback);
        }
    });
    app.post('/data/', function (req, res) {

        /*if (typeof req.body.omgVersion !== "number" || req.body.omgVersion < 1) {
            res.send({});
            return;
        }*/

        if (req.body.id && !req.user) {
            res.send({});
            return;
        }

        var db = app.get('db');

        if (req.body.id) {
            db.things.findDoc({id: req.body.id}, function (err, docs) {
                if (err) {
                res.send(err);
                } 
                else {
                    if (docs.user_id === req.user.id) {
                        postData(req, res, db)
                    }
                    else {
                        res.send({});
                        console.log(docs.user_id, req.user.id)
                        console.log("tried to overwrite someone elses file")
                    }
                }
            });
        }
        else {
            postData(req, res, db)
        }
    });

    app.delete('/data/:id', function (req, res) {

        if (!req.params.id || !req.user) {
            res.send({"error": "access denied"});
            return;
        }

        var db = app.get('db');
        db.things.findDoc({id: req.params.id}, function (err, docs) {
            if (err) {
                res.send(err);
            } 
            else {
                if (docs.user_id === req.user.id || req.user.admin) {
                    db.things.destroy({id: req.params.id}, function (err, result) {
                        if (!err) {
                            res.send(result);
                        }
                        else {
                            res.send(err);
                        }
                    }); 
                }
                else {
                    res.send({"error": "access denied"});
                }
            }
        });
    });

    app.get('/view/:id', function (req, res) {
        var db = app.get('db');
        db.things.find({id: req.params.id}, function (err, docs) {
            if (err) {
                res.send(err);
            } else {
                res.send(viewer(docs[0]));
            }
        });
    });

    app.get('/star/', function (req, res) {
        if (!req.user) {
            res.send("not logged in");
            return;
        }

        var db = app.get('db');
        db.stars.findDoc({user_id: req.user.id, thing_id: req.body.id}, {}, function (err, docs) {
            if (err) {
                res.send(err);
            }
            else {
                res.send(docs);
            }
        });
        
    });

    app.post("/playcount", function (req, res) {

        var db = app.get('db');
        db.run("update things set playcount = playcount + 1 where id=" + req.body.id, function(err, docs){
            if (err) {
                console.log(err);
            }
            res.send(err || docs)
        });
    });

    app.get('/most-plays/', function (req, res) {
        var db = app.get('db');
        
        var perPage = req.query.perPage || 20;
        db.things.find({"playcount >": 0}, {
            columns: findColumns,
            order: "playcount desc",
            offset: (parseInt(req.query.page || "1") - 1) * perPage,
            limit: perPage
        }, function (err, docs) {
            if (err) {
                res.send(err);
            }
            else {
                res.send(docs);
            }
        });
    });

    var multer = require('multer');
    const upload = multer();

    app.post('/preview', upload.any(), (req, res) => {
        fs.writeFile("www/preview/" + req.body.id + ".png", req.files[0].buffer, (err) => {
            if (err) {
                console.log('Error: ', err);
                res.status(500).send({"error": err.message});
            } else {
                res.status(200).send({});
            }
        });
    });

    app.post('/upload', upload.any(), (req, res) => {
        if (!req.user) {
            res.status(500).send({"error": "access denied"});
            return;
        }
        if (!req.user.id || ! req.body.filename) {
            res.status(500).send({"error": "wrong parameters"});
            return;
        }

        var db = app.get("db")
        db.users.findOne({id: req.user.id}, (err, user) => {
            if (err) return res.status(500).send({"error": "user not found"});
            if (typeof user.upload_limit === "string") {
                user.upload_limit = parseInt(user.upload_limit)
            }
            if (user.upload_limit !== -1 && user.uploaded_bytes + req.files[0].buffer.length >= user.upload_limit) {
                return res.status(500).send({"error": "upload limit reached"});
            }

            var filename = "www/uploads/" + req.user.id
            var fs = require("fs")
            if (!fs.existsSync(filename)){
                fs.mkdirSync(filename);
            }
        
            if (req.body.setId) {
                filename = filename + "/" + req.body.setId 
                if (!fs.existsSync(filename)){
                    fs.mkdirSync(filename);
                }    
            }
        
            filename = filename + "/" + req.body.filename
            fs.writeFile(filename, req.files[0].buffer, (err) => {
                if (err) {
                    console.log('Error: ', err);
                    res.status(500).send({"error": err.message});
                } else {
                    res.status(200).send({success: true});
                    db.run("update users set uploaded_bytes = uploaded_bytes + " + req.files[0].buffer.length +
                        "where id = " + req.user.id)
                }
            });
        
        })
    });


    var getRecords = function (req, res, options, callback) {
        var db = app.get('db');
        var find = {}
        if (req.query.user_id) {
            find["body ->> 'user_id'"] = req.query.user_id;
        }
        if (req.query.users === "me") {
            find["body ->> 'user_id'"] = req.user ? req.user.id : -1;
        }
        if (req.query.type) {
            if (req.query.type === "MELODY" || req.query.type === "BASSLINE" || req.query.type === "DRUMBEAT") {
                find["body ->> 'partType'"] = req.query.type;
            }
            else {
                find["body ->> 'type'"] = req.query.type;
            }
            
            if (req.query.type === "SOUNDSET") {
                if (!req.user || !req.user.admin) {
                    find["body ->> 'approved'"]  = true;                
                }
                options.limit = 100;
            }
        }
    
        if (req.query.sort) {
            if (req.query.sort === "most-plays") {
                options.order = "playcount desc"
            }
        }
        options.columns = findColumns
        if (req.query.q) {
            find = {keys:["body ->> 'tags'", "body ->> 'name'"], term: req.query.q};
        }
        db.things.find(find, options, callback)
    };
    
    var getDocs = function (req, res, options, callback) {
        var db = app.get('db');
        var find = {}
        if (req.query.user_id) {
            find.user_id = req.query.user_id;
        }
        if (req.query.users === "me") {
            find.user_id = req.user ? req.user.id : -1;
        }
        if (req.query.type) {
            if (req.query.type === "MELODY" || req.query.type === "BASSLINE" || req.query.type === "DRUMBEAT") {
                find.partType = req.query.type;
            }
            else {
                find.type = req.query.type;
            }
            
            if (req.query.type === "SOUNDSET") {
                if (!req.user || !req.user.admin) {
                    find.approved  = true;                
                }
                options.limit = 100;
            }
        }
    
        if (req.query.q) {
            find = {keys:["tags", "name"], term: req.query.q};
            db.things.searchDoc(find, options, callback);
        }
        else {
            if (JSON.stringify(find) == "{}") {
                find = "*";
            }        
            db.things.findDoc(find, options, callback);
        }
    };
    
    var postData = function (req, res, db) {
        if (req.user) {
            req.body.user_id = req.user.id;
            req.body.username = req.user.username;
        }
        else {
            delete req.body.user_id
            delete req.body.username
        }
        if (req.body.approved && (!req.user || !req.user.admin)) {
            delete req.body.approved;
        }
    
        if (!req.body.created_at) {
            req.body.created_at = Date.now();
        }
        req.body.last_modified = Date.now();
    
        db.saveDoc("things", req.body, function (err, result) {
            if (!err) {
                res.send(result);
            }
            else {
                res.send(err);
                console.log(err);
            }
        }); 
    };
    
    app.post('/comments', (req, res) => {
        if (!req.user) {
            res.send("no user")
            return
        }
        req.body.id_user = req.user.id
        req.body.username = req.user.username

        var db = app.get('db')
        db.query("update things set commentcount = commentcount + 1 where id=" + req.body.id_thing, function(err, docs){
            if (err) {
                console.log(err);
                res.send(err)
                return
            }
            db.comments.save(req.body, function(err, docs){
                res.send(err || docs)
            });
        });
    });

    app.get('/comments/:id', (req, res) => {
        app.get('db').comments.find({id_thing: req.params.id}, function(err, docs){
            res.send(err || docs)
        });
    });

}
