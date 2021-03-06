module.exports = function (app) {
    var massive = require("massive");

    var connectErrorMessage = `COULD NOT CONNECT TO DATABASE! 
            
    Run with ./runomg.sh

    Check:
    1. OMG_DB_NAME environment variable is set          
        export OMG_DB_NAME=name
    2. OMG_DB_PW environment variable is set            
        export OMG_DB_PW=password
    3. Make sure Postgresql 9.4 or later is installed   
        sudo apt install postgresql postgresql-contrib        
    4. Also make sure database exists                   
        ./create_database.sh`

    var db
    var connect = () => {
        var ok = true
        try {
            console.log("Connecting to database...");
            db = massive.connectSync({connectionString: 
                   `postgres://${process.env.OMG_DB_NAME}:${process.env.OMG_DB_PW}@localhost/${process.env.OMG_DB_NAME}`});
            app.set('db', db);
            console.log("ok.");
        }
        catch (excp) {
            console.log(excp);
            console.log(connectErrorMessage);
            ok = false
        }
        return ok
    }
    
    if (connect()) {
        if (!db.things) {
            db.saveDoc("things", {
                type: "TEXT", text: "Welcome to your new OMG Server!",
               created_at: Date.now(), last_modified: Date.now() 
            }, (err,ress) => {
                db.run(`alter table things 
                        add column commentcount bigint default 0,
                        add column playcount bigint default 0,
                        add column upvotes bigint default 0, 
                        add column downvotes bigint default 0,
                        add column deleted boolean default false`);
            })
        }
        if (!db.comments) {
            db.run(`CREATE TABLE comments 
                (id bigserial primary key,
                id_thing bigint, id_parent bigint, id_user bigint,
                text text,
                username char(20),
                upvotes bigint default 0,
                downvotes bigint default 0,
                deleted boolean default false,
                datetime timestamp not null default current_timestamp,
                other jsonb)`, (err,res) => {
                    // remake the db object so it has the new table
                    connect()
                })
        }
        if (!db.votes) {
            db.run(`CREATE TABLE votes 
                (id bigserial primary key,
                id_thing bigint, id_comment bigint, id_user bigint,
                vote int default 0)`, (err,res) => {
                    // remake the db object so it has the new table
                    connect()
                })
        }
    }
}
