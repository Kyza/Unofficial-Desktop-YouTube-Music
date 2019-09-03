const {
  ipcRenderer,
  clipboard,
  remote
} = require('electron');

const BrowserWindow = remote.BrowserWindow;
const dialog = remote.dialog;
const request = require("request");
const progress = require('request-progress');
const fs = require("fs");

const webview = $("#webview");
const loadingText = $("#loading-text");
const toolbar = $("#toolbar");
const downloadWrapper = $("#download-wrapper");
const downloadInner = $("#download-inner");
downloadWrapper.hide();

// Set up the toolbar buttons.
var backButton = $("#back-button");
backButton.on("click", () => {
  window.history.back();
});
var reloadButton = $("#reload-button");
reloadButton.on("click", () => {
  window.location.reload();
});
var forwardButton = $("#forward-button");
forwardButton.on("click", () => {
  window.history.forward();
});

var notOnTopButton = $("#not-on-top-button");
var onTopButton = $("#on-top-button");
setAlwaysOnTop(false);
notOnTopButton.on("click", () => {
  setAlwaysOnTop(false);
});
onTopButton.on("click", () => {
  setAlwaysOnTop(true);
});

function setAlwaysOnTop(value) {
  remote.getCurrentWindow().setAlwaysOnTop(value);
  if (value) {
    onTopButton.css("display", "none");
    notOnTopButton.css("display", "");
  } else {
    notOnTopButton.css("display", "none");
    onTopButton.css("display", "");
  }
}

// Try to set the media player's speed.
function setPlayerSpeed(speed) {
  webview[0].executeJavaScript(`
    document.querySelector("video").playbackRate = ` + speed + `;
  `);
}
var playbackSpeedButtonInput = $("#playback-speed-button-input>input");
// Using an interval instead so I don't have to use IPC again.
// Might optimize this later.
setInterval(() => {
  setPlayerSpeed(playbackSpeedButtonInput.val());
}, 1000);

var progressWin;

