# OpenMedia.Gallery

OMG is a file-sharing social-network with an emphasis on composability.

OMG stores *things* that can be combined together to make bigger *things*. All of the content can be remixed and rearranged.

Watch: Composable Media on OMG  
https://www.youtube.com/watch?v=6bfpxGNvDHQ

See OMG and its apps in action: https://openmedia.gallery

----

## Technicals

* node.js
* express.js
* PostGreSQL 
* massive.js (postgres client)

----

## Collaboration

OMG servers include **WebSockets** and **WebRTC** functions so your media apps can include video chat, 
and remote collaboration out of the box.

----

## Install and Run

Git, Node and NPM should be installed:

    git clone https://github.com/mikehelland/openmedia.gallery.git
    cd openmedia.gallery
    npm install
    ./create_database.sh

The `create_database` script will install PostGreSQL if needed, 
then ask for a DB name and password, create the database, and create a `runomg.sh` script used to start the server.

    ./runomg.sh

----

## Apps

To install an app, clone its repo into the `apps/` folder:

* OMG Music - https://github.com/mikehelland/omg-music

A music player and remixer. This app is a requirement of most of other apps.

* OMG Meme - https://github.com/mikehelland/omg-meme

Create memes and multimedia presentations, including animation and music.

* OMG Band - https://github.com/mikehelland/omg-band

Tool for a working cover band, managing set lists, and promo materials.

* RTC RPG - https://github.com/mikehelland/rtcrpg

A clone of an 8-bit Role Playing Game and map editor with built in video conferencing

* Song Processor - https://github.com/mikehelland/omg-song-processor

An app for alternative and unusual musical interfaces.

