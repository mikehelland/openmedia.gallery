function OMGMapEditor (canvas) {
    this.canvas = canvas
    this.context = canvas.getContext("2d")
    this.tileSize = 16
    this.img = {
        characters: document.getElementById("characters-spritesheet"),
        tiles: {}
    }
    this.setupEvents(canvas)
    this.setupControls()

}

OMGMapEditor.prototype.loadTileSet = function (tileSet) {
    this.tileListDiv = document.getElementById("tile-list")

    Object.keys(tileSet.tileCodes).forEach(key => {
        var img = document.createElement("img")
        img.src = (tileSet.prefix + "") + tileSet.tileCodes[key] + (tileSet.postfix || "")
        this.img.tiles[key] = img
        if (this.tileListDiv) {
            this.tileListDiv.appendChild(img)
            img.onclick = () => {
                if (this.selectedTile) {
                    this.img.tiles[this.selectedTile].className = ""
                }
                this.selectedTile = key
                img.className = "selected"
            }    
        }
    })
}

OMGMapEditor.prototype.load = function (map) {
    this.map = map
    this.width = map.width 
    this.height = map.height
    this.mapLines = map.mapLines

    for (var i = 0; i < this.mapLines.length; i++) {
        if (this.mapLines[i].length < this.width) {
            this.mapLines[i] = this.mapLines[i].padEnd(this.width, " ")
        }
    }
    for (i = this.mapLines.length; i < this.height; i++) {
        this.mapLines.push("".padEnd(this.width, " "))
    }

    this.loadTileSet(map.tileSet)
}

OMGMapEditor.prototype.loadRaw = function (map) {
    this.mapLines = map.split("\n")
    this.width = this.mapLines[0].length
    this.height = this.mapLines.length
    
    this.map = {
        name: "",
        width: this.width,
        height: this.height,
        startX: 0,
        startY: 0,
        npcs: [],
        mapLines: this.mapLines
    }
}

OMGMapEditor.prototype.draw = function () {
    this.canvas.width = this.width * this.tileSize
    this.canvas.height = this.height * this.tileSize
    this.canvas.style.width = canvas.width + "px"
    this.canvas.style.height = canvas.height + "px"

    for (var y = 0; y < this.mapLines.length; y++) { 
        for (var x = 0; x < this.mapLines[y].length; x++) {
            if (this.mapLines[y][x] && this.img.tiles[this.mapLines[y][x]]) {
                this.context.drawImage(this.img.tiles[this.mapLines[y][x]],
                    x * this.tileSize, 
                    y * this.tileSize,
                    this.tileSize, this.tileSize)
            }
        }    
    }
}

OMGMapEditor.prototype.setupEvents = function (canvas) {
    canvas.onmousedown = (e) => {
        this.tileEvent(e)
        this.isTouching = true
    }
    canvas.onmousemove = (e) => {
        if (this.isTouching) {
            this.tileEvent(e)
        }
    }
    canvas.onmouseup = () => {
        this.isTouching = false
    }
}

OMGMapEditor.prototype.tileEvent = function (e) {
    var x = Math.floor(e.layerX / this.tileSize)
    var y = Math.floor(e.layerY / this.tileSize)
    
    if (this.selectedTile && this.mapLines[y] && this.mapLines[y][x]) {
        this.mapLines[y] = this.mapLines[y].slice(0, x) + this.selectedTile + this.mapLines[y].slice(x + 1)
        //this.draw()
        this.context.drawImage(this.img.tiles[this.mapLines[y][x]],
            x * this.tileSize, 
            y * this.tileSize,
            this.tileSize, this.tileSize)
    }
}

OMGMapEditor.prototype.setupControls = function () {
    document.getElementById("save-button").onclick = () => {
        this.map.name = document.getElementById("map-name").value
        this.map.type = "MAP"
        this.map.omgVersion = 1

        omg.server.post(this.map, res => {
            window.location = "viewer.htm?id=" + res.id
        })
    }
}