/**
 * create these objects:
 *     omg.server -  for server stuff
 *     omg.util   -  for local stuff
 */


if (typeof omg !== "object")
    omg = {};
if (!omg.server)
    omg.server = {};
if (!omg.util)
    omg.util = {};

omg.server.url = "";
omg.server.dev = window.location.href.indexOf("localhost") > 0;

omg.server.http = function (params) {
    var method = params.method || "GET";

    var xhr = new XMLHttpRequest();
    xhr.open(method, params.url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {

            var results;
            try {
                results = JSON.parse(xhr.responseText);
            } catch (exp) {
                console.log(exp);
                console.log("could not parse results of url: " + params.url);
                console.log(xhr.responseText);
            }
            if (params.callback) {
                params.callback(results);    
            }
        }
    };

    if (params.data) {
        if (params.data.constructor.name === "FormData") {
            xhr.send(params.data);
        }
        else {
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.send(JSON.stringify(params.data));
        }
    }
    else {
        xhr.send();
    }
};

omg.server.post = function (data, callback) {
    omg.server.http({method: "POST", 
            url: this.url + "/data/", 
            data: data, callback: callback});
};

omg.server.postHTTP = function (url, data, callback) {
    omg.server.http({method: "POST", 
            url: url, 
            data: data, callback: callback});
};

omg.server.getHTTP = function (url, callback) {
    omg.server.http({url: url, callback: callback});
};

omg.server.getId = function (id, callback, metaData) {
    var url = this.url + "/data/" + id
    if (metaData) {
        url = url + "?metaData=true"
    }
    omg.server.getHTTP(url, callback);
    return; 
};

omg.server.deleteId = function (id, callback) {
    var url = this.url + "/data/" + id;
    omg.server.http({method: "DELETE", url: url, callback: callback});
};

omg.server.login = function (username, password, callback) {
    var data = {username: username, password: password};
    omg.server.http({method: "POST", data: data, url : this.url + "/api-login",
            callback: res => {
                omg.user = res
                if (callback) callback(res)
            }
    });
};
omg.server.signup = function (username, password, callback) {
    var data = {username: username, password: password};
    omg.server.http({method: "POST", data: data, url : this.url + "/api-signup",
            callback: res => {
                omg.user = res
                if (callback) callback(res)
            }
    });
};

omg.server.logout = function (callback) {
    omg.server.getHTTP("/api-logout", callback);
};

omg.server.getTypes = function (callback) {
    omg.server.getHTTP("/types", data => {
        omg.types = data
        if (callback) callback(data)
    });
};

omg.server.getComments = function (id, callback) {
    omg.server.getHTTP("/comments/" + id, data => {
        if (callback) callback(data)
    });
};

omg.server.postComment = function (commentText, id_thing, id_parent, callback) {
    var comment = {
        text: commentText,
        id_thing: id_thing,
        id_parent, id_parent
    }
    omg.server.postHTTP("/comments/", comment, data => {
        if (callback) callback(data)
    });
};

/***
 *  Handy search helper
 */

omg.search = function (params, loadSearchResults) {
    var url = "/data/?"
    if (params.q) {
        url = url + "&q=" + params.q;
        params.metaData = false //meta data doesn't come with text search
    }
    if (params.metaData) {
        url = url + "&metaData=true"
    }
    if (params.type) {
        url = url + "&type=" + params.type;
    }
    if (params.page) {
        url = url + "&page=" + params.page;
    }
    if (params.user_id) {
        url = url + "&user_id=" + params.user.id;
    }
    if (params.users) {
        url = url + "&users=" + params.users;
    }
    if (params.sort) {
        url = url + "&sort=" + params.sort;
    }

    omg.server.getHTTP(url, function (results) {
        if (loadSearchResults === true) {
            omg.loadSearchResults(params, results)
        }
    });
    
};

