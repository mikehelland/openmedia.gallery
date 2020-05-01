# OpenMedia.Gallery

OMG stores "things". A thing needs:

* a type
* a name

And that's it. You can add whatever else youd want to it.

Different applications can be added to OMG just adding a folder to the www/apps/ folder.

Different types of things can be added together to make bigger things.

* a few pictures can be added to the gallery
* those pictures can be used to make a map for a game

And:

* a few sounds can be added to the gallery
* the sounds can be arranged to make a song

Then:

* the song can used as the soundtrack for the game

All of the content can be remixed and rearranged. 

----

## Technicals

* node.js
* express.js
* socket.io
* massive.js (postgres client)

Prerequisites:

* PostGreSQL 9.5 or later

----

## Collaboration

OMG servers include WebSocket and WebRTC functions so your media apps can include video chat, 
and remote collaboration out of the box.

----

## Examples

Here's an example of an OMG server that features the music apps:

https://openmusic.gallery

And the editor is here:

https://openmusic.gallery/create

