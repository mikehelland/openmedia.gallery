"use strict";

if (typeof omg === "undefined") {
    omg = {};
    console.log("No OMG Obejcts for embedded_viewer.js, not good!");
}

function OMGEmbeddedViewer(params) {
    this.params = params
    this.data = params.data
    this.div = params.div
    this.metaData = params.metaData


    //figure out its type, and a viewer.js
    if (this.data.type) {
        if (omg.types[this.data.type]) {//} && omg.types[this.data.type].embed) {
            this.type = omg.types[this.data.type]
            if (this.type.editors[0]) {
                this.editorURL = this.type.editors[0].url
            }
            if (this.type.viewers[0]) {
                this.viewerURL = this.type.viewers[0].url
            }
            
            if (this.type.embed && !this.type.embedScriptTag) {
                this.type.onready = []
                this.type.embedScriptTag = document.createElement("script")
                this.type.embedScriptTag.onload = e => {
                    this.type.onready.forEach(f => {
                        try {
                            f()
                        } catch (e) {console.log(e)}
                    })
                    this.type.onready = []
                }
                this.type.embedScriptTag.src = this.type.embed
                document.body.appendChild(this.type.embedScriptTag)
            }
        }
        else {
            this.type = {}
        }
    }

    this.setupControls(params);
    
    if (!this.type.embedClass) {
        if (this.type.onready) {
            this.type.onready.push(() => {
                this.embedViewer = new this.type.embedClass(this.data, this.embedDiv)
            })    
        }
        else {
            this.embedDiv.innerHTML = JSON.stringify(this.data).substr(0,64) + "..."
        }
    }
    else {
        this.embedViewer = new this.type.embedClass(this.data, this.embedDiv)
    }

    if (this.params.showComments) {
        this.showComments()
    }
};

OMGEmbeddedViewer.prototype.setupControls = function (params) {
    this.div.style.position = "relative";

    this.makeTopRow()

    //the guts
    this.embedDiv = document.createElement("div")
    this.embedDiv.style.maxHeight = (params.height || 150) + "px";
    this.embedDiv.style.overflow = "hidden"
    this.embedDiv.style.cursor = "pointer"
    this.embedDiv.onclick = e => {
        if (this.params.onclickcontent) {
            this.params.onclickcontent(this)
        }    
    }
    this.div.appendChild(this.embedDiv);


    this.makeBottomRow()    
};


OMGEmbeddedViewer.prototype.onclickcontent = function () {}

OMGEmbeddedViewer.prototype.makeTipJar = function () {
    var url = 'bitcoin:' + (this.data.btc_address || '37WEyjvqgY6mEZDMiSTN11YWy5BYP8rP6e') + '?amount=0.00100000&label=OMG%20Tip%20Jar';
    this.tipJar = document.createElement("div");
    this.tipJar.className = "tip-jar";

    this.qrCanvas = document.createElement("canvas");
    var canvasDiv = document.createElement("div");
    canvasDiv.className = "tip-jar-canvas";

    this.tipJarLink = document.createElement("div");
    this.tipJarLink.innerHTML = "<a href='" + url + "'>" + url + "</a>";

    this.qr = new QRious({
        element: this.qrCanvas,
        value: url
    });
    
    canvasDiv.appendChild(this.qrCanvas);
    this.tipJar.appendChild(canvasDiv)
    this.tipJar.appendChild(this.tipJarLink)

    this.qr.element.onclick = function () {
        window.location = url;
    };
    omg.ui.showDialog(this.tipJar)
};

OMGEmbeddedViewer.prototype.makeTopRow = function () {
    //caption
    this.captionDiv = document.createElement("div");
    this.caption = this.data.name || this.data.tags || "";
    if (this.caption.length === 0) {
        // show (type) as caption if there isn't one
        this.caption = "<span class='omg-thing-type'>" + this.data.type.substring(0, 1).toUpperCase() +
            this.data.type.substring(1).toLowerCase() + "</span>";
    }
    this.captionDiv.innerHTML = this.caption
    this.captionDiv.className = "omg-thing-title";
    this.div.appendChild(this.captionDiv)
    
    //user
    this.userDiv = document.createElement("div");
    this.userDiv.className = "omg-thing-user";
    this.userDiv.innerHTML = this.data.username ? "by " + this.data.username : "";
    this.div.appendChild(this.userDiv);    
        
    this.rightData = document.createElement("div");
    this.rightData.className = "omg-thing-right-data";
    this.div.appendChild(this.rightData);

    //date
    this.datetimeDiv = document.createElement("span");
    this.datetimeDiv.className = "omg-thing-created-at";
    this.datetimeDiv.innerHTML = omg.util.getTimeCaption(parseInt(this.data.last_modified));
    this.rightData.appendChild(this.datetimeDiv);    

    //votes?
    var resultData = document.createElement("span");
    resultData.className = "omg-thing-votes";
    resultData.innerHTML = (this.data.votes || "0") + " votes";

}

