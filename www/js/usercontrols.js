if (typeof omg == "undefined") {
    omg = {};
}
if (!omg.ui) {
    omg.ui = {}
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
       <div class="invalid-login" style="display:none;color:red;">Username or password is wrong.</div>
       <input id="login-area-username" type="text" placeholder="username"/>
       <input id="login-area-password" type="password" placeholder="password"/>
       <button id="login-area-button">Login</button>
       <hr>
       <b>Signup</b>
       <p>Create a new account. Just a username and password, that's it!</p>
       <div class="invalid-signup" style="display:none;color:red;">Username already exists.</div>
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

    var signupError = loginArea.getElementsByClassName("invalid-signup")[0]

    var promise = new Promise((resolve, reject) => {
        loginButton.onclick = () => omg.server.login(loginUsername.value, loginPassword.value, onlogin, err => {
            loginArea.getElementsByClassName("invalid-login")[0].style.display = "block";
        });
        signupButton.onclick = () => omg.server.signup(signupUsername.value, signupPassword.value, onlogin, err=> {
            console.log(err)
            if (typeof err === "string") {
                signupError.innerHTML = err
            }
            signupError.style.display = "block";
        });

        var onlogin = (results) => {
            if (results) {
                clearDialog()
                omg.ui.setupUserControls(omg.ui.userDiv)
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

omg.ui.setupUserControls = (div, successCallback, failCallback) => {

    omg.ui.userDiv = div

    omg.server.getUser(user => {
        if (user) {
            div.innerHTML = "<a href='/user.htm'>" + user.username + "</a> ";
            omg.ui.makeInbox(div, user)
            omg.ui.makeUserMenu(div, user)
            if (successCallback) {
                successCallback(user)
            }
        }
        else {
            div.innerHTML = "<span style='cursor:pointer;'>Login / Signup</span>"
            div.onclick = omg.ui.loginRequired

            if (failCallback) {
                failCallback()
            }
        }
    })
}

omg.ui.makeInbox = (parentDiv, user) => {
    dialog = document.createElement("div")
    dialog.className = "inbox-dialog"
    document.body.appendChild(dialog)

    omg.ui.inbox = { unread: 0 }

    omg.ui.inbox.div = document.createElement("span")
    omg.ui.inbox.div.className = "inbox-indicator"
    parentDiv.appendChild(omg.ui.inbox.div)

    omg.server.getHTTP("/inbox", results => {
        results.forEach(item => {
            if (item.unread) {
                omg.ui.inbox.unread++
            }
        })
        omg.ui.inbox.div.innerHTML = "(" + omg.ui.inbox.unread + ")"

        omg.ui.inbox.div.onclick = e => {

            if (omg.ui.isShowingInbox) {
                omg.ui.isShowingInbox = false
                dialog.style.display = "none"
                return
            }

            dialog.innerHTML = ""
            results.forEach(item => {
                dialog.appendChild(omg.ui.makeInboxItem(item, dialog))
            })
            omg.ui.isShowingInbox = true
            dialog.style.display = "block"
        }
    })

}

omg.ui.makeInboxItem = (item, dialog) => {
    var itemEl = document.createElement("div")
    itemEl.className = "inbox-item" + (item.unread ? "-unread" : "")
    itemEl.innerHTML = `<div class='inbox-item-datetime'>
                     ${omg.util.getTimeCaption(item.datetime)}</div>
                     ${item.type} from ${item.fromUsername}`
    itemEl.onclick = () => {

        if (item.unread) {
            omg.server.postHTTP("/inbox/read", { id: item.id })
            itemEl.className = "inbox-item"
            item.unread = false
            omg.ui.inbox.div.innerHTML = "(" + --omg.ui.inbox.unread + ")"
        }

        omg.ui.isShowingInbox = false
        dialog.style.display = "none"
        if (omg.ui.oninboxitemclick) {
            omg.ui.oninboxitemclick(item, itemEl)
        }
        else {
            window.location = item.url
        }
    }
    return itemEl
}

omg.ui.makeUserMenu = (parentDiv, user) => {
    var userMenuArrow = document.createElement("span")
    userMenuArrow.innerHTML = "&#9660;"
    userMenuArrow.className = "user-menu-link"
    parentDiv.appendChild(userMenuArrow)

    var dialog
    userMenuArrow.onclick = e => {

        if (omg.ui.isShowingUserMenu) {
            omg.ui.isShowingUserMenu = false
            document.body.removeChild(dialog)
            return
        }

        dialog = document.createElement("div")
        dialog.className = "inbox-dialog"
        document.body.appendChild(dialog)

        dialog.innerHTML = "<a style='color:white;' href='/logout'><div class='inbox-item'>Log Out</div></a>"

        omg.ui.isShowingUserMenu = true
        dialog.style.display = "block"
    }

}
