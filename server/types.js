// see what apps are installed on this server and what types they support
// each app has a manifest.json that describes the different activities it does

module.exports = function (expressApp, express) {
    var fs = require("fs");

    var types = {}
    var apps = {}
    var getType = type => {
        if (!types[type]) {
            types[type] = {editors: [], viewers: [], usedBy: []}
        }
        return types[type]
    }

    expressApp.set('types', types);
    expressApp.set('apps', apps);

    fs.readdirSync("apps").forEach(app  => {
        if (app.startsWith(".")) {
            return
        }
        var path = "apps/" + app + "/"
        
        if (fs.existsSync(path + "www")) {
            expressApp.use("/" + path, express.static(path + "www/", {index: "index.htm"}));
        }

        if (fs.existsSync(path + "manifest.json")) {

            var manifest = JSON.parse(fs.readFileSync(path + "manifest.json"))

            apps[app] = {name: manifest.name || app, path: "/" + path} 

            if (!manifest.activities) {
                return
            }

            manifest.activities.forEach(activity => {

                if (activity.views) {
                    activity.views.forEach(type => {
                        getType(type).viewers.push({name: activity.name, 
                            url: "/apps/" + app + "/" + activity.url}) 
                    })    
                }

                if (activity.edits) {
                    activity.edits.forEach(type => {
                        getType(type).editors.push({name: activity.name, 
                            url: "/apps/" + app + "/" + activity.url})     
                    })
                }

                if (activity.embeds) {
                    activity.embeds.forEach(type => {
                        getType(type).embed = "/apps/" + app + "/" + activity.url
                        getType(type).embedClassName = activity.className
        
                    })
                }

                if (activity.socketHandler) {
                    activity.socketHandler.forEach(type => {
                        getType(type).socketHandler = "../apps/" + app + "/" + activity.url
        
                    })
                }

                if (activity.uses) {
                    activity.uses.forEach(type => {
                        getType(type).usedBy.push({name: activity.name, 
                                url: "/apps/" + app + "/" + activity.url})
                    })
                }

            })
            console.log("Found app " + app)
        }

        if (fs.existsSync(path + "server.js")) {
            console.log("running " + path + "server.js")
            try {
                require("./../" + path + "server.js")(expressApp, path)
            }
            catch (e) {
                console.error("error running " + path + "server.js")
                console.error(e)
            }
        }
            
    })

    expressApp.get('/types', function (req, res) {
        res.send({types, apps});
    });

    return types    
}