// Handle downloading the song.
var downloadButton = $("#download-button");
downloadButton.on("click", () => {
  var songID = youtubeID(webview[0].getURL());
  if (songID) {
    console.log("Downloading song: " + songID);

    $.ajax({
      type: 'POST',
      url: "https://youtubemp4.to/download_ajax/",
      data: {
        url: "https://www.youtube.com/watch?v=" + songID
      },
      success: function(result) {
        let resultJSON = JSON.parse(result);
        console.log(resultJSON.result);

        let regExp = /(?:<a class="btn btn-red" href=")(.*)(?:>Best)/;
        let match = resultJSON.result.match(regExp);

        var downloadURL = match[1].substr(0, match[1].length - 1);

        console.log(downloadURL);
        console.log(
          `https://r2---sn-vgqskn76.googlevideo.com/videoplayback?expire=1564103997&ei=3QA6XcS3H9GXhwa39LmIDA&ip=98.102.99.165&id=o-ADCpkdLe45xPGQrYCGt_-_GoU0UKnA0DwvT8TTJ7DVgb&itag=243&aitags=133%2C134%2C135%2C136%2C137%2C160%2C242%2C243%2C244%2C247%2C248%2C278&source=youtube&requiressl=yes&mm=31%2C26&mn=sn-vgqskn76%2Csn-p5qlsndz&ms=au%2Conr&mv=m&mvi=1&pl=23&gcr=us&initcwndbps=1826250&mime=video%2Fwebm&gir=yes&clen=1382726&dur=232.332&lmt=1524826564149050&mt=1564082314&fvip=2&keepalive=yes&c=WEB&sparams=expire%2Cei%2Cip%2Cid%2Caitags%2Csource%2Crequiressl%2Cgcr%2Cmime%2Cgir%2Cclen%2Cdur%2Clmt&lsparams=mm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Cinitcwndbps&lsig=AHylml4wRQIhAL2kK2lI2-7mXEEKLzrxgJgcQL4pdw6LmKiH99SXSS0hAiA-CPXtuVcKootGuZA_litEFzuqZH5XpRDrQ7NX1McbVA%3D%3D&alr=yes&sig=ALgxI2wwRQIgBsrluAZR7Wjqvdd5L3QQRNMDHov1gtQ3l3Br1g1gvFMCIQCYZQXP2S98ZEvwpUbiQDLoKeidX6LvXCzY-4Z_-tjFtA%3D%3D&cpn=bypiog-I8Q1NgrJ4&cver=2.20190725&range=0-66491&altitags=242%2C278&rn=1&rbuf=0`
        );

        dialog.showSaveDialog({
          title: "Save Song",
          filters: [{
            name: 'MP4',
            extensions: ["mp4"]
          }],
          defaultPath: "song.mp4"
        }, (filename) => {
          if (filename != undefined) {
            progressWin = new BrowserWindow({
              width: 800,
              height: 20,
              webPreferences: {
                nodeIntegration: true,
                webviewTag: true
              },
              title: "Downloading Song",
              icon: __dirname + "/images/favicon.png",
              frame: false,
              transparent: true
            });
            progressWin.setAlwaysOnTop(true);
            progressWin.setIgnoreMouseEvents(true);
            progressWin.loadFile("./progress.html");
            progressWin.setMenu(null);
            progressWin.center();
            progressWin.show();

            console.log("Downloading to: " + filename);
            downloadSong(downloadURL, songID, filename);
          }
        });
      }
    });
  }
});

function downloadSong(url, songID, filename) {
  console.log(url);

  let stream = progress(request({
      url: url
    }), {
      throttle: 100,
      delay: 0
    })
    .on('progress', function(state) {
      progressWin.webContents.executeJavaScript(`
        updateProgress(` + JSON.stringify(state) + `);
      `);
    })
    .on('error', function(err) {
      dialog.showMessageBox({
        'message': `${err}`
      });
    })
    .on('end', function() {

    })
    .pipe(fs.createWriteStream(filename)).on("finish", () => {
      // Make sure the stream is closed so the file is accessable.
      stream.close();

      progressWin.webContents.executeJavaScript(`
        updateProgress(` + JSON.stringify({
        percent: 1
      }) + `);
      `);

      // Wait five seconds before attempting to install.
      // This should reduce the amount of installation failures until I find a better solution.
      setTimeout(() => {
        progressWin.close();
      }, 5000);
    });
}

// Change the height of the webview when the toolbar is hovered.
openToolbar();
setTimeout(() => {
  closeToolbar();
}, 5000);
toolbar.on("mouseover", () => {
  openToolbar();
});
toolbar.on("mouseout", () => {
  closeToolbar();
});

function openToolbar() {
  toolbar.removeClass("toolbar-closed");
  toolbar.addClass("toolbar-open");

  webview.removeClass("toolbar-closed");
  webview.addClass("toolbar-open");
}

function closeToolbar() {
  toolbar.removeClass("toolbar-open");
  toolbar.addClass("toolbar-closed");

  webview.removeClass("toolbar-open");
  webview.addClass("toolbar-closed");
}


function previousTrack() {
  webview[0].executeJavaScript(
    `
    function eventFire(el, etype){
      if (el.fireEvent) {
        el.fireEvent('on' + etype);
      } else {
        var evObj = document.createEvent('Events');
        evObj.initEvent(etype, true, false);
        el.dispatchEvent(evObj);
      }
    }
    var nextTrackButton = document.querySelector(".previous-button.ytmusic-player-bar");
    eventFire(nextTrackButton, "click");
  `
  );
}

function togglePlaying(value) {
  webview[0].executeJavaScript(
    `
    function eventFire(el, etype){
      if (el.fireEvent) {
        el.fireEvent('on' + etype);
      } else {
        var evObj = document.createEvent('Events');
        evObj.initEvent(etype, true, false);
        el.dispatchEvent(evObj);
      }
    }
    var playPauseButton = document.querySelector("#play-pause-button");
    var songPaused = (playPauseButton.title == "Play" ? true : false);
    var value = ` +
    value +
    `;
    if (value != undefined) {
      if (songPaused && value) {
        eventFire(playPauseButton, "click");
      } else if (!songPaused && !value) {
        eventFire(playPauseButton, "click");
      }
    } else {
      eventFire(playPauseButton, "click");
    }
  `
  );
}

function nextTrack() {
  webview[0].executeJavaScript(
    `
    function eventFire(el, etype){
      if (el.fireEvent) {
        el.fireEvent('on' + etype);
      } else {
        var evObj = document.createEvent('Events');
        evObj.initEvent(etype, true, false);
        el.dispatchEvent(evObj);
      }
    }
    var nextTrackButton = document.querySelector(".next-button.ytmusic-player-bar");
    eventFire(nextTrackButton, "click");
  `
  );
}


// Add the link handling for the main process to use.
function pasteLink() {
  // Execute the paste command in case someone was pasting for a different reason.
  webview[0].paste();

  // Parse the YouTube link and handle how to navigate to it.
  var clipboardText = clipboard.readText("clipboard");

  console.log(clipboardText);

  // Save the original clipboard text.
  var originalClipboardText = clipboardText;

  // Check if the link is a normal YouTube link.
  var regExp = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;
  var match1 = clipboardText.match(regExp);

  // Attempt to change the link into a YouTube Music link.
  clipboardText = clipboardText.replace("http://", "https://").replace("youtu.be", "youtube.com").replace("youtube.com", "music.youtube.com").replace("www.", "");

  // Make sure that the link has "watch?v=" at the end of it.
  if (clipboardText.indexOf("music.youtube.com/watch?v=") < 0) {
    clipboardText = clipboardText.replace("music.youtube.com/", "music.youtube.com/watch?v=");
  }

  // Run a second match on the YouTube link to make sure it is correct.
  regExp = /.*(?:https:\/\/music.youtube.com\/watch\?v=)([^#\&\?]*).*/;
  var tmpMatch = clipboardText.match(regExp);
  var match2 = tmpMatch && tmpMatch[1].length == 11;

  console.warn("Possible link: " + originalClipboardText + "\n\n" + "Possibly formatted link: " + clipboardText);

  if (originalClipboardText.indexOf("https://music.youtube.com") == 0) {
    // It's a YouTube Music link.
    // It was right all along.

    console.warn("Easy YouTube Music link.");
    webview.attr("src", originalClipboardText);
  } else if (match1 && match2) {
    // It wasn't a YouTube Music link, but it was turned into one.
    // So it uses the now morphed link with all of the extra YouTube URL attributes.

    console.warn("Harder YouTube link.");
    webview.attr("src", clipboardText);
  } else if (youtubeID(clipboardText)) {
    // It isn't a YouTube Music link, and it couldn't be turned into one.
    // It has a YouTube ID in it, so it uses that.

    console.warn("Hardest YouTube link.");
    webview.attr("src", "https://music.youtube.com/watch?v=" + youtubeID(clipboardText));
  } else {
    console.error("No link found.");
  }
}

function youtubeID(url) {
  var regExp = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  var match = url.match(regExp);
  return (match && match[1].length == 11) ? match[1] : false;
}




// Mirror all console messages to the main page's console.
webview.on('console-message', (e) => {
  // console.log("Webview:\n" + e);
});

var firstLoad = true;

const loadStart = () => {
  if (firstLoad) {
    firstLoad = false;

    webview.attr("style", "opacity: 0;");
    loadingText.attr("style", "z-index: 0; z-index: 0; position: absolute; top: 50%; left: 50%; font-size: 32px; transform: translate(-50%, -50%); opacity: 1;");
  } else {
    webview.attr("style", "transition-duration: 1s; opacity: 1;");
    loadingText.attr("style", "z-index: 0; position: absolute; top: 50%; left: 50%; font-size: 32px; transform: translate(-50%, -50%); transition-duration: 1s; opacity: 0;");
    setTimeout(() => {
      webview.attr("style", "transition-duration: 1s; opacity: 0;");
      loadingText.attr("style", "z-index: 0; transition-duration: 1s;z-index: 0; position: absolute; top: 50%; left: 50%; font-size: 32px; transform: translate(-50%, -50%); opacity: 1;");
    }, 100);
  }
}

const loadStop = () => {
  webview.attr("style", "transition-duration: 1s; opacity: 0;");
  loadingText.attr("style", "z-index: 0; position: absolute; top: 50%; left: 50%; font-size: 32px; transform: translate(-50%, -50%); transition-duration: 1s; opacity: 1;");
  setTimeout(() => {
    webview.attr("style", "transition-duration: 1s; opacity: 1;");
    loadingText.attr("style", "z-index: 0; transition-duration: 1s;z-index: 0; position: absolute; top: 50%; left: 50%; font-size: 32px; transform: translate(-50%, -50%); opacity: 0;");
  }, 100);
}

webview.on("did-start-loading", loadStart);
webview.on("did-stop-loading", loadStop);


webview[0].addEventListener("ipc-message", function(e) {
  if (e.channel === "window-data") {
    var webviewDOM = $(document.createElement("html"));
    webviewDOM.html(e.args[0].html);

    var selectedElement = webviewDOM[0].querySelector(".title.ytmusic-player-bar");
    if (selectedElement) {
      songName = selectedElement.textContent;
    }

    selectedElement = webviewDOM[0].querySelector(".byline.ytmusic-player-bar");
    if (selectedElement) {
      if (selectedElement.textContent != "Video will play after ad") {
        songAuthor = selectedElement.textContent;
      }
    }

    //time-info style-scope ytmusic-player-bar
    selectedElement = webviewDOM[0].querySelector(".time-info.ytmusic-player-bar");
    if (selectedElement) {
      var currentTime = selectedElement.textContent.split("/")[0].trim();
      var totalTime = selectedElement.textContent.split("/")[1].trim();

      try {
        var currentTimeMS = (parseInt(currentTime.split(":")[1]) * 1000) + (parseInt(currentTime.split(":")[0]) * 60000);
        var totalTimeMS = (parseInt(totalTime.split(":")[1]) * 1000) + (parseInt(totalTime.split(":")[0]) * 60000);

        songCurrentTime = Date.now();
        songEndsTime = Date.now() + totalTimeMS - currentTimeMS;
        songStartedTime = Date.now() - currentTimeMS;
      } catch (e) {}
    }

    selectedElement = webviewDOM[0].querySelector("#play-pause-button");
    if (selectedElement) {
      songPaused = (selectedElement.title == "Play" ? true : false);
      if (songName.trim() == "" || songAuthor.trim() == "") {
        songPaused = true;
      }
      if (!songPaused) {
        sentPaused = false;
      }
    }
  }
});


var songAuthor = "";
var songName = "";

var songStartedTime = Date.now();
var songCurrentTime = Date.now();
var songEndsTime = Date.now();

var songPaused = true;

var sentPaused = false;

function sendRPData() {
  if (songPaused && !sentPaused) {
    sentPaused = true;
    ipcRenderer.send("rich-presence-data", {
      "songName": songName,
      "songAuthor": songAuthor,
      "songStartedTime": songStartedTime,
      "songCurrentTime": songCurrentTime,
      "songEndsTime": songEndsTime,
      "songPaused": songPaused
    });
  } else if (!songPaused) {
    ipcRenderer.send("rich-presence-data", {
      "songName": songName,
      "songAuthor": songAuthor,
      "songStartedTime": songStartedTime,
      "songCurrentTime": songCurrentTime,
      "songEndsTime": songEndsTime,
      "songPaused": songPaused
    });
  }
}

sendRPData();

setInterval(() => {
  console.log(songPaused);
  sendRPData();
}, 1e3);