omg.loadSearchResults = function (params, results) {

    params.resultList.innerHTML = ""

    if (params.page && params.page > 1 && !params.noNextPrev) {
        var prevButton = document.createElement("button")
        prevButton.innerHTML = "< Previous"
        params.resultList.appendChild(prevButton)
        prevButton.onclick = () => {
            params.page -= 1
            omg.search(params, true)
        }
    }

    if (results.length === 0) {
        return
    }

    results.forEach(function (result) {
        omg.loadSearchResult(result, params)
    });

    if (!params.noNextPrev) {
        var nextButton = document.createElement("button")
        nextButton.innerHTML = "Next >"
        params.resultList.appendChild(nextButton)
        nextButton.onclick = () => {
            params.page = (params.page || 1) + 1
            omg.search(params, true)
        }    
    }
};

omg.loadSearchResult = function (result, params) {

    var resultDiv = document.createElement("div");
    resultDiv.className = "omg-viewer";

    if (params.prepend) {
        params.resultList.insertBefore(resultDiv, params.resultList.firstChild)
    }
    else {
        params.resultList.appendChild(resultDiv)
    }

    var viewerParams = params.viewerParams || {}
    viewerParams.div = resultDiv
    
    //viewerParams.onPlay = params.onPlay
    //viewerParams.onStop = params.onStop

    if (params.metaData) {
        viewerParams.metaData = result
        viewerParams.data = result.body;
        viewerParams.data.id = result.id
    }
    else {
        viewerParams.data = result;
    }
    new OMGEmbeddedViewer(viewerParams);
}

/** 
 * Utility functions for the client
 * 
 */

omg.util.getPageParams = function () {
    // see if there's somethign to do here
    var rawParams = document.location.search;
    var nvp;
    var params = {};

    if (rawParams.length > 1) {
        rawParams.slice(1).split("&").forEach(function (param) {
            nvp = param.split("=");
            params[nvp[0]] = nvp[1];
        });
    }
    return params;
};

omg.util.makeQueryString = function (parameters) {  
    var string = "?";
    for (var param in parameters) {
        string += param + "=" + parameters[param] + "&";
    }
    return string.slice(0, string.length - 1);
};

omg.util.getTimeCaption = function (timeMS) {

    if (!timeMS) {
        return "";
    }

    var seconds = Math.round((Date.now() - timeMS) / 1000);
    if (seconds < 60) return seconds + " sec ago";

    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + " min ago";    
   
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + " hr ago";    

    var days = Math.floor(hours / 24);
    if (days < 7) return days + " days ago";

    var date  = new Date(timeMS);
    var months = ["Jan", "Feb", "Mar", "Apr", "May",
                "Jun", "Jul", "Aug", "Sep", "Oct", 
                "Nov", "Dec"];
    var monthday = months[date.getMonth()] + " " + date.getDate();
    if (days < 365) {
        return monthday;
    }
    return monthday + " " + date.getFullYear();
};

omg.util.getFileSizeCaption = function (bytes) {
    if (bytes < 1) {
        return bytes + ""
    }
    
    if (bytes / 1000000000 >= 1) {
        return Math.round(bytes / 10000000) / 10 + "gb"
    }

        if (bytes / 1000000 >= 1) {
        return Math.round(bytes / 100000) / 10 + "mb"
    }

    if (bytes / 1000 >= 1) {
        return Math.round(bytes / 100) / 10 + "kb"
    }

    return bytes + " b"
}

omg.util.getUniqueName = function (name, names) {
    var isUnique = true;
    for (var i = 0; i < names.length; i++) {
        if (name === names[i]) {
            isUnique = false;
            break;
        }
    }
    
    if (isUnique) {
        return name;
    }
    
    var ending;
    i = name.lastIndexOf(" ");
    if (i > -1 && i < name.length) {
        ending = name.substr(i + 1);
        if (!isNaN(ending * 1)) {
            return omg.util.getUniqueName(name.substr(0, i + 1) + (ending * 1 + 1), names);
        }
    }
    return omg.util.getUniqueName(name + " 2", names);
};


/*
 * UI stuff
 * 
 */

if (!omg.ui)
    omg.ui = {};

omg.ui.getScrollTop = function () {
    return document.body.scrollTop + document.documentElement.scrollTop;
};

omg.ui.totalOffsets = function (element, parent) {
    var top = 0, left = 0;
    do {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;

        if (parent && parent === element) {
            break;
        }

    } while (element);

    return {
        top: top,
        left: left
    };
};


