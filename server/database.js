module.exports = function (app) {
    var massive = require("massive");
    try {
        console.log("Connecting to database...");
        var massiveInstance = massive.connectSync({connectionString: 
               `postgres://omusic_db:${process.env.OMG_DB_PW}@localhost/omusic_db`});
        app.set('db', massiveInstance);
        console.log("ok.");    
    }
    catch (excp) {
        console.log(excp.error);
        console.log(`COULD NOT CONNECT TO DATABASE! Check the following:
    
        1. The OMG_DB_PW environment variable is set. Run: export OMG_DB_PW=password
    
        2. Make sure Postgresql 9.4 or later is installed. Run: ./install_database.sh
    
        3. Also make sure database omusic_db exists. Run: ./create_database.sh`);
    }    
}
