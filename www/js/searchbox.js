function OMGSearchBox(params) {
    this.params = params
    this.div = params.div || document.createElement("div")

    omg.getContext().then(context => {
        this.context = context || {}
        this.setupControls()

        if (this.searchWhenReady) {
            this.search()
        }
    })

    this.loadSearchResults = true
}

OMGSearchBox.prototype.search = function () {
    if (!this.context) {
        this.searchWhenReady = true
        return
    }
    let params = {
        type: this.searchType.value, 
        resultList: this.resultList, 
        server: this.searchServer.value, 
        viewerParams: {
            maxHeight:60, 
            viewMode: "MICRO", 
            onclickcontent: e => this.onclickcontent(e)
        }
    }
    omg.search(params, this.loadSearchResults)
}

OMGSearchBox.prototype.setupControls = function () {
    this.resultList = document.createElement("div")
    this.searchServer = document.createElement("select")
    this.searchUser = document.createElement("select")
    this.searchType = document.createElement("select")
    
    var serverString = "<option value='" + window.location.origin + "'>Local</option>"
    
    var showServers
    var context = this.context
    if (context.user && context.user.sources) {
        context.user.sources.forEach(source => {
            serverString += "<option value='" + source.url + "'>" + source.url.replace("https://", "") + "</option>"
        })
        showServers = true
    }
    this.searchServer.innerHTML = serverString + "<option value='ALL'>All Servers</option>"
    this.searchServer.onchange = e => {
        this.search()
    }

    if (showServers) {
        this.div.appendChild(this.searchServer)
    }
    this.div.appendChild(this.searchUser)
    this.div.appendChild(this.searchType)
    this.div.appendChild(this.resultList)
    
    if (this.params.types) {
        this.params.types.forEach(type => {
            var typeOption = document.createElement("option")
            typeOption.innerHTML = type
            this.searchType.appendChild(typeOption)
        })
    }
    else {
        this.searchType.innerHTML = '<option selected="" value="">All Types</option>'
    }

    this.searchType.onchange = () => searchBox.search()

}