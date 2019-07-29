const {
  ipcRenderer,
  clipboard,
  remote
} = require('electron');

document.addEventListener("DOMContentLoaded", function() {
  setInterval(() => {
    sendPageData();
  }, 1e3);
  sendPageData();
});

function sendPageData() {
  var data = {
    "html": document.getElementsByTagName("html")[0].outerHTML,
    "title": document.title,
    "url": window.location.href,
    "favicon": "https://www.google.com/s2/favicons?domain=" + window.location.href
  };

  ipcRenderer.sendToHost("window-data", data);
}

var setSpeedBack = false;
setInterval(() => {
  var adIcon = document.querySelector("span.advertisement.ytmusic-player-bar");
  if (!adIcon.hasAttribute("hidden")) {
    // Set the advertisement speed.
    if (document.querySelector("video")) {
      document.querySelector("video").playbackRate = 16;
    }
    // Mute the advertisement.
    // if () {
      // I actually can't find enough advertisements to test anything.
    // }
    setSpeedBack = false;
  } else if (!setSpeedBack) {
    document.querySelector("video").playbackRate = 0;
    setSpeedBack = true;
  }
}, 100);
