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
       }
       else {
           div.innerHTML = "Login / Signup"
           div.onclick = omg.ui.loginRequired
       }
   })
}

omg.ui.makeInbox = (parentDiv, user) => {
   dialog = document.createElement("div")
   dialog.className = "inbox-dialog"      
   document.body.appendChild(dialog)

   omg.ui.inbox = {unread: 0}

   omg.server.getHTTP("/inbox", results => {
      omg.ui.inbox.div = document.createElement("span")
      results.forEach(item => {
         if (item.unread) {
            omg.ui.inbox.unread++
         }
      })
      omg.ui.inbox.div.innerHTML = "(" + omg.ui.inbox.unread + ")"
      omg.ui.inbox.div.className = "inbox-indicator"
      parentDiv.appendChild(omg.ui.inbox.div)
     
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
   console.log(item)
   itemEl.onclick = () => {

      if (item.unread) {
         console.log(item.id)
         omg.server.postHTTP("/inbox/read", {id: item.id})
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
