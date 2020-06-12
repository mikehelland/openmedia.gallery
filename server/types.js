// see what apps are installed on this server and what types they support
// each app has a manifest.json that describes the different activities it does

module.exports = function (expressApp, express) {
    var fs = require("fs");

    var types = {}
    
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
            if (!manifest.activities) {
                return
            }

            manifest.activities.forEach(activity => {

                if (activity.views) {
                    activity.views.forEach(type => {
                        if (!types[type]) {
                            types[type] = {editors: [], viewers: []}
                        } 
        
                        types[type].viewers.push({name: activity.name, 
                            url: "/apps/" + app + "/" + activity.url}) 
                    })    
                }

                if (activity.edits) {
                    activity.edits.forEach(type => {
                        if (!types[type]) {
                            types[type] = {editors: [], viewers: []}
                        } 
        
                        types[type].editors.push({name: activity.name, 
                            url: "/apps/" + app + "/" + activity.url})     
                    })
                }

                if (activity.embeds) {
                    activity.embeds.forEach(type => {
                        if (!types[type]) {
                            types[type] = {editors: [], viewers: []}
                        } 
                        types[type].embed = "/apps/" + app + "/" + activity.url
        
                    })
                }

            })
            console.log("Found app " + app)
        }
            
    })

    expressApp.get('/types', function (req, res) {
        res.send(types);
    });

    return types    
}
