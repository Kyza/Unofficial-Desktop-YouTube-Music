const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  dialog,
  ipcMain
} = require("electron");

const {
  exec
} = require('child_process');

const request = require("request");
const rp = require("request-promise");

const fs = require("fs");

const path = require("path");

function checkForUpdate() {
  request({
    url: "http://api.github.com/repos/KyzaGitHub/Desktop-YouTube-Music/releases",
    headers: {
      "User-Agent": "Awesome-Octocat-App"
    },
    json: true
  }, function(error, response, body) {
    try {
      var currentVersion = app.getVersion();
      var latestVersion = body[0].tag_name.replace("v", "");
      if (currentVersion != latestVersion) {
        var doInstall = dialog.showMessageBox(win, {
          "type": 'question',
          "buttons": ['Yes', 'No'],
          "title": 'Install new version?',
          "message": "There appears to be a new version!\nCurrent Version: " + currentVersion + "\nLatest Version: " + latestVersion + "\n\nWould you like me to install it?"
        }, function(response) {
          if (response === 0) {
            win.close();
            tray.destroy();

            downloadInstallNewVersion(body[0].id);
          }
        });
      }
    } catch (e) {
      dialog.showMessageBox({
        'message': JSON.stringify(body)
      });
    }
  });
}

function downloadInstallNewVersion(versionID) {
  request({
    url: "https://api.github.com/repos/KyzaGitHub/Desktop-YouTube-Music/releases/" + versionID + "/assets",
    headers: {
      "User-Agent": "Awesome-Octocat-App"
    },
    json: true
  }, function(error, response, body) {
    for (let i = 0; i < body.length; i++) {
      var fileName = "./" + body[i].browser_download_url.split("/")[body[i].browser_download_url.split("/").length - 1];
      var filePath = __dirname + "/" + fileName.replace("./", "");

      var stream = request({
        url: body[i].browser_download_url,
        headers: {
          "User-Agent": "Awesome-Octocat-App"
        }
      }).pipe(fs.createWriteStream(fileName));

      stream.on('finish', function() {
        exec(filePath, (err, stdout, stderr) => {
          if (err) {
            //some err occurred
            dialog.showMessageBox({
              'message': `${err}`
            });
          } else {
            // Once finished, close the current app.
            app.exit(0);
          }
        });
      });
    }
  });
}

// Set the Discord Rish Presence.
const client = require('discord-rich-presence')('602320411216052240');

ipcMain.on("rich-presence-data", (event, arg) => {
  console.log(arg);
  setRPData(arg);
  setActivity();
});

function setRPData(data) {
  songName = data.songName;
  songAuthor = data.songAuthor;
  songStartedTime = data.songStartedTime;
  songEndsTime = data.songEndsTime;
  songPaused = data.songPaused;
}

var songName = "";
var songAuthor = "";

var songStartedTime = Date.now();
var songEndsTime = Date.now() + 133337;

var songPaused = false;

var lookingForSong = false;

function setActivity() {
  if (!songPaused) {
    client.updatePresence({
      state: songAuthor,
      details: songName,
      startTimestamp: songStartedTime,
      endTimestamp: songEndsTime,
      largeImageKey: 'logo',
      smallImageKey: 'kyza',
      largeImageText: "bit.ly/DesktopYTMusic",
      smallImageText: "@Kyza#9994"
    });
  } else if (lookingForSong) {
    client.updatePresence({
      state: "Searching for a song",
      details: "Paused",
      startTimestamp: songStartedTime,
      largeImageKey: 'logo',
      smallImageKey: 'kyza',
      largeImageText: "bit.ly/DesktopYTMusic",
      smallImageText: "@Kyza#9994"
    });
  } else {
    client.updatePresence({
      state: "Listening to silence",
      details: "Paused",
      startTimestamp: songStartedTime,
      largeImageKey: 'logo',
      smallImageKey: 'kyza',
      largeImageText: "bit.ly/DesktopYTMusic",
      smallImageText: "@Kyza#9994"
    });
  }
}

// Keep a global reference of the window object, if you don"t, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let isQuiting;
let tray;
let trayMenu;

function createWindow() {
  checkForUpdate();
  setInterval(() => {
    checkForUpdate();
  }, 30e3 * 60); // Check for updates every 30 minutes.


  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      webviewTag: true
    },
    title: "YouTube Music",
    icon: __dirname + "/images/favicon.png"
  });


  tray = new Tray(__dirname + "/images/favicon.png");
  tray.setToolTip("YouTube Music");

  tray.on("double-click", function() {
    showWindow();
  });

  showWindow();

  if (win.setThumbarButtons([{
      tooltip: "Previous Song",
      icon: __dirname + "/images/previous.png",
      flags: ["enabled"],
      click() {
        console.log("Previous clicked.");
      }
    }, {
      tooltip: "Play",
      icon: __dirname + "/images/play.png",
      flags: ["enabled"],
      click() {
        console.log("Play clicked.");
      }
    }, {
      tooltip: "Next Song",
      icon: __dirname + "/images/next.png",
      flags: ["enabled"],
      click() {
        console.log("Next clicked.");
      }
    }])) {
    console.log("Thumbbar buttons are supported.");
  } else {
    console.log("Thumbbar buttons are not supported.");
  }

  win.setMenu(null);
  win.maximize();

  // and load the index.html of the app.
  win.loadFile("./index.html");

  // Open the DevTools.
  // win.webContents.openDevTools();

  win.on("close", function(event) {
    event.preventDefault();
    hideWindow();
    event.returnValue = false;
  });
}

function hiddenContextMenu() {
  trayMenu = Menu.buildFromTemplate([{
      label: "Open",
      click: function() {
        showWindow();
      }
    },
    {
      label: "Quit",
      click: function() {
        quitApp();
      }
    }
  ]);
  tray.setContextMenu(trayMenu);
}

function shownContextMenu() {
  trayMenu = Menu.buildFromTemplate([{
    label: "Quit",
    click: function() {
      quitApp();
    }
  }]);
  tray.setContextMenu(trayMenu);
}

function showWindow() {
  win.show();
  shownContextMenu();
}

function hideWindow() {
  win.hide();
  hiddenContextMenu();
}

function quitApp() {
  client.disconnect();
  app.exit(0);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

app.on("before-quit", function() {
  isQuiting = true;
});

app.on("activate", () => {
  // On macOS it"s common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
