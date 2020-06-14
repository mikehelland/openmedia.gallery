"use strict";

if (typeof omg === "undefined") {
    omg = {};
    console.log("No OMG Obejcts for comments.js, not good!");
}

function OMGComments(id) {
    this.id = id
    this.div = document.createElement("div")
    this.div.className = "omg-viewer-comment-section"

    // how the subsomments are arrnaged
    this.tree = {}
    
    var commentBox = document.createElement("div")
    commentBox.className = "omg-viewer-comment-box"
    
    var commentUserName = document.createElement("div")
    commentUserName.innerHTML = omg.user ? omg.user.username : "login!"
    commentUserName.className = "omg-viewer-comment-me"
    commentBox.appendChild(commentUserName)
    
    this.commentInput = document.createElement("input")
    this.commentInput.placeholder = "type comment here..."
    this.commentInput.className = "omg-viewer-comment-input"
    this.commentInput.onkeypress = e => {
        if (e.keyCode === 13) {
            this.postComment(this.commentInput.value)
        }
    }
    commentBox.appendChild(this.commentInput)

    var commentButton = document.createElement("button")
    commentButton.innerHTML = "Post"
    commentButton.className = "omg-viewer-comment-button"
    commentButton.onclick = e => this.postComment(this.commentInput.value)
    commentBox.appendChild(commentButton)

    this.div.appendChild(commentBox)
    this.commentList = document.createElement("div")
    this.commentList.className = "omg-viewer-comments"
    this.div.appendChild(this.commentList)
}

OMGComments.prototype.postComment = async function (text, parentId, afterDiv) {
    if (!omg.user) {
        if (typeof loginRequired === "function") { //todo global function?
            let ok = await loginRequired()
            if (!ok) {
                return
            }
        }
        else {
            alert("login/signup to comment") 
            return    
        }
    }

    if (text.trim().length === 0) {
        return
    }
    omg.server.postComment(text, this.id, parentId || 0, res => {
        console.log(res)
        this.commentInput.value = ""
        this.makeCommentDiv(res, true, afterDiv)
    })
    return true
}

OMGComments.prototype.makeCommentDiv = function (comment, fresh, afterDiv) {

    var commentDiv = document.createElement("div")
    commentDiv.className = "omg-viewer-comment"
    var commentDivText = document.createElement("div")
    commentDivText.innerHTML = "<a href='' class='omg-viewer-comment-username'>" + 
                            comment.username.trim() + "</a> " + comment.text
    commentDivText.className = "omg-viewer-comment-text"
    commentDiv.appendChild(commentDivText)

    this.tree[comment.id] = commentDiv
    var parentDiv = this.tree[comment.id_parent] || this.commentList

    if (fresh) {
        if (afterDiv) {
            afterDiv.parentElement.insertBefore(commentDiv, afterDiv.nextSibling)
        }
        else {
            parentDiv.insertBefore(commentDiv, parentDiv.firstChild)
        }
    }
    else {
        parentDiv.appendChild(commentDiv)
    }
    
    var tools = document.createElement("div")
    tools.className = "omg-viewer-comment-tools"
    var commentReplyDiv = document.createElement("span")
    commentReplyDiv.innerHTML = "Reply"
    commentReplyDiv.className = "omg-viewer-comment-reply-to"

    commentReplyDiv.onclick = e => {
        if (!comment.isReplyShowing) {
            this.makeCommentReplyDiv(comment, tools)
            comment.isReplyShowing = true
        }
    }
    tools.appendChild(commentReplyDiv)

    commentDiv.appendChild(tools)
}

OMGComments.prototype.makeCommentReplyDiv = function (comment, afterDiv) {
    var replyDiv = document.createElement("div")
    replyDiv.className = "omg-viewer-comment-reply-box"
    var commentInput = document.createElement("input")
    commentInput.placeholder = "type reply here..."
    commentInput.className = "omg-viewer-comment-input"
    commentInput.onkeypress = e => {
        if (e.keyCode === 13) {
            commentButton.onclick()
        }
    }
    replyDiv.appendChild(commentInput)

    var commentButton = document.createElement("button")
    commentButton.innerHTML = "Post"
    commentButton.className = "omg-viewer-comment-button"
    commentButton.onclick = e => {
        if (this.postComment(commentInput.value, comment.id, afterDiv)) {
            afterDiv.parentNode.removeChild(replyDiv)
            comment.isReplyShowing = false
        }
    }
    replyDiv.appendChild(commentButton)
    afterDiv.parentNode.insertBefore(replyDiv, afterDiv.nextSibling);
}
