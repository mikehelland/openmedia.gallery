function OMGMapEditor (canvas) {
    this.canvas = canvas
    this.context = canvas.getContext("2d")
    this.tileSize = 16

    this.frontCanvas = document.createElement("canvas")
    this.frontContext = this.frontCanvas.getContext("2d")
    this.frontCanvas.style.position = "absolute"
    this.frontCanvas.style.left = canvas.offsetLeft + "px"
    this.frontCanvas.style.top = canvas.offsetTop + "px"
    this.frontCanvas.style.width = canvas.clientWidth + "px"
    this.frontCanvas.style.height = canvas.clientHeight + "px"
    this.frontCanvas.style.pointerEvents = "none"

    this.img = {
        characters: document.getElementById("characters-spritesheet"),
        tiles: {}
    }
    this.setupEvents(canvas)
    this.setupControls()

}

OMGMapEditor.prototype.loadTileSet = function (tileSet) {
    
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
    this.mapLines = map.mapLines
    this.nameInput.value = map.name
    this.widthInput.value = map.width
    this.heightInput.value = map.height

    this.loadTileSet(map.tileSet)

    this.resizeMap()
}


OMGMapEditor.prototype.draw = function () {
    this.canvas.width = this.map.width * this.tileSize
    this.canvas.height = this.map.height * this.tileSize
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
        if (this.mode === "TILE") {
            this.tileEvent(e)
        }
        this.isTouching = true    
    }
    canvas.onmousemove = (e) => {
        if (this.mode === "TILE") {
            if (this.isTouching) {
                this.tileEvent(e)
            }    
        }
        else if (this.mode === "NPC_PLACE") {
            this.highlightTile(e)
        }
    }
    canvas.onmouseup = (e) => {
        console.log("mouseup")
        if (this.mode === "NPC_PLACE") {
            this.addNPC(e)
        }
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
    this.nameInput = document.getElementById("map-name")
    this.widthInput = document.getElementById("map-width-input")
    this.heightInput = document.getElementById("map-height-input")
    this.widthInput.onkeydown = e => this.sizeInputKeyPress(e)
    this.heightInput.onkeydown = e => this.sizeInputKeyPress(e)
    this.toolBoxSelect = document.getElementById("tool-box-select")
    this.toolBoxSelect.onchange = e => this.selectToolBox(e)
    this.tileListDiv = document.getElementById("tile-list")
    this.characterListDiv = document.getElementById("character-list")
    
    document.getElementById("save-button").onclick = () => this.save()

    document.getElementById("new-copy-button").onclick = e => {
        delete this.map.id
        omg.server.post(this.map, res => {
            window.location = "viewer.htm?id=" + res.id
        })
    }
    document.getElementById("overwrite-button").onclick = e => {
        omg.server.post(this.map, res => {
            window.location = "viewer.htm?id=" + res.id
        })
    }
    omg.server.getHTTP("/user", user => this.user = user)
    
    this.setupNPCControls()
}

OMGMapEditor.prototype.sizeMap = function () {
    for (var i = 0; i < this.mapLines.length; i++) {
        if (this.mapLines[i].length < this.map.width) {
            this.mapLines[i] = this.mapLines[i].padEnd(this.map.width, " ")
        }
    }
    for (i = this.mapLines.length; i < this.map.height; i++) {
        this.mapLines.push("".padEnd(this.map.width, " "))
    }
}

OMGMapEditor.prototype.resizeMap = function () {
    this.map.width = this.widthInput.value
    this.map.height = this.heightInput.value
    this.sizeMap()
    this.draw()
}

OMGMapEditor.prototype.sizeInputKeyPress = function (e) {
    if (e.key === "Enter") {
        this.resizeMap()
    }
    else if (e.key === "ArrowUp") {
        e.target.value = e.target.value * 1 + 1
        this.resizeMap()
    }
    else if (e.key === "ArrowDown") {
        e.target.value = e.target.value * 1 - 1
        this.resizeMap()
    }
}

