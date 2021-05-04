"use strict";

if (typeof omg === "undefined") {
    omg = {};
    console.log("No OMG Obejcts for embedded_viewer.js, not good!");
}

function OMGEmbeddedViewer(params) {
    this.params = params
    this.data = params.data
    this.metaData = params.metaData

    this.viewMode = params.viewMode || ""

    this.parentDiv = params.div
    this.div = document.createElement("div")
    this.div.className = "omg-viewer-thing"
    this.parentDiv.appendChild(this.div)

    //figure out its type, and a viewer script
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
                this.type.embedScriptTag.async = false
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
    
    if (!this.data.type || !this.type.embedClassName) {
        this.embedDiv.innerHTML = JSON.stringify(this.data).substr(0,64) + "..."
    }
    else if (!window[this.type.embedClassName]) {
        if (this.type.onready) {
            this.type.onready.push(() => {
                this.embedViewer = new (window[this.type.embedClassName])(this) 
            })    
        }
        else {
            this.embedDiv.innerHTML = JSON.stringify(this.data).substr(0,64) + "..."
        }
    }
    else {
        try {
            this.embedViewer = new window[this.type.embedClassName](this) 
        } catch (e) {console.error(e)}
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
    if (params.maxHeight) {
        this.embedDiv.style.maxHeight = params.maxHeight + "px";
    }
    this.embedDiv.className = "omg-viewer-embed"

    if (this.params.onclickcontent) {
        this.embedDiv.style.cursor = "pointer"
        this.embedDiv.onclick = e => {
            this.params.onclickcontent(this, e)
        }    
    }
    this.div.appendChild(this.embedDiv);


    this.makeBottomRow()    
};


OMGEmbeddedViewer.prototype.onclickcontent = function () {}

OMGEmbeddedViewer.prototype.makeTipJar = function () {

    //todo get data or user's tipjar links
    var squareTipJarHTML = `
  <div style="overflow: auto;">
  
  <a target="_blank" href="https://checkout.square.site/merchant/4W0D38NGJ7DGP/checkout/P3UWGHPUMAWSC7IMDDROMRWY" style="
    display: inline-block;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 18px;
    line-height: 48px;
    height: 48px;
    padding-left: 48px;
    padding-right: 48px;
    color: #ffffff;
    min-width: 165px;
    background-color: #000000;
    border-radius: 4px;
    text-align: center;
    box-shadow: 0 0 0 1px rgba(0,0,0,.1) inset;
  ">Tip Through Square</a>
</div>`


    var url = 'bitcoin:' + (this.data.btc_address || '15NcvAoRwnt7eRRe87QpnHHLXGFoHjrJYV') + '?amount=0.00100000&label=OMG%20Tip%20Jar';
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

    this.tipJar.innerHTML = squareTipJarHTML + "<hr><div>Or Bitcoin:</div>"
    this.tipJar.appendChild(canvasDiv)
    this.tipJar.appendChild(this.tipJarLink)

    this.qr.element.onclick = function () {
        window.location = url;
    };

    document.body.appendChild(this.tipJar)
    omg.ui.showDialog(this.tipJar)
};

OMGEmbeddedViewer.prototype.makeTopRow = function () {
    this.topRow = document.createElement("div")
    this.topRow.className = "omg-thing-top-row" //+ (this.viewMode === "MICRO" ? "-overlay" : "")
    this.div.appendChild(this.topRow)

    //type 
    if (this.data.type) {
        this.typeDiv = document.createElement("span");
        this.typeDiv.className = "omg-thing-type"
        this.typeDiv.innerHTML = this.data.type
        this.topRow.appendChild(this.typeDiv)
    }
    
    //caption
    this.captionDiv = document.createElement("div");
    this.caption = this.data.name || this.data.tags || "";
    this.captionDiv.innerHTML = this.caption
    this.captionDiv.className = "omg-thing-title";
    this.topRow.appendChild(this.captionDiv)
    
    //user
    this.userDiv = document.createElement("div");
    this.userDiv.className = "omg-thing-user";
    this.userDiv.innerHTML = this.data.username ? "by " + this.data.username : "";
    this.topRow.appendChild(this.userDiv);    
    
    if (this.data.draft) {
        let draftDiv = document.createElement("span")
        draftDiv.innerHTML = " - DRAFT"
        draftDiv.className = "omg-thing-type";
        this.topRow.appendChild(draftDiv)
    }

    this.rightData = document.createElement("div");
    this.rightData.className = "omg-thing-right-data";
    this.topRow.appendChild(this.rightData);

    //date
    this.datetimeDiv = document.createElement("span");
    this.datetimeDiv.className = "omg-thing-created-at";
    this.datetimeDiv.innerHTML = omg.util.getTimeCaption(
                            parseInt(this.data.last_modified) || parseInt(this.data.created_at));
    this.rightData.appendChild(this.datetimeDiv);    

}

OMGEmbeddedViewer.prototype.makeBottomRow = function () {

    if (this.viewMode === "MICRO" || this.params.noBottomRow) {
        return
    }

    var bottomRow = document.createElement("div")
    bottomRow.className = "omg-viewer-bottom-row"

    if (typeof this.params.tipJar !== "boolean" || this.params.tipJar) {
        this.tipButton = document.createElement("div");
        this.tipButton.className = "omg-music-controls-button";
        this.tipButton.innerHTML = "<img class='omg-viewer-comment-icon' src='/img/tip16.png'>";
        this.tipButton.onclick = () => {
            this.showTipJar()
        };
        bottomRow.appendChild(this.tipButton)
    }

    var commentCaption = ""
    this.commentButton = document.createElement("div");
    this.commentButton.className = "omg-music-controls-button";
    if (this.metaData && this.metaData.commentcount > 0) {
        commentCaption += " (" + this.metaData.commentcount + ")"
    }
    this.commentButton.innerHTML = "<img class='omg-viewer-comment-icon' src='/img/comment.png'>" + commentCaption;
    this.commentButton.onclick = () => {
        this.showComments()
    };
    bottomRow.appendChild(this.commentButton)

    if (this.data.id || this.data.url) {
        this.shareButton = document.createElement("a");
        this.shareButton.className = "omg-music-controls-button";
        this.shareButton.innerHTML = "<img class='' src='/img/link.png'>";
        this.shareButton.href = this.data.url ||
                (this.viewerURL ? 
                    this.viewerURL + "?id=" + this.data.id :
                    "/view/" + this.data.id)
        bottomRow.appendChild(this.shareButton)
    }

    if (this.data.id && this.editorURL) {
        this.editButton = document.createElement("a");
        this.editButton.className = "omg-music-controls-button";
        this.editButton.innerHTML = "<img class='omg-viewer-comment-icon' src='/img/edit16.png'>";
        this.editButton.href = this.editorURL + "?id=" + this.data.id;
        bottomRow.appendChild(this.editButton)
    }

    if (this.data.id && this.type && this.type.usedBy && this.type.usedBy.length) {
        this.editButton = document.createElement("a");
        this.editButton.className = "omg-music-controls-button";
        this.editButton.innerHTML = "Use";
        //todo using the first one, should give options
        this.editButton.href = this.type.usedBy[0].url + "?use=" + this.data.id;
        bottomRow.appendChild(this.editButton)
    }

    if (this.params.deleteButton) {
        var resultData = document.createElement("span");
        resultData.className = "omg-music-controls-button";
        resultData.innerHTML = "Delete &times;";
        resultData.onclick = () => {
            omg.server.deleteId(this.data.id, () => {
                this.parentDiv.parentElement.removeChild(this.parentDiv)
            });
        }
        resultData.style.float = "right"
        bottomRow.appendChild(resultData);
    }

    this.bottomRow = bottomRow

    if (this.metaData) {
        this.makeMetaData()
    }

    this.div.appendChild(bottomRow)
}

OMGEmbeddedViewer.prototype.makeMetaData = function () {
    var dataDiv
    var bottomRow = this.bottomRow
    
    dataDiv = document.createElement("span");
    dataDiv.className = "omg-thing-vote";
    dataDiv.style.border = "none"
    dataDiv.innerHTML = this.metaData.playcount + " &#9656;";
    bottomRow.appendChild(dataDiv);        

    dataDiv = document.createElement("span");
    dataDiv.className = "omg-thing-vote";
    dataDiv.innerHTML = this.metaData.downvotes + " &#9662;";
    dataDiv.onclick = async e => {
        var ok = await omg.ui.loginRequired()
        
        if (ok) {
            omg.server.postHTTP("vote/", {id_thing: this.data.id, vote: -1}, () => {
                e.target.innerHTML = this.metaData.downvotes * 1 + 1 + " &#9662;"
            })
        }
    }
    bottomRow.appendChild(dataDiv);        

    dataDiv = document.createElement("span");
    dataDiv.className = "omg-thing-vote";
    dataDiv.innerHTML = this.metaData.upvotes + " &#9652;";
    dataDiv.onclick = async e => {
        var ok = await omg.ui.loginRequired()
        
        if (ok) {
            omg.server.postHTTP("/vote/", {id_thing: this.data.id, vote: 1}, () => {
                e.target.innerHTML = this.metaData.upvotes * 1 + 1 + " &#9652;"
            })
        }
    }
    bottomRow.appendChild(dataDiv);        
}

OMGEmbeddedViewer.prototype.showTipJar = function () {

    if (this.tipJar) {
        omg.ui.showDialog(this.tipJar)
        return;
    }
    
    if (typeof QRious === "undefined") {
        var scriptTag = document.createElement("script");
        scriptTag.onload = () => this.makeTipJar();
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

    if (!this.commentSection) {
        this.commentSection = new OMGComments(this.data.id)
        this.commentSectionDiv = this.commentSection.div
        this.parentDiv.appendChild(this.commentSectionDiv)
    }
    else {
        this.commentSection.commentList.innerHTML = ""
    }

    this.commentSectionDiv.style.display = "block"
    omg.server.getComments(this.data.id, results => {
        results.forEach(comment => {
            this.commentSection.makeCommentDiv(comment)
        })
    })
    this.isCommentsShowing = true
}

OMGEmbeddedViewer.prototype.loadScriptsForType = (scripts, type, callback) => {
    console.log("deprecaed loadscripts for types", scripts, type)
    omg.util.loadScripts(scripts, callback)
}
