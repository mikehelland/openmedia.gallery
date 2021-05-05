export default function OMGWindowManager(config) {

    this.div = config.div
    this.div.className = "omgwm-desktop"
    this.windows = []

    this.windowPadding = 0
    this.nextZ = 1

    this.offsetTop = 0
}

OMGWindowManager.prototype.newWindow = function (options) {

    var win = {
        div: document.createElement("div"),
        moveDiv: document.createElement("div"),
        resizeDiv: document.createElement("div"),
        closeDiv: document.createElement("div"),
        contentDiv: options.div || document.createElement("div"),
        width: options.width || 120,
        height: options.height || 80,
        x: typeof options.x === "number" ? options.x : (this.windows.length * 20),
        y: typeof options.y === "number" ? options.y : (this.windows.length * 20),
        hidden: options.hidden,
        closeable: typeof options.closeable === "boolean" ? options.closeable : true,
        moveable: typeof options.moveable === "boolean" ? options.moveable : true,
        resizeable: typeof options.resizeable === "boolean" ? options.resizeable : true,
    }

    win.contentDiv.className = "omgwm-content"
    win.moveDiv.className = "omgwm-control-move"
    win.resizeDiv.className = "omgwm-control omgwm-control-resize"
    win.closeDiv.className = "omgwm-control omgwm-control-close"
    win.moveDiv.innerHTML = options.caption || "&nbsp;"
    win.resizeDiv.innerHTML = "&nbsp;"
    win.closeDiv.innerHTML = "&nbsp;"

    if (win.moveable) {
        win.div.insertBefore(win.moveDiv, win.div.children[0])
    }
    if (win.resizeable) {
        win.div.appendChild(win.resizeDiv)
    }
    if (win.closeable) {
        win.div.appendChild(win.closeDiv)
    }

    // this might be called with a hidden div already on the page
    if (options.div && options.div.parentElement) {
        options.div.parentElement.removeChild(options.div)
    }
    win.div.appendChild(win.contentDiv)
    
    win.div.className = "omgwm-window"
    win.div.style.padding = this.windowPadding + "px"
    win.div.style.width = this.windowPadding * 2 + win.width + "px"
    win.div.style.height = this.windowPadding * 2 + win.height + "px"
    win.div.style.left = win.x + "px"
    win.div.style.top = this.offsetTop + win.y + "px"
    
    if (options.overflowX) {
        win.contentDiv.style.overflowX = options.overflowX
    }
    if (options.overflowY) {
        win.contentDiv.style.overflowY = options.overflowY
    }
    
    this.makeDraggable(win.moveDiv, win, "MOVE")
    this.makeDraggable(win.resizeDiv, win, "RESIZE")
    win.closeDiv.onclick = e => {
        this.close(win)
    }
    win.close = e => {
        this.close(win)
    }

    if (!win.hidden) {
        this.div.appendChild(win.div)
        this.windows.push(win)
        this.show(win)
    }
    return win
}

OMGWindowManager.prototype.move = function (win, x, y) {
    win.div.style.left = x + "px"
    win.div.style.top = this.offsetTop + y + "px"
    win.x = x
    win.y = y

    if (win.onmove) {
        win.onmove()
    }
}


OMGWindowManager.prototype.resize = function (win, w, h) {
    win.div.style.width = w + this.windowPadding * 2 + "px"
    win.div.style.height = h + this.windowPadding * 2 + "px"
    win.width = w
    win.height = h

    if (win.onresize) {
        win.onresize()
    }
}

OMGWindowManager.prototype.close = function (win) {
    win.hidden = true
    var i = this.windows.indexOf(win)
    if (i > -1) {
        this.windows.splice(i, 1)
    }
    this.div.removeChild(win.div)
}

OMGWindowManager.prototype.makeDraggable = function (control, win, mode) {

    //??
    //div.style.pointerEvents = "initial"


    control.onmousedown = e => {
        e.preventDefault()
        this.dndStart(control, win, e.pageX, e.pageY, mode)

        this.show(win)        
    }

    control.onmouseup = e => {
        e.preventDefault()
        this.dndEnd(win, e.pageX, e.pageY)
    }

    control.addEventListener("touchstart", e => {
        e.preventDefault()
        dndContext.ondown(e.targetTouches[0].pageX, e.targetTouches[0].pageY, div, songInfo, sourceSet)

    })
}

