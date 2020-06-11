function OMGEmbeddedViewerTEXTPOST(viewer) {
    var data = viewer.data
    var parentDiv = viewer.embedDiv
    this.viewMode = viewer.params.viewMode || "full"
    this.div = document.createElement("div")
    this.div.className = "omg-thing-p"
    this.textDiv = document.createElement("div")
    this.div.appendChild(this.textDiv)
    parentDiv.appendChild(this.div)

    var type = omg.types["TEXTPOST"]
    if (typeof showdown !== "undefined") {
        this.markdown(data.text)
    }
    else if (type.onreadyShowdown) {
        type.onreadyShowdown.push(()=>this.markdown(data.text))
    }
    else {
        type.onreadyShowdown = [()=>this.markdown(data.text)]
        script = document.createElement("script")
        script.onload = e => {
            type.onreadyShowdown.forEach(f => {
                try {
                    f()
                } catch (e) {console.log(e)}
            })
            type.onreadyShowdown = []
        }
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/showdown/1.9.1/showdown.min.js"
        document.body.appendChild(script)
    }

    this.makeAttachments(data)
}

OMGEmbeddedViewerTEXTPOST.prototype.markdown = function (input) {
    if (!this.converter) {
        this.converter = new showdown.Converter()
        this.converter.setOption('simplifiedAutoLink', 'value');
        this.converter.setOption('openLinksInNewWindow', true);
    }

    this.textDiv.innerHTML = this.converter.makeHtml(input);
}

OMGEmbeddedViewerTEXTPOST.prototype.makeAttachments = function (data) {
    var otherCount = 0
    if (data.attachments && data.attachments.length > 0) {
        var otherAttachments = document.createElement("div")
        otherAttachments.innerHTML = "Attachments:"
        
        for (var i = 0; i < data.attachments.length; i++) {
            var attachment = data.attachments[i]
            var type = attachment.mimeType.split("/")[0]
            
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
                attachmentDiv = document.createElement("div")
                attachmentDiv.innerHTML = attachment.name
                attachmentDiv.className = "omg-viewer-attachment"
                attachmentDiv.classList.add("omg-thing-p")
                otherAttachments.appendChild(attachmentDiv)
                otherCount++
                other = true
            }

            if (!other) {
                attachmentDiv.src = attachment.url
                attachmentDiv.className = "omg-viewer-attachment-" + type
                this.div.appendChild(attachmentDiv)
            }
        }

        if (otherCount > 0) {
            this.div.appendChild(otherAttachments)
        }
    }
}

if (typeof omg === "object" && omg.types && omg.types["TEXTPOST"])
    omg.types["TEXTPOST"].embedClass = OMGEmbeddedViewerTEXTPOST