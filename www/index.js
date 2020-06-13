document.getElementById("main-header-link").innerHTML = window.location.hostname
document.title = window.location.hostname
setupUserControls(document.getElementsByClassName("title-bar-user-controls")[0]);




// fp is the front page 
var fp = {};
fp.searchParams = omg.util.getPageParams();
fp.searchParams.resultList = document.getElementsByClassName("search-things")[0];
fp.searchParams.metaData = true

fp.search = function () {
    fp.searchParams.type = fp.searchType.value
    fp.searchParams.sort = fp.searchSort.value
    fp.searchParams.users = fp.searchUser.value
    fp.searchParams.q = fp.searchTerms.value
    omg.search(fp.searchParams, true);
};

fp.searchType = document.getElementById("search-type");
fp.searchSort = document.getElementById("search-sort");
fp.searchUser = document.getElementById("search-user");
fp.searchTerms = document.getElementById("search-terms");

fp.searchType.onchange = fp.search
fp.searchSort.onchange = fp.search
fp.searchUser.onchange = fp.search
fp.searchTerms.onkeypress = e => {
    if (e.charCode === 13) {
        fp.search()
    }
}

fp.isMobileDiv = document.getElementsByClassName("is-mobile")[0]
fp.nowPlayingTitle = document.getElementById("now-playing-title")
fp.nowPlaying = document.getElementsByClassName("now-playing")[0]

fp.searchParams.viewerParams = {}
fp.searchParams.viewerParams.height = 90
fp.searchParams.viewerParams.useExternalPlayer = true

var thingDetail = document.getElementById("thing-detail-panel")
        
fp.searchParams.viewerParams.onclickcontent = viewer => {

    if (fp.iframe) {
        fp.iframe.style.display = "none"
    }
    thingDetail.innerHTML = ""
        
    if (!viewer.viewerURL) {
        omg.loadSearchResult(viewer.metaData, {
            resultList: thingDetail, 
            viewerParams: {showComments: true},
            metaData: true
        })
        return
    }

    if (!fp.iframe) {
        fp.iframe = document.createElement("iframe")
        fp.nowPlaying.appendChild(fp.iframe)
        
    }

    fp.iframe.style.display = "block"
    fp.iframe.src = viewer.viewerURL + "?id=" + viewer.data.id
    fp.lastViewer = viewer
    
}


window.onload = function () {

    if (window.location.hash.length === 0 || window.location.hash === "#most-plays") {
    }
    if (window.location.hash === "#most-recent") {
        //todo
    }
};

var menuVisible = false;
document.getElementsByClassName("main-nav-drawer-icon")[0].onclick = function () {
    document.getElementsByClassName("main-nav")[0].style.display = menuVisible ? 
            "" : "block";
    menuVisible = !menuVisible;
};


var listEl = document.getElementById("create-list")
omg.server.getTypes(types => {
    for (var type in types) {
        var optionEl = document.createElement("option")
        optionEl.innerHTML = type
        fp.searchType.appendChild(optionEl)

        if (types[type].editors.length > 0) {
            var editorLink = document.createElement("li")
            editorLink.innerHTML = "<a href='" + types[type].editors[0].url + 
                    "' class='create-link'>+ <span class='nav-text'>" + type + "</span></a>"
            listEl.appendChild(editorLink)
        }
    }
    fp.search()

})

var postInput = document.getElementById("post-text")
document.getElementById("post-button").onclick = e => {
    //are we logged in?
    if (!omg.user) {
        alert("you have to log in first")
        return
    }

    if (postInput.value.trim().length === 0) {
        if (!draftPost || !draftPost.attachments.length === 0) {
            return
        }
    }

    var newPost = {type: "TEXTPOST"}
    if (draftPost) {
        delete draftPost.draft
        //todo look at the attachments, and see what type it should be
        draftPost.type = "TEXTPOST"
        newPost = draftPost
    }
    newPost.text = postInput.value

    omg.server.post(newPost, result => {
        postInput.value = ""
        draftPost = undefined
        attachmentsList.innerHTML = ""
        
        omg.loadSearchResult(result, {prepend: true, 
            resultList: fp.searchParams.resultList})
    })
}


//
//  Code for uploading attachments
//


var makeDraftPost = () => {
    return {
        draft: true,
        attachments: []
    }
}
var draftPost

var dropZone = postInput //document.getElementById("drop-zone")
dropZone.ondragover = (e) => {
    e.preventDefault()
    dropZone.classList.add("drop-zone-hover")
}
dropZone.ondragleave = (e) => {
    e.preventDefault()
    dropZone.classList.remove("drop-zone-hover")
}
dropZone.ondrop = (e) => {
    e.preventDefault()
    dropZone.classList.remove("drop-zone-hover")

    if (!omg.user) {
        alert("Login/Signup to upload")
        return
    }

    if (e.dataTransfer.items) {
        if (draftPost && draftPost.id) {
            handleDroppedItems(e.dataTransfer.items)
        }
        else {
            omg.server.post(makeDraftPost(), res => {
                draftPost = res
                handleDroppedItems(e.dataTransfer.items)
            })
        }
    }
}

var handleDroppedItems = (items) => {
    for (var i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
            handleDroppedItem(items[i])
        }
    }
}

var handleDroppedItem = (item) => {
    var file = item.getAsFile()
    var media = {
        mimeType: item.type, //.startsWith("image/")
        url: window.location.origin + "/uploads/" + omg.user.id + "/" + draftPost.id + "/" + file.name, 
        name: makeMediaName(file.name)
    }
    draftPost.attachments.push(media)
    
    var statusDiv = makeAttachmentEl(media)
    statusDiv.innerHTML = "Uploading..."
    
    var fd = new FormData();
    fd.append('setId', draftPost.id);
    fd.append('file', file);
    fd.append('filename', file.name);
    
    omg.server.postHTTP("/upload", fd, (res)=>{
        statusDiv.innerHTML = res.success ? 
            "<font color='green'>Uploaded</font>" : ("<font color='red'>Error</font> " + res.error)
    });
}

var makeMediaName = (filename) => {
    // just the stem of the filename, no path, no extension, underscores a& dashes to space 
    return filename.split("/").pop().split(".")[0].replace("_", " ").replace("-", " ")
}

var attachmentsList = document.getElementById("post-attachments-list")
var makeAttachmentEl = (attachment) => {
    var div = document.createElement("div")
    div.innerHTML = attachment.name
    div.className = "post-attachment-upload"
    var statusDiv = document.createElement("div")
    statusDiv.className = "post-attachment-upload-status"
    div.appendChild(statusDiv)
    attachmentsList.appendChild(div)
    return statusDiv
}