OMGEmbeddedViewer.prototype.makeBottomRow = function () {
    var bottomRow = document.createElement("div")
    bottomRow.className = "omg-viewer-bottom-row"

    this.tipButton = document.createElement("div");
    this.tipButton.className = "omg-music-controls-button";
    this.tipButton.innerHTML = "Tip";
    this.tipButton.onclick = () => {
        this.showTipJar()
    };
    bottomRow.appendChild(this.tipButton)

    this.commentButton = document.createElement("div");
    this.commentButton.className = "omg-music-controls-button";
    this.commentButton.innerHTML = "Comment";
    if (this.metaData && this.metaData.commentcount > 0) {
        this.commentButton.innerHTML += " (" + this.metaData.commentcount + ")"
    }
    this.commentButton.onclick = () => {
        this.showComments()
    };
    bottomRow.appendChild(this.commentButton)

    if (this.data.id) {
        this.shareButton = document.createElement("a");
        this.shareButton.className = "omg-music-controls-button";
        this.shareButton.innerHTML = "Link";
        this.shareButton.href = this.viewerURL ? 
                this.viewerURL + "?id=" + this.data.id :
                "/view/" + this.data.id
        bottomRow.appendChild(this.shareButton)
    }

    if (this.data.id && this.editorURL) {
        this.editButton = document.createElement("a");
        this.editButton.className = "omg-music-controls-button";
        this.editButton.innerHTML = "Edit";
        this.editButton.href = this.editorURL + "?id=" + this.data.id;
        bottomRow.appendChild(this.editButton)
    }

    this.voteButton = document.createElement("div");
    this.voteButton.className = "omg-music-controls-button";
    this.voteButton.innerHTML = "&#x2B06";
    this.voteButton.title = "Upvote";

    
    if (this.params.deleteButton) {
        var resultData = document.createElement("span");
        resultData.className = "omg-music-controls-button";
        resultData.innerHTML = "Delete &times;";
        resultData.onclick = () => {
            omg.server.deleteId(this.data.id, () => {
                this.div.parentElement.removeChild(this.div)
            });
        }
        resultData.style.float = "right"
        bottomRow.appendChild(resultData);
    }

    if (false && params.result && params.result.playcount) {
        resultData = document.createElement("span");
        resultData.className = "omg-thing-playcount";
        resultData.innerHTML = params.result.playcount + " &#9658;";
        bottomRow.appendChild(resultData);        
    }

    this.div.appendChild(bottomRow)
}

OMGEmbeddedViewer.prototype.showTipJar = function () {

    if (this.tipJar) {
        omg.ui.showDialog(this.tipJar)
        return;
    }
    
    if (typeof QRious === "undefined") {
        var scriptTag = document.createElement("script");
        scriptTag.onload = this.makeTipJar;
        scriptTag.src = "https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js";
        scriptTag.async = true;
        document.body.appendChild(scriptTag);
    }
    else {
        this.makeTipJar();
    }      
}

OMGEmbeddedViewer.prototype.showComments = function () {
    if (this.isCommentsShowing) {
        this.commentSectionDiv.style.display = "none"
        this.isCommentsShowing = false
        return
    }

    if (!this.commentSectionDiv) {
        this.commentSectionDiv = document.createElement("div")
        this.div.appendChild(this.commentSectionDiv)

        var commentBox = document.createElement("div")
        commentBox.className = "omg-viewer-comment-box"
        
        var commentUserName = document.createElement("div")
        commentUserName.innerHTML = omg.user ? omg.user.username : "login!"
        commentBox.appendChild(commentUserName)
        
        this.commentInput = document.createElement("input")
        this.commentInput.placeholder = "type comment here..."
        this.commentInput.className = "omg-viewer-comment-input"
        this.commentInput.onkeypress = e => {
            if (e.keyCode === 13) {
                this.postComment()
            }
        }
        commentBox.appendChild(this.commentInput)

        var commentButton = document.createElement("button")
        commentButton.innerHTML = "Post"
        commentButton.onclick = e => this.postComment()
        commentBox.appendChild(commentButton)

        this.commentSectionDiv.appendChild(commentBox)
        this.commentList = document.createElement("div")
        this.commentSectionDiv.appendChild(this.commentList)
    }
    else {
        this.commentList.innerHTML = ""
    }

    this.commentSectionDiv.style.display = "block"
    omg.server.getComments(this.data.id, results => {
        results.forEach(comment => {
            this.makeCommentDiv(comment)
        })
    })
    this.isCommentsShowing = true
}

OMGEmbeddedViewer.prototype.postComment = function () {
    if (!omg.user) {
        alert("login first")
        return
    }

    if (this.commentInput.value.trim().length === 0) {
        return
    }
    omg.server.postComment(this.commentInput.value, this.data.id, 0, res => {
        console.log(res)
        this.commentInput.value = ""
        this.makeCommentDiv(res)
    })
}

OMGEmbeddedViewer.prototype.makeCommentDiv = function (comment) {

    var commentDiv = document.createElement("div")
    commentDiv.innerHTML = "<a href='' class='omg-viewer-comment-username'>" + 
                            comment.username.trim() + "</a> " + comment.text
    commentDiv.className = "omg-viewer-comment"
    this.commentList.appendChild(commentDiv)

}