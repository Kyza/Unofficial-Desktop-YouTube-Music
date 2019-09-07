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

const platform = require('os').platform();

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

const currentVersion = app.getVersion();

Number.prototype.round = function(places) {
  if (!("" + this).includes("e")) {
    return +(Math.round(this + "e+" + places) + "e-" + places);
  } else {
    var arr = ("" + this).split("e");
    var sig = ""
    if (+arr[1] + places > 0) {
      sig = "+";
    }
    return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + places)) + "e-" + places);
  }
}

function checkForUpdate() {
  request({
    url: "http://api.github.com/repos/KyzaGitHub/Unofficial-Desktop-YouTube-Music/releases",
    headers: {
      "User-Agent": "Awesome-Octocat-App"
    },
    json: true
  }, function(error, response, body) {
    try {
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

            opn("https://github.com/KyzaGitHub/Unofficial-Desktop-YouTube-Music/releases");

            downloadNewInstallerVersion(body[0].id);
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

function fileExt(fileName) {
  return (/[.]/.exec(fileName)) ? /[^.]+$/.exec(fileName) : undefined;
}

function downloadNewInstallerVersion(versionID) {
  request({
    url: "https://api.github.com/repos/KyzaGitHub/Unofficial-Desktop-YouTube-Music/releases/" + versionID + "/assets",
    headers: {
      "User-Agent": "Awesome-Octocat-App"
    },
    json: true
  }, function(error, response, body) {
    for (let i = 0; i < body.length; i++) {
      var fileName = "./" + body[i].browser_download_url.split("/")[body[i].browser_download_url.split("/").length - 1];

      var filePath = homedir + "/" + fileName.replace("./", "");

      if ((platform == "win32" && fileExt(fileName) == "exe") || (platform == "linux" && fileExt(fileName) == "AppImage")) {
        var progressWin = new BrowserWindow({
          width: 800,
          height: 20,
          webPreferences: {
            "web-security": false,
            nodeIntegration: true,
            webviewTag: true
          },
          title: "Downloading Installer",
          icon: __dirname + "/images/favicon.png",
          frame: false,
          transparent: true
        });
        progressWin.setAlwaysOnTop(true);
        progressWin.setIgnoreMouseEvents(true);
        progressWin.loadFile("./progress.html");
        progressWin.setMenu(null);
        progressWin.center();

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


// Keep a global reference of the window object, if you don"t, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let isQuiting;
let tray;
let trayMenu;

// Set the Discord Rish Presence.
const DiscordRPC = require('discord-rpc');
const clientId = "602320411216052240";
var rpc = new DiscordRPC.Client({
  transport: 'ipc'
});
DiscordRPC.register(clientId);
rpc.login({
  clientId
}).catch(console.error);

// Not sure if this works.
rpc.on('ready', () => {});

var connectedToDiscord = true;

// Reconnect to Discord.
// setInterval(() => {
// }, 1e3);

ipcMain.on("rich-presence-data", (event, arg) => {
  setRPData(arg);
  setProgressBar();
	setActivity();
});

// Check connection to Discord.
setInterval(() => {
  if (!rpc.user) {
    // Make sure Discord still exists.
    rpc = new DiscordRPC.Client({
      transport: 'ipc'
    });
    DiscordRPC.register(clientId);

    let couldConnect = false;
    rpc.login({
      clientId
    }).then(() => {
      couldConnect = true;
    }).finally(() => {
      if (couldConnect) {
				connectedToDiscord = true;
        if (win) win.setTitle("YouTube Music v" + currentVersion + " - Synced With Discord");
        setActivity();
      } else {
        connectedToDiscord = false;
        if (win) win.setTitle("YouTube Music v" + currentVersion);
      }
    }).catch((e) => {});
  } else {
		connectedToDiscord = true;
		if (win) win.setTitle("YouTube Music v" + currentVersion + " - Synced With Discord");
	}
}, 1e3);

function setRPData(data) {
  rpData = data;
}

var rpData = {
  songName: "",
  songAuthor: "",
  songStartedTime: Date.now(),
  songCurrentTime: Date.now() + 133337,
  songEndsTime: Date.now() + 133337,
  songPaused: false
}

var lookingForSong = false;

function setActivity() {
  if (connectedToDiscord) {
    if (!rpData.songPaused) {
      rpc.setActivity({
        state: rpData.songAuthor,
        details: rpData.songName,
        startTimestamp: rpData.songCurrentTime,
        endTimestamp: rpData.songEndsTime,
        largeImageKey: 'logo',
        smallImageKey: 'kyza',
        largeImageText: "https://ytm.kyza.gq/",
        smallImageText: "@Kyza#9994"
      }).catch((e) => {});
    } else {
      rpc.setActivity({
        state: "by @Kyza#9994",
        details: "Absolute Silence",
        startTimestamp: rpData.songCurrentTime,
        largeImageKey: 'logo',
        smallImageKey: 'kyza',
        largeImageText: "https://ytm.kyza.gq/",
        smallImageText: "@Kyza#9994"
      }).catch((e) => {});
    }
  }
}

// Set the taskbar progress.
function setProgressBar() {
  let progress = ((rpData.songCurrentTime - rpData.songStartedTime) / (rpData.songEndsTime - rpData.songStartedTime));
  win.setProgressBar(progress, {
    mode: rpData.songPaused ? "paused" : "normal"
  });
  setThumbarButtons(rpData.songPaused);
}

function createWindow() {
  checkForUpdate();
  var updateInterval = setInterval(() => {
    if (askedToUpdate) {
      clearInterval(updateInterval);
    }
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
    title: "YouTube Music v" + currentVersion,
    icon: __dirname + "/images/favicon.png"
  });

  win.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  tray = new Tray(__dirname + "/images/favicon.png");
  tray.setToolTip("YouTube Music");

  tray.on("double-click", function() {
    showWindow();
  });

  showWindow();

  win.setMenu(null);
  win.maximize();

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
      label: "Next",
      click: function() {
        win.webContents.executeJavaScript(`
						nextTrack();
				`);
      }
    },
    {
      label: "Play/Pause",
      click: function() {
        win.webContents.executeJavaScript(`
						togglePlaying();
				`);
      }
    },
    {
      label: "Previous",
      click: function() {
        win.webContents.executeJavaScript(`
						previousTrack();
				`);
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
      label: "Next",
      click: function() {
        win.webContents.executeJavaScript(`
						nextTrack();
				`);
      }
    },
    {
      label: "Play/Pause",
      click: function() {
        win.webContents.executeJavaScript(`
						togglePlaying();
				`);
      }
    },
    {
      label: "Previous",
      click: function() {
        win.webContents.executeJavaScript(`
						previousTrack();
				`);
      }
    }, {
      label: "Quit",
      click: function() {
        quitApp();
      }
    }
  ]);
  tray.setContextMenu(trayMenu);
}

function showWindow() {
  win.show();
  shownContextMenu();
  setProgressBar();
  setThumbarButtons(true);
}

function setThumbarButtons(play) {
  return win.setThumbarButtons([{
    tooltip: "Previous Song",
    icon: __dirname + "/images/previous.png",
    click() {
      win.webContents.executeJavaScript(`
					previousTrack();
			`);
    }
  }, {
    tooltip: play ? "Play" : "Pause",
    icon: play ? __dirname + "/images/play.png" : __dirname + "/images/pause.png",
    click() {
      win.webContents.executeJavaScript(`
					togglePlaying();
			`);
      songPaused = !play;
      setThumbarButtons(!play);
    }
  }, {
    tooltip: "Next Song",
    icon: __dirname + "/images/next.png",
    click() {
      win.webContents.executeJavaScript(`
					nextTrack();
			`);
    }
  }]);
}

function hideWindow() {
  win.hide();
  hiddenContextMenu();
}

function quitApp() {
  rpc.destroy();
  tray.destroy();
  app.exit(0);
}

app.on("ready", () => {
  createWindow();

  globalShortcut.register('CommandOrControl+Shift+Y', () => {
    if (win.isVisible()) {
      hideWindow();
    } else {
      showWindow();
    }
  });

  globalShortcut.register("MediaPreviousTrack", () => {
    win.webContents.executeJavaScript(`
      previousTrack();
    `);
  });
  globalShortcut.register("MediaPlayPause", () => {
    win.webContents.executeJavaScript(`
      togglePlaying();
    `);
  });
  globalShortcut.register("MediaStop", () => {
    win.webContents.executeJavaScript(`
      togglePlaying(false);
    `);
  });
  globalShortcut.register("MediaNextTrack", () => {
    win.webContents.executeJavaScript(`
      nextTrack();
    `);
  });


  win.on("focus", (e) => {
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      toggleDevTools();
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

  win.on("blur", (e) => {
    globalShortcut.unregister("CommandOrControl+Shift+I");
    globalShortcut.unregister("CommandOrControl+V");
  });
});


var devToolsOpen = false;

function toggleDevTools() {
  if (devToolsOpen && win.isFocused()) {
    win.webContents.closeDevTools();
    win.webContents.executeJavaScript(`
      document.querySelector("#webview").closeDevTools();
    `);
  } else if (win.isFocused()) {
    win.webContents.openDevTools();
    win.webContents.executeJavaScript(`
      document.querySelector("#webview").openDevTools();
    `);
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
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});
