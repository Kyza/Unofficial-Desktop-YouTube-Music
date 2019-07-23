const {
  ipcRenderer
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

// Handle and send all of the keys being pressed.
// Set up the link pasting keybind.

// Find out which keys are pressed.
var keymap = {};

document.addEventListener("keydown", (e) => {
  updateKeys(e);
});
document.addEventListener("keyup", (e) => {
  updateKeys(e);
});

function updateKeys(e) {
  keymap[e.keyCode] = e.type == 'keydown';

  ipcRenderer.sendToHost("key-data", keymap);
}
