const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  dialog,
  ipcMain,
  globalShortcut
} = require("electron");

var opn = require('opn');

const homedir = require('os').homedir();

const {
  exec
} = require('child_process');

const request = require("request");
const progress = require('request-progress');

const userDataPath = app.getPath("userData");

const fs = require("fs");

const path = require("path");

var askedToUpdate = false;

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
        askedToUpdate = true;
        var doInstall = dialog.showMessageBox(win, {
          "type": 'question',
          "buttons": ['Yes', 'No'],
          "title": 'Install new version?',
          "message": "There appears to be a new version!\nCurrent Version: " + currentVersion + "\nLatest Version: " + latestVersion + "\n\nWould you like me to install it?"
        }, function(response) {
          if (response === 0) {
            win.close();
            tray.destroy();

            opn("https://github.com/KyzaGitHub/Desktop-YouTube-Music/releases");

            downloadInstallNewVersion(body[0].id);
          }
        });
      }
    } catch (e) {
      dialog.showMessageBox({
        'message': "It looks like GitHub is ratelimiting you.\nYou will have to wait a while to be able to update.\n\nThis is caused by opening and closing the program many times in a short period of time."
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

      var filePath = homedir + "/" + fileName.replace("./", "");


      var progressWin = new BrowserWindow({
        width: 800,
        height: 20,
        webPreferences: {
          nodeIntegration: true,
          webviewTag: true
        },
        title: "Downloading Installer",
        icon: __dirname + "/images/favicon.png",
        frame: false,
        transparent: true
      });
      progressWin.setAlwaysOnTop(true);
      progressWin.setIgnoreMouseEvents(true)
      progressWin.loadFile("./progress.html");
      progressWin.setMenu(null);

      var stream = progress(request({
          url: body[i].browser_download_url,
          headers: {
            "User-Agent": "Awesome-Octocat-App"
          }
        }), {
          throttle: 100,
          delay: 0
        })
        .on('progress', function(state) {
          // The state is an object that looks like this:
          // {
          //     percent: 0.5,               // Overall percent (between 0 to 1)
          //     speed: 554732,              // The download speed in bytes/sec
          //     size: {
          //         total: 90044871,        // The total payload size in bytes
          //         transferred: 27610959   // The transferred payload size in bytes
          //     },
          //     time: {
          //         elapsed: 36.235,        // The total elapsed seconds since the start (3 decimals)
          //         remaining: 81.403       // The remaining seconds to finish (3 decimals)
          //     }
          // }
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
        .pipe(fs.createWriteStream(filePath)).on("finish", () => {
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

            // Try opening the file 4 times over 10 seconds.
            // If it can't, then the error is most likely not a locked file.
            openFile(filePath, 2500, 4);
          }, 5000);
        });
    }
  });
}

function openFile(filePath, delay, tries, currentTry) {
  if (!currentTry) currentTry = 0;

  exec(filePath, (err, stdout, stderr) => {
    if (err) {
      //some err occurred
      if (currentTry < tries) {
        setTimeout(() => {
          openFile(filePath, delay, tries, currentTry + 1);
        }, delay);
      } else {
        dialog.showMessageBox({
          'message': `${err}`
        });
        setTimeout(() => {
          app.exit(0);
        }, 5000);
      }
    } else {
      // Once finished, close the current app.
      app.exit(0);
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
  var updateInterval = setInterval(() => {
    checkForUpdate();
    if (askedToUpdate) {
      clearInterval(updateInterval);
    }
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
  tray.destroy();
  app.exit(0);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    toggleDevTools();
  });
  globalShortcut.register('CommandOrControl+Shift+Y', () => {
    if (win.isVisible()) {
      hideWindow();
    } else {
      showWindow();
    }
  });
  // Detect link pasting and send it to the window.
  globalShortcut.register('CommandOrControl+V', () => {
    if (win.isFocused()) {
      win.webContents.executeJavaScript(`
        pasteLink();
      `);
    }
  });
});

var devToolsOpen = false;

function toggleDevTools() {
  if (devToolsOpen && win.isFocused()) {
    win.webContents.closeDevTools();
  } else if (win.isFocused()) {
    win.webContents.openDevTools();
  }
  devToolsOpen = !devToolsOpen;
}

app.on("error", () => {
  quitApp();
});

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