omg.ui.canUseUnicode = navigator.userAgent.indexOf("Android") === -1 
    && navigator.userAgent.indexOf("iPhone") === -1 
    && navigator.userAgent.indexOf("iPad") === -1 
    && navigator.userAgent.indexOf("Mac OS X") === -1 ;


omg.ui.setupInputEvents = function (input, bindObject, bindProperty, onenter) {
    var text = document.createElement("div");
    text.innerHTML = "Press Enter to save changes";
    text.style.display = "none";
    input.parentElement.insertBefore(text, input.nextSibling)
    input.value = bindObject[bindProperty] || "";
    input.onkeyup = function (e) {
        text.style.display = input.value !== bindObject[bindProperty] ? "inline-block" : "none";
        if (e.keyCode === 13) {
            text.style.display = "none";
            bindObject[bindProperty] = input.value;
            if (onenter) {
                onenter();
            }          
        }
    };
};

omg.ui.showDialog = function (dialog, cancelCallback) {
    var background = document.createElement("div")
    background.style.position = "fixed"
    background.style.left = "0px"
    background.style.top = "0px"
    background.style.width = "100%"
    background.style.height = "100%"
    background.style.backgroundColor = "#808080"
    background.style.opacity = 0.5

    document.body.appendChild(background)

    dialog.style.zIndex = "9"
    dialog.style.position = "fixed"
    dialog.style.display = "block"
    dialog.style.left = window.innerWidth / 2 - dialog.clientWidth / 2 + "px"
    dialog.style.top = window.innerHeight / 2 - dialog.clientHeight / 2 + "px"

    var clearDialog = () => {
        document.body.removeChild(background)
        dialog.style.display = "none"
    }

    background.onclick = e => {
        clearDialog()
        if (cancelCallback) cancelCallback()
    } 
    return clearDialog
}

omg.ui.loginRequired = () => { 
    if (omg.user) {
        return true
    }
    
    var loginArea = omg.ui.loginArea || document.getElementById("login-area")
    if (!loginArea) {
        var loginArea = document.createElement("div")
        omg.ui.loginArea = loginArea
        loginArea.innerHTML = `
        <b>Login</b>
        <p>If you have an account already, login here:</p>
        <div class="invalid-login">Username or password is wrong.</div>
        <input id="login-area-username" type="text" placeholder="username"/>
        <input id="login-area-password" type="password" placeholder="password"/>
        <button id="login-area-button">Login</button>
        <hr>
        <b>Signup</b>
        <p>Create a new account. Just a username and password, that's it!</p>
        <div class="invalid-signup">Username already exists.</div>
        <input id="signup-area-username" type="text" placeholder="username"/>
        <input id="signup-area-password" type="password" placeholder="password"/>
        <button id="signup-area-button">Signup</button>`
        loginArea.className = "dialog"
        document.body.appendChild(loginArea)    
    }
    var loginUsername = document.getElementById("login-area-username")
    var loginPassword = document.getElementById("login-area-password")
    var loginButton = document.getElementById("login-area-button")
    var signupUsername = document.getElementById("signup-area-username")
    var signupPassword = document.getElementById("signup-area-password")
    var signupButton = document.getElementById("signup-area-button")

    var promise = new Promise((resolve, reject) => {
        loginButton.onclick = () => omg.server.login(loginUsername.value, loginPassword.value, onlogin);
        signupButton.onclick = () => omg.server.signup(signupUsername.value, signupPassword.value, onlogin);
        
        var onlogin =  (results) => {
            if (results) {
                clearDialog()
                resolve(results)
            }
            else {
                this.invalidMessage.style.display = "inline-block";
            }        
        };
        
        var clearDialog = omg.ui.showDialog(loginArea, () => {
            resolve(false)
        })
    });
    
    //todo show invalid login
    //document.getElementsByClassName("invalid-login")[0].style.display = "block";
    
    return promise
}


//misc

// polyfill for safari?
if (!document.body.requestFullscreen && document.body.webkitRequestFullscreen) {
    document.body.requestFullscreen = document.body.webkitRequestFullscreen;
}
