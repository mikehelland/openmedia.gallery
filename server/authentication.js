module.exports = function (app) {
    const passport = require("passport");
    const bcrypt = require('bcrypt');

    // make sure there is at least an admin user
    var db = app.get("db")
    if (db) {
        db.run("select * from users limit 1", (err, results) => {
            if (results.length === 0) {
                console.log("adding admin user")
                bcrypt.hash("admin", 10, function(err, hash) {
                    var newUser = {username: "admin", bpassword: hash, admin:true};
                    db.users.save(newUser)
                })
            }
        })    
    } 

    app.use(passport.initialize());
    app.use(passport.session());
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
    passport.deserializeUser(function(id, done) {
        var db = app.get("db");
        id = typeof id === "string" ? parseInt(id) : id;
        db.users.findOne(id, function (err, user) {
            done(err, user);
        });
    });

    var LocalStrategy = require("passport-local").Strategy;
    passport.use("login", new LocalStrategy(
        function (username, password, done) {
            var db = app.get("db");
            db.users.findOne({username: username}, function (err, user) {
                if (err || !user || !user.bpassword) return done(err);

                bcrypt.compare(password, user.bpassword.trim(), function(err, res) {
                    if(res) {
                        delete user.bpassword;
                        delete user.password;
                        done(null, user);
                        user = {id: user.id, last_login: new Date()}
                        db.users.save(user, (err,user)=>{})
                        return
                    } else {
                        return done(null, false);
                    } 
                });
            });
        }
    ));
    passport.use("signup", new LocalStrategy(
        function (username, password, done) {
            var db = app.get("db");
            
            db.users.findOne({username: username}, function (err, user) {
                if (err) {
                    return done(err);
                }
                if (user) {
                    return done(null, false);
                }

                bcrypt.hash(password, 10, function(err, hash) {
                    var newUser = {username: username, bpassword: hash, admin:false};
                    db.users.save(newUser, function (err, user) {
                        if (err) {
                            return done(err);
                        } 
                        delete user.password;
                        delete user.bpassword;
                        return done(null, user);
                    });
                });
            });
        })
    );

    app.post("/login", (req, res, next) => {
        passport.authenticate('login', function(err, user, info) {
            if (err) { return next(err); }
            var fwd = req.body.fwd ? decodeURIComponent(req.body.fwd) : "/"
            if (!user) { 
                return res.redirect("/signin.htm?invalid-login&fwd=" + fwd); 
            }
            req.logIn(user, function(err) {
              if (err) { return next(err); }
              return res.redirect(fwd);
            });
          })(req, res, next);
    });
    
    app.get("/logout", function (req, res) {
          req.logout();
          res.redirect("/");
       }
    );
    app.post('/signup', (req, res, next) => {
        passport.authenticate('signup', function(err, user, info) {
            if (err) { return next(err); }
            var fwd = req.body.fwd ? decodeURIComponent(req.body.fwd) : "/"
            if (!user) { 
                return res.redirect("/signin.htm?invalid-signup&fwd=" + fwd); 
            }
            req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.redirect(fwd);
            });
        })(req, res, next);
    });
    
    app.post("/api-login",
       passport.authenticate("login"),
       function (req, res) {
            if (req.user) {
                res.send(req.user);
            } else {
                res.send(false);
            }       
       });
    
    app.get("/api-logout", function (req, res) {
          req.logout();
          res.send({});
       }
    );
    app.post('/api-signup', 
       passport.authenticate("signup"), 
          function (req, res) {
            if (req.user) {
                res.send(req.user);
            } else {
                res.send(false);
            }       
       });
    
}