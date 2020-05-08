// see what apps are installed on this server and what types they support
// currently, just put a folder in www/apps/ 
// the name of the folder is the type
// the folder should have an editor.htm

module.exports = function (app) {
    var fs = require("fs");

    var types = {}
    
    fs.readdirSync("www/apps").forEach(app  => {
        if (app.startsWith(".")) {
            return
        }
        var path = "www/apps/" + app + "/"
        if (fs.existsSync(path + "manifest.json")) {

            var manifest = JSON.parse(fs.readFileSync(path + "manifest.json"))
            manifest.types.forEach(type => {
                if (!types[type]) {
                    types[type] = {editors: [], viewers: []}
                } 

                types[type].editors.push({name: manifest.name, 
                    url: "apps/" + app + "/" + manifest.editor}) 
                types[type].viewers.push({name: manifest.name, 
                    url: "apps/" + app + "/" + manifest.viewer}) 
                if (manifest.embed) {
                    types[type].embed = "apps/" + app + "/" + manifest.embed
                }
            })
            console.log("Found app " + app)
        }
            
    })

    app.get('/types', function (req, res) {
        res.send(types);
    });

    return types    
}