OMGWindowManager.prototype.dndStart = function (control, win, x, y, mode) {

    if (mode === "MOVE") {
        this.dndOffsets = {left: x - win.x, top: y - win.y} 
    }
    else if (mode === "RESIZE") {
        this.dndOffsets = {left: x - (win.x + win.width), top: y - (win.y + win.height)} 
    }
    
    this.div.onmousemove = e => {
        if (mode === "MOVE") {
            this.move(win, e.pageX - this.dndOffsets.left, e.pageY - this.dndOffsets.top)
        }
        else if (mode === "RESIZE") {
            this.resize(win, e.pageX - this.dndOffsets.left - win.x, 
                            e.pageY - this.dndOffsets.top - win.y)
        }
    }
    this.div.addEventListener("touchmove", e => {
        dndContext.onmove(e.targetTouches[0].pageX, e.targetTouches[0].pageY)
    })
    
}


OMGWindowManager.prototype.dndEnd = function (win, x, y, onupdate) {

    this.div.onmousemove = undefined
    this.div.addEventListener("touchmove", e => {
        dndContext.onmove(e.targetTouches[0].pageX, e.targetTouches[0].pageY)
    })
    
}

OMGWindowManager.prototype.show = function (win) {
    if (win.hidden) {
        this.div.appendChild(win.div)
        this.windows.push(win)
    }

    win.div.style.zIndex = this.nextZ
    this.nextZ += 1
    
    if (win.onshow) {
        win.onshow()
    }
}

OMGWindowManager.prototype.showFragment = function (fragment, winOptions) {

    if (!fragment.window) {
        fragment.window = this.newWindow(winOptions)
    }
    fragment.div.classList.add("omgwm-fragment")
    fragment.window.contentDiv.appendChild(fragment.div)
    if (fragment.onshow) {
        fragment.window.onshow = () => {fragment.onshow()}
    }

    if (!winOptions.hidden) {
        this.show(fragment.window)
    }
    return fragment.window
}

OMGWindowManager.prototype.showMainMenu = function (menu) {

    this.mainMenuDiv = document.createElement("div")
    this.mainMenuDiv.className = "omgwm-main-menu"
 
    menu.items.forEach(menuItem => {
        var menuItemDiv = document.createElement("div")
        menuItemDiv.className = "omgwm-main-menu-item"
        menuItemDiv.innerHTML = menuItem.name
        this.mainMenuDiv.appendChild(menuItemDiv)
        menuItem.div = menuItemDiv

        menuItemDiv.onclick = e => {
            this.showSubMenu(menuItem)
        }
    })

    this.div.appendChild(this.mainMenuDiv)
    this.offsetTop = this.mainMenuDiv.clientHeight + 2
}

OMGWindowManager.prototype.showSubMenu = function (menu) {
    if (this.menuShowing) {
        this.menuShowing.menuDiv.style.display = "none"
        if (this.menuShowing === menu) {
            this.menuShowing = null
            return
        }
    }
    this.menuShowing = menu
    var offsets = this.getTotalOffsets(menu.div)
    if (!menu.menuDiv) {
        menu.menuDiv = document.createElement("div")
        menu.menuDiv.className = "omgwm-menu"

        var top = offsets.top
        var left = offsets.left
        if (menu.toTheRight) {
            left += menu.div.clientWidth
        }
        else {
            top += menu.div.clientHeight
        }
        menu.menuDiv.style.left = left + "px"
        menu.menuDiv.style.top = top + "px"

        menu.items.forEach(menuItem => {
            if (menuItem.separator) {
                menu.menuDiv.appendChild(document.createElement("hr"))
                return
            }
            var menuItemDiv = document.createElement("div")
            menuItemDiv.className = "omgwm-menu-item"
            menuItemDiv.innerHTML = menuItem.name
            menu.menuDiv.appendChild(menuItemDiv)
            menuItem.div = menuItemDiv
    
            menuItem.div.onclick = e => {
                menu.menuDiv.style.display = "none"
                this.menuShowing = null
                if (menuItem.onclick) {
                    menuItem.onclick()
                }
            }
        })

        this.div.appendChild(menu.menuDiv)
    }
    menu.menuDiv.style.zIndex = this.nextZ++
    this.menuShowing.menuDiv.style.display = "block"
}

OMGWindowManager.prototype.clearAll = function () {

    for (var i = this.windows.length - 1; i >= 0; i--) {
        this.close(this.windows[i])
    }
}

OMGWindowManager.prototype.getTotalOffsets = function (element, parent) {
    
    var top = 0, left = 0;
    do {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;

        top -= element.scrollTop || 0
        left -= element.scrollLeft || 0
        element = element.offsetParent;
        if (parent && parent === element) {
            break;
        }

    } while (element);

    return {
        top: top - document.documentElement.scrollTop,
        left: left - document.documentElement.scrollLeft
    };
}