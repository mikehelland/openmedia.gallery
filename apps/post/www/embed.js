if (typeof omg === "object" && omg.types) {
    if (omg.types["TEXTPOST"]) {
        omg.types["TEXTPOST"].embedClass = OMGEmbeddedViewerPOST
    }
    if (omg.types["TEXT"]) {
        omg.types["TEXT"].embedClass = OMGEmbeddedViewerPOST
    }
    if (omg.types["IMAGE"]) {
        omg.types["IMAGE"].embedClass = OMGEmbeddedViewerPOST
    }
    if (omg.types["IMAGESET"]) {
        omg.types["IMAGESET"].embedClass = OMGEmbeddedViewerPOST
    }
}

function OMGEmbeddedViewerPOST(viewer) {
    var data = viewer.data
    var parentDiv = viewer.embedDiv
    this.viewMode = viewer.params.viewMode || "full"
    this.div = document.createElement("div")
    this.div.className = "omg-thing-p"
    this.textDiv = document.createElement("div")
    this.div.appendChild(this.textDiv)
    parentDiv.appendChild(this.div)

    viewer.loadScriptsForType(
            ["https://cdnjs.cloudflare.com/ajax/libs/showdown/1.9.1/showdown.min.js"],
            data.type, () => {
                this.markdown(data.text)
            }
    )

    if (data.type.startsWith("TEXT")) {
        this.makeAttachments(data.attachments)
    }
    else if (data.type === "IMAGE") {
        this.makeAttachment(data, "image")
    }
    else if (data.type === "IMAGESET") {
        this.makeAttachments(data.set)
    }
}

OMGEmbeddedViewerPOST.prototype.markdown = function (input) {
    if (!this.converter) {
        this.converter = new showdown.Converter()
        this.converter.setOption('simplifiedAutoLink', 'value');
        this.converter.setOption('openLinksInNewWindow', true);
    }

    this.textDiv.innerHTML = this.converter.makeHtml(input);
}

OMGEmbeddedViewerPOST.prototype.makeAttachments = function (attachments) {
    var otherCount = 0
    if (attachments && attachments.length > 0) {
        var otherAttachments = document.createElement("div")
        otherAttachments.innerHTML = "Attachments:"
        
        for (var i = 0; i < attachments.length; i++) {
            var attachment = attachments[i]
            var type = attachment.mimeType.split("/")[0]

            var res = this.makeAttachment(attachment, type)
            if (res.other) {
                otherAttachments.appendChild(res.div)
                otherCount++
            }
        }

        if (otherCount > 0) {
            this.div.appendChild(otherAttachments)
        }
    }
}

OMGEmbeddedViewerPOST.prototype.makeAttachment = function(attachment, type) {
    var attachmentDiv
    var other = false
    if (type === "image") {
        attachmentDiv = document.createElement("img")
    }
    else if (type === "audio") {
        var link = document.createElement("a")
        link.innerHTML = attachment.name
        this.div.appendChild(link)
        attachmentDiv = document.createElement(type)
        attachmentDiv.controls = true
    }
    else if (type === "video") {
        attachmentDiv = document.createElement(type)
        attachmentDiv.controls = true
    }
    else {
        attachmentDiv = document.createElement("a")
        attachmentDiv.innerHTML = attachment.name
        attachmentDiv.className = "omg-viewer-attachment"
        attachmentDiv.classList.add("omg-thing-p")
        attachmentDiv.target = "_out"
        attachmentDiv.href = attachment.url
        other = true
    }

    if (!other) {
        attachmentDiv.src = attachment.url
        attachmentDiv.className = "omg-viewer-attachment-" + type
        this.div.appendChild(attachmentDiv)
    }

    return {div: attachmentDiv, other: other}
}

    
