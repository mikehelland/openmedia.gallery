module.exports = function (app) {
    var massive = require("massive");
    try {
        console.log("Connecting to database...");
        var db = massive.connectSync({connectionString: 
               `postgres://${process.env.OMG_DB_NAME}:${process.env.OMG_DB_PW}@localhost/${process.env.OMG_DB_NAME}`});
        app.set('db', db);
        console.log("ok.");
    }
    catch (excp) {
        console.log(excp);
        console.log(`COULD NOT CONNECT TO DATABASE! 
        
        Run with ./runomg.sh

        Check:
        1. OMG_DB_NAME environment variable is set          export OMG_DB_NAME=name
        2. OMG_DB_PW environment variable is set            export OMG_DB_PW=password
        3. Make sure Postgresql 9.4 or later is installed   sudo apt install postgresql postgresql-contrib        
        4. Also make sure database exists                   ./create_database.sh`);
    }    
}
