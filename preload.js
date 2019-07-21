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
