module.exports = (app) => {

    var viewer = require("./viewer.js")
    var findColumns = ["playcount", "commentcount", "id", "body", "upvotes", "downvotes"]

    app.get('/user', function (req, res) {
        if (req.user) {
            delete req.user.password;
            delete req.user.bpassword;
            req.user.username = req.user.username.trim()
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
                    else if (docs.editableBy === "allUsers") {
                        // make sure other users don't change ownership 
                        req.body.editableBy = "allUsers"
                        req.body.user_id = docs.user_id
                        req.body.username = docs.username;
                        postData(req, res, db)
                    }
                    else {
                        res.send({error: "not your data"});
                        //("tried to overwrite someone elses file")
                    }
                }
            });
        }
        else {
            if (req.user) {
                req.body.user_id = req.user.id;
                req.body.username = req.user.username;
            }
            else {
                delete req.body.user_id
                delete req.body.username
            }
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

    app.post('/vote/', function (req, res) {
        if (!req.user) {
            res.send("not logged in");
            return;
        }

        var db = app.get('db');
        var id_thing = req.body.id_thing
        var id_comment = req.body.id_comment || 0
        var vote = req.body.vote
        
        if (vote > 1 || vote < -1) {
            res.send("vote must be -1, 0, or 1");
            return;
        }
        var find = {"id_user": req.user.id, 
            "id_thing": id_thing, 
            "id_comment": id_comment
        }
        var columns = ["id", "id_user", "id_thing", "id_comment", "vote"]

        var updateThing = (oldVote) => {
            if (oldVote === vote) {
                return
            }

            var id = id_comment || id_thing
            var table = id_comment ? "comments" : "things"

            var updates = []
            if (oldVote === 1) {
                updates.push("upvotes=upvotes - 1")
            }
            else if (oldVote === -1) {
                updates.push("downvotes=downvotes - 1")
            }
            if (vote === 1) {
                updates.push("upvotes=upvotes + 1")
            }
            else if (vote === -1) {
                updates.push("downvotes=downvotes + 1")
            }
            
            var updateString = updates.join(", ")
            
            db.run(`UPDATE ${table} SET ${updateString} WHERE id=${id}`, (err,result) => {
                if (err) {
                    console.error(err); 
                }
            })
        }

        db.votes.find(find, columns, (err, result) => {
            if (err) {
                return res.send(err); 
            }

            if (result.length === 0) {
                find.vote = vote
                db.votes.save(find, (err, result) => {
                    if (err) {
                        res.send(err); 
                    }
                    else {
                        res.send(result)
                        updateThing(0)
                    }
                })
            }
            else {
                result = result[0]
                var oldVote = result.vote
                result.vote = vote
                db.votes.save(result, (err, result) => {
                    if (err) {
                        res.send(err); 
                    }
                    else {
                        res.send(result)
                        updateThing(oldVote)
                    }
                })
            }
        })        
    });

    app.post("/playcount", function (req, res) {

        var db = app.get('db');
        db.run("update things set playcount = playcount + 1 where id=" + req.body.id, function(err, docs){
            if (err) {
                console.error(err);
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
                console.error('Error: ', err);
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
            if (user.upload_limit !== -1 && user.uploaded_bytes + req.files[0].buffer.length < user.upload_limit) {
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
                    console.error('Error: ', err);
                    res.status(500).send({"error": err.message});
                } else {
                    res.status(200).send({success: true, filename: filename.substr(3)});
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
        else {
            find["body ->> 'draft'"]  = null
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
            //find = {keys:["body ->> 'tags'", "body ->> 'name'"], term: req.query.q};
            find["body ->> 'name'"] = req.query.q
            find["body ->> 'tags'"] = req.query.q
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
            let search = {keys: ["tags", "name"], term: req.query.q};
            search.where = find
            db.things.searchDoc(search, options, callback);
        }
        else {
            if (JSON.stringify(find) == "{}") {
                find = "*";
            }        
            db.things.findDoc(find, options, callback);
        }
    };
    
    var postData = function (req, res, db) {
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
                console.error(err);
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
        db.things.findDoc(req.body.id_thing, (err, thing) => {
            if (err) return res.send(err)
    
            db.comments.save(req.body, function(err, docs){
                res.send(err || docs)
                if (err) {
                    return 
                }

                postToInbox({
                    url: "/view/" + thing.id,
                    thingId: thing.id,
                    type: "comment",
                    to: thing.user_id,
                    fromUserId: req.user.id,
                    fromUsername: req.user.username,
                    datetime: Date.now()
                })

                var updateSql = "update things set commentcount = commentcount + 1 where id=" + req.body.id_thing 
                db.query(updateSql, (err, docs) => {
                    if (err) console.error(err)
                });
    
            });
        })
    });

    app.get('/comments/:id', (req, res) => {
        app.get('db').comments.find({id_thing: req.params.id}, function(err, docs){
            res.send(err || docs)
        });
    });

    var postToInbox = obj => {
        var db = app.get('db')
        obj.unread = true
        db.saveDoc("inbox", obj, (err, result) => {
            if (err) console.error(err)
        })
    }

    app.get('/inbox', (req, res) => {
        var options = {limit : 8, order : "body ->> 'datetime' desc"}
        app.get('db').inbox.findDoc({to: req.user.id}, options, function(err, docs){
            res.send(err || docs)
        });
    });

    app.post('/inbox/read', (req, res) => {
        var db = app.get('db')
        db.inbox.findDoc(req.body.id, function(err, doc){
            if (err) return res.send(err)

            if (doc && doc.to === req.user.id) {
                doc.unread = false
                db.inbox.saveDoc(doc, (err, result) => {
                    res.send(err || result)
                })
            }
            else {
                res.send("invalid")
            }
        });
    });

    app.get('/util/mime-type', (req, res) => {
        if (!req.query.uri) {
            res.send({})
            return
        }

        require(req.query.uri.startsWith("https") ? "https" : "http").get(req.query.uri, (res2) => {
            var mimeType = res2.headers['content-type'];
            res.send({mimeType})
        });
        
    });

}