OMGMapEditor.prototype.save = function () {
    this.map.name = this.nameInput.value
    this.map.type = "MAP"
    this.map.omgVersion = 1

    if (this.map.id) {
        if (this.user && this.map.user_id === this.user.id) {
            omg.ui.showDialog(document.getElementById("overwrite-or-new"))
            return
        }
        else {
            delete this.map.id
        }
    }

    omg.server.post(this.map, res => {
        window.location = "viewer.htm?id=" + res.id
    })
}

OMGMapEditor.prototype.selectToolBox = function (e) {
    if (e.target.value === "Tiles") {
        this.tileListDiv.style.display = "block"
        this.characterListDiv.style.display = "none"
        this.mode = "TILE"
    }
    else if (e.target.value === "NPCs") {
        this.tileListDiv.style.display = "none"
        this.characterListDiv.style.display = "block"
        this.mode = "NPC_SELECT"
    }
    
    
}

OMGMapEditor.prototype.setupNPCControls = function () {
    this.tileHighlightDiv = document.getElementById("tile-highlight")
    this.addNPCButton = document.getElementById("add-npc-button")
    this.addNPCButton.onclick = e => {
        e.target.innerHTML = "Place..."
        this.mode = "NPC_PLACE"
    }
    this.npcDetailsDiv = document.getElementById("npc-details")
    this.npcDetailsName = document.getElementById("npc-details-name")
}

OMGMapEditor.prototype.highlightTile = function (e) {
    this.tileHighlightDiv.style.display = "block"
    this.tileHighlightDiv.style.width = this.tileSize + "px"
    this.tileHighlightDiv.style.height = this.tileSize + "px"
    this.tileHighlightDiv.style.left = Math.floor(e.clientX / this.tileSize) * this.tileSize + "px"
    this.tileHighlightDiv.style.top = Math.floor(e.clientY / this.tileSize) * this.tileSize + "px"
}

OMGMapEditor.prototype.addNPC = function (e) {
    var x = Math.floor(e.clientX / this.tileSize)
    var y = Math.floor(e.clientY / this.tileSize)

    var npc = {
        "name": "name me",
        "x": x,
        "y": y,
        "characterI": 15,
        "dialog": [
          "Hi!"
        ]
    }

    this.setupNPCToolBoxDiv(npc)
    
    this.map.npcs.push(npc)
    this.showNPCDetails(npc)
    
    this.mode = "NPC_SELECT"
    this.tileHighlightDiv.style.display = "none"
    this.addNPCButton.innerHTML = "+Add"

    this.drawNPCs()
}

OMGMapEditor.prototype.showNPCDetails = function (npc) {
    this.npcDetailsDiv.style.display = "block"
    this.npcDetailsName.value = npc.name
    this.npcDetailsName.onkeypress = e => {
        if (e.key === "Enter") {
            npc.name = this.npcDetailsName.value
        }
    }
}

OMGMapEditor.prototype.setupNPCToolBoxDiv = function (npc) {
    var npcDiv = document.createElement("div")
    npcDiv.className = "npc-tool-item"
    var npcImg = document.createElement("img")
    var npcName = document.createElement("div")
    npcName.innerHTML = npc.name
    npcDiv.appendChild(npcImg)
    npcDiv.appendChild(npcName)
    npcDiv.onclick = e => {
        this.showNPCDetails(npc)
    }
    this.characterListDiv.appendChild(npcDiv)

}

OMGMapEditor.prototype.drawNPCs = function () {
    this.frontContext.fillStyle = "black"
    for (this._loop_drawNPCs_i = 0;  this._loop_drawNPCs_i < this.map.npcs.length; this._loop_drawNPCs_i++) {
        this.frontContext.fillText("X", 
        this.map.npcs[this._loop_drawNPCs_i].x * this.tileSize,
        this.map.npcs[this._loop_drawNPCs_i].y * this.tileSize,
        this.tileSize * this.tileSize)
    }

}