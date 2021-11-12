export default function DnDUploader() {

}

DnDUploader.prototype.setupDropZone = function (params) {

    var dropZoneClassName = params.className || "drop-zone-hover"
    var dropZone = params.div

    dropZone.ondragover = (e) => {
        e.preventDefault()
        dropZone.classList.add(dropZoneClassName)
    }
    dropZone.ondragleave = (e) => {
        e.preventDefault()
        dropZone.classList.remove(dropZoneClassName)
    }
    dropZone.ondrop = async (e) => {
        e.preventDefault()
        dropZone.classList.remove(dropZoneClassName)
    
        var files = []
        var file
        var item
        for (var i = 0; i < e.dataTransfer.items.length; i++) {
            var item = e.dataTransfer.items[i]
            if (item.kind === "file") {
                file = item.getAsFile()
                files.push({file, type: item.type}) 
            }
            else if (item.type === "text/uri-list") {
                item.getAsString(s => files.push({uri: s}))
            }
    
        }
        
        var ok = await omg.ui.loginRequired()
        if (!ok) {
            return
        }
    
        if (files) {

            this.handleDroppedItems(files, params)

            //todo handle unsaved drafts
            /*
            if (draftPost && draftPost.id) {
                handleDroppedItems(files)
            }
            else {
                omg.server.post(makeDraftPost(), res => {
                    draftPost = res
                    handleDroppedItems(files)
                })
            }
            */
        }
    }

    
}


DnDUploader.prototype.handleDroppedItems = function (items, params) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].file) {
            this.handleDroppedFile(items[i], params)
        }
        else if (items[i].uri) {
            handleDroppedURI(items[i].uri)
        }
    }
}

DnDUploader.prototype.handleDroppedFile = async function (item, params) {
    var file = item.file
    var media = {
        mimeType: item.type, //.startsWith("image/")
        url: window.location.origin + "/uploads/" + omg.user.id + "/" + params.thingId + "/" + file.name, 
        name: makeMediaName(file.name)
    }

    if (params.onstartupload) {
        var statusDiv = params.onstartupload(media)
    }

    var fd = new FormData();
    fd.append('setId', params.thingId);
    fd.append('file', file);
    fd.append('filename', file.name);
    
    var response = await fetch("/upload", {
        method: "post",
        body: fd
    })
    
    // the server responds with 500 error code for things that aren't really server errors, eg upload limit reached
    if (response.status !== 200 && response.status !== 500) {
        console.log(response.status)
        if (params.onfail) {
            params.onfail(media, statusDiv, response.status + ": " + response.statusText)
        }
    }
    else {
        response.json().then(res => {
            if (res.success) {
                if (params.onsuccess) {
                    params.onsuccess(media, statusDiv)
                }
            }
            else {
                if (params.onfail) {
                    params.onfail(media, statusDiv, res.error)
                }
            }
        })
    }

}

var makeMediaName = (filename) => {
    // just the stem of the filename, no path, no extension, underscores a& dashes to space 
    return filename.split("/").pop().split(".")[0].replace("_", " ").replace("-", " ")
}

var handleDroppedURI = (uri) => {

    console.log("/util/mime-type?uri=" + encodeURIComponent(uri))
    omg.server.getHTTP("/util/mime-type?uri=" + encodeURIComponent(uri), res => {
        var media = {
            mimeType: res.mimeType, 
            url: uri, 
            name: makeMediaName(uri)
        }
        draftPost.attachments.push(media)
    
        var statusDiv = makeAttachmentEl(media)
    })    
}