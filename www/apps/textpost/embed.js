function OMGEmbeddedViewerTEXTPOST(data, div) {
    this.div = div
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
}

OMGEmbeddedViewerTEXTPOST.prototype.markdown = function (input) {
    if (!this.converter) {
        this.converter = new showdown.Converter()
    }

    this.div.innerHTML = "<div class='omg-thing-p'>" + this.converter.makeHtml(input) + "</div>";
}

if (typeof omg === "object" && omg.types && omg.types["TEXTPOST"])
    omg.types["TEXTPOST"].embedClass = OMGEmbeddedViewerTEXTPOST