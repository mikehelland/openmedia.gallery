"use strict";

if (typeof omg === "undefined") {
    omg = {};
    console.log("No OMG Obejcts for embedded_viewer.js, not good!");
}

function OMGEmbeddedViewer(params) {
    this.playChar = "&nbsp;&#9654;"
    this.stopChar = "&#9724;"

    this.params = params

    //  if we're coming from a search result
    if (params.result) {
        params.data = params.result.body
        params.data.id = params.result.id
    }

    this.data = params.data

    //todo figure out its type, and a viewer.js

    this.predraw = params.predraw;
    
    if (!params.canvas && params.div) {
        this.setupControls(params);
    }
    else {
        this.canvas = params.canvas;
    }
    
};

OMGEmbeddedViewer.prototype.setupControls = function (params) {
    
    var div = params.div;
    var data = params.data;
    
    if (!data.type) {
        //don't know what to do with this data
        return;
    }

    if (data.type === "ROOM") {
        var room = true
    }
    
    var viewer = this;
    viewer.div = div;
    div.style.position = "relative";
    //div.style.overflowX = "scroll";

    viewer.padding = 0;

    viewer.playButton = document.createElement("div");
    viewer.editButton = document.createElement("a");
    viewer.shareButton = document.createElement("a");
    viewer.tipButton = document.createElement("div");
    viewer.voteButton = document.createElement("div");
    viewer.titleDiv = document.createElement("div");
    viewer.userDiv = document.createElement("div");
    viewer.datetimeDiv = document.createElement("div");

    viewer.playButton.innerHTML = "&nbsp;&#9654";
    viewer.editButton.innerHTML = "Remix";
    viewer.shareButton.innerHTML = "Link";
    viewer.tipButton.innerHTML = "Tip";
    viewer.voteButton.innerHTML = "&#x2B06";
    viewer.voteButton.title = "Upvote";

    viewer.playButton.className = "omg-music-controls-play-button";
    viewer.editButton.className = "omg-music-controls-button";
    viewer.shareButton.className = "omg-music-controls-button";
    viewer.tipButton.className = "omg-music-controls-button";
    viewer.voteButton.className = "omg-music-controls-button";

    viewer.div.appendChild(viewer.playButton);

    var result = data;
    var resultDiv = viewer.div;
    var resultCaption = result.name || result.tags || "";
    if (room) {
        resultCaption = params.data.name
    }
    var type = result.partType || result.type || "";
    if (resultCaption.length === 0) {
        resultCaption = "(" + type.substring(0, 1).toUpperCase() +
                type.substring(1).toLowerCase() + ")";
    }
    viewer.caption = resultCaption;

    var resultData = document.createElement("div");
    resultData.className = "omg-thing-title";
    resultData.innerHTML = resultCaption;
    resultDiv.appendChild(resultData);

    if (!room) {
        resultData = document.createElement("div");
        resultData.className = "omg-thing-user";
        resultData.innerHTML = result.username ? "by " + result.username : "";
        viewer.caption += " " + resultData.innerHTML
        resultDiv.appendChild(resultData);    
    }

    var rightData = document.createElement("div");
    rightData.className = "omg-thing-right-data";
    resultDiv.appendChild(rightData);

    //rightData.appendChild(viewer.voteButton);

    resultData = document.createElement("span");
    resultData.className = "omg-thing-votes";
    resultData.innerHTML = (result.votes || "0") + " votes";
    //rightData.appendChild(resultData);
    
    resultData = document.createElement("span");
    resultData.className = "omg-thing-created-at";
    //resultData.innerHTML = getTimeCaption(parseInt(result.created_at));
    resultData.innerHTML = omg.util.getTimeCaption(parseInt(result.last_modified));
    rightData.appendChild(resultData);    

    viewer.partMargin = 20;
    viewer.sectionMargin = 0;
    viewer.sectionWidth = 200;
    viewer.leftOffset = viewer.sectionMargin;

    viewer.beatMarker = document.createElement("div");
    viewer.beatMarker.className = "beat-marker";
    viewer.beatMarker.style.display = "none";
    viewer.beatMarker.style.marginLeft = viewer.padding / 2 + "px";
    viewer.div.appendChild(viewer.beatMarker);
        
    viewer.playButton.onclick = function () {
        viewer.playButtonClass = viewer.playButton.className;
        
        if (type === "SOUNDSET") {
            viewer.playSoundSet()
            return
        }

        if (typeof params.onplaybuttonclick === "function") {
            params.onplaybuttonclick(viewer);
            if (!viewer.playButton.hasBeenClicked && !room) {
                viewer.playButton.hasBeenClicked = true;                
                omg.server.postHTTP("/playcount", {id: data.id});
            }
            return
        }

        var pbClass = viewer.playButton.className;
        viewer.player.onStop = function () {
            viewer.playButton.className = pbClass;
            viewer.playButton.innerHTML = "&nbsp;&#9654;";
            viewer.beatMarker.style.display = "none";
            viewer.subbeatsPlayed = 0;
            if (typeof params.onStop === "function") {
                params.onStop();
            }
        };
        viewer.player.onPlay = function (info) {
            viewer.beatMarker.style.display = "block";
            viewer.playButton.className = pbClass;
            viewer.playButton.innerHTML = "&#9724;";
            if (typeof params.onPlay === "function") {
                params.onPlay(viewer.player, info);
            }
        };

        if (viewer.player.playing) {
            viewer.player.stop();
        } else {
            viewer.playButton.className = pbClass + " loader";
            viewer.player.onloop = () => viewer.onloop();

            if (viewer.prepared) {
                viewer.player.play();
            }
            else {                
                viewer.player.prepareSong(viewer.song, function () {
                    viewer.prepared = true;
                    viewer.player.play();
                });
            }
            
            if (!viewer.playButton.hasBeenClicked && !room) {
                viewer.playButton.hasBeenClicked = true;                
                omg.server.postHTTP("/playcount", {id: data.id}, result=>console.log(result));
            }
        }
    };
    
    viewer.titleDiv.innerHTML = data.title || "(untitled)";
    viewer.userDiv.innerHTML = data.username || "(unknown)";
    viewer.datetimeDiv.innerHTML = omg.util.getTimeCaption(data.created_at);

    var url = 'bitcoin:' + (data.btc_address || '37WEyjvqgY6mEZDMiSTN11YWy5BYP8rP6e') + '?amount=0.00100000&label=OMG%20Tip%20Jar';
    var makeTipJar = function () {
        viewer.tipJar = document.createElement("div");
        viewer.tipJar.className = "tip-jar";

        viewer.qrCanvas = document.createElement("canvas");
        var canvasDiv = document.createElement("div");
        canvasDiv.className = "tip-jar-canvas";

        viewer.tipJarLink = document.createElement("div");
        viewer.tipJarLink.innerHTML = "<a href='" + url + "'>" + url + "</a>";

        viewer.qr = new QRious({
            element: viewer.qrCanvas,
            value: url
        });
        
        canvasDiv.appendChild(viewer.qrCanvas);
        viewer.tipJar.appendChild(canvasDiv)
        viewer.tipJar.appendChild(viewer.tipJarLink)

        viewer.qr.element.onclick = function () {
            window.location = url;
        };
        omg.ui.showDialog(viewer.tipJar)
    };

    viewer.tipButton.onclick = function () {
        
        if (viewer.tipJar) {
            omg.ui.showDialog(viewer.tipJar)
            return;
        }
        
        if (typeof QRious === "undefined") {
            var scriptTag = document.createElement("script");
            scriptTag.onload = makeTipJar;
            scriptTag.src = "https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js";
            scriptTag.async = true;
            document.body.appendChild(scriptTag);
        }
        else {
            makeTipJar();
        }
        
    };

    //todo edit the soundset if its the current users
    //if (data.type === "SOUNDSET") {
    //    viewer.editButton.href = "/soundset-editor.htm?id=" + data.id;
    //    viewer.shareButton.href = "/soundset.htm?id=" + data.id;    
    //}
    if (data.type === "PLAYLIST") {
        viewer.editButton.href = "/playlist.htm?id=" + data.id;
        viewer.shareButton.href = "/play/" + data.id;
    }
    else if (room) {
        viewer.shareButton.href = "/create/?join=" + params.data.name;
    }
    else {
        viewer.editButton.href = "/create/?id=" + data.id;
        viewer.shareButton.href = "/play/" + data.id;    
    }

    var br = document.createElement("br");
    viewer.div.appendChild(br);
    
    var height = params.height || 150;

    if (data.type === "SOUNDSET" || data.type === "PLAYLIST") {
        viewer.flexBox = document.createElement("div")
        viewer.flexBox.className = "omg-viewer-" + data.type.toLowerCase() + "-data"
        viewer.div.appendChild(viewer.flexBox)

    }
    else {
        viewer.canvas = document.createElement("canvas");
        viewer.canvas.className = "omg-viewer-canvas";
        viewer.div.appendChild(viewer.canvas);
        viewer.canvas.width = viewer.canvas.clientWidth;
        viewer.canvas.height = height; //viewer.canvas.clientHeight;    
        viewer.beatMarker.style.height = height + "px";
        viewer.beatMarker.style.marginTop = viewer.canvas.offsetTop + "px";
    }

    var className = "omg-viewer-" + data.type.toLowerCase();
    this.div.classList.add("omg-viewer");
    this.div.classList.add(className);
    
    if (this.song) {
        this.song.loop = this.song.arrangement.length === 0;
    }

    var bottomRow = document.createElement("div")
    if (data.id) {
        bottomRow.appendChild(viewer.editButton);
    }
    bottomRow.appendChild(viewer.tipButton);
    bottomRow.appendChild(viewer.shareButton);

    if (!room && (data.type === "SONG" || data.type === "PART" || data.type === "SECTION")) {
        resultData = document.createElement("span");
        resultData.className = "omg-music-controls-button";
        resultData.innerHTML = "Add To Playlist";
        resultData.onclick = function () {
            omg.util.addToPlaylist(result)
        }    
        bottomRow.appendChild(resultData);    
    }

    if (params.deleteButton) {
        resultData = document.createElement("span");
        resultData.className = "omg-music-controls-button";
        resultData.innerHTML = "Delete &times;";
        resultData.onclick = () => {
            omg.server.deleteId(result.id, function () {
                viewer.div.parentElement.removeChild(viewer.div)
            });
        }
        resultData.style.float = "right"
        bottomRow.appendChild(resultData);
    }

    if (params.result && params.result.playcount) {
        resultData = document.createElement("span");
        resultData.className = "omg-thing-playcount";
        resultData.innerHTML = params.result.playcount + " &#9658;";
        bottomRow.appendChild(resultData);        
    }
    if (room) {
        resultData = document.createElement("span");
        resultData.className = "omg-thing-playcount";
        resultData.innerHTML = Object.keys(params.data.users).length + " &#9658;";
        bottomRow.appendChild(resultData);        
    }

    viewer.div.appendChild(bottomRow)
};


OMGEmbeddedViewer.prototype.showLoading = function () {
    this.playButton.className = this.playButtonClass + " loader";
}
OMGEmbeddedViewer.prototype.showPlaying = function () {
    this.playButton.className = this.playButtonClass;
    this.isPlaying = true
    this.playButton.innerHTML = this.stopChar;
    this.beatMarker.style.display = "block"
    this.subbeatsPlayed = 0;
    this.beatMarker.style.left = "0px"
}
OMGEmbeddedViewer.prototype.showStopped = function () {
    this.playButton.className = this.playButtonClass;
    this.isPlaying = false
    this.playButton.innerHTML = this.playChar;
    this.beatMarker.style.display = "none"
    this.playingSample = undefined
}
OMGEmbeddedViewer.prototype.onloop = function () {
    this.subbeatsPlayed = 0
}