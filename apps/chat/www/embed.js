function OMGEmbeddedViewerROOM(viewer) {
    var data = viewer.data
    var parentDiv = viewer.embedDiv

    this.div = document.createElement("div")
    this.div.className = "omg-thing-p"

    console.log(data)
    this.div.innerHTML = `<br>
        Room Type: ${data.thing ? data.thing.type : "UNKNOWN"}
        <br>
        Created By: ${data.username}
        <br>
        Users: ${Object.keys(data.users).length}
        <br>
        URL: <a href='${data.url}' target='_blank'>${data.url}</a>
        <br><br>`
    parentDiv.appendChild(this.div)

}

if (typeof omg === "object" && omg.types && omg.types["ROOM"])
    omg.types["ROOM"].embedClass = OMGEmbeddedViewerROOM