const { app, BrowserWindow, Tray, Menu, dialog, net, session } = require(`electron`);
const { autoUpdater } = require(`electron-updater`);
const DiscordRPC = require(`discord-rpc`);
const path = require(`path`);

let mainWindow;
let tray;
let oldTitle;

const clientId = `1094344214864736398`;
DiscordRPC.register(clientId);
const rpc = new DiscordRPC.Client({ transport: `ipc` });

// Check for updates
function checkForUpdates() {
    // Configure update source
    autoUpdater.setFeedURL({
        provider: "github",
        owner: `ipexadev`,
        repo: `kick-app`,
        // For private repositories, you can use an access token
        // token: `your-github-access-token`
    });

    // Check for updates
    autoUpdater.checkForUpdates();

    // Handle update found
    autoUpdater.on(`update-available`, () => {
        dialog.showMessageBox({
            type: `info`,
            title: `Update available`,
            message: `A new update is available. Do you want to download and install it?`,
            buttons: [`Yes`, `No`]
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });

    // Handle update not available
    autoUpdater.on(`update-not-available`, () => {
        dialog.showMessageBox({
            title: `No updates`,
            icon: path.join(__dirname, `../assets/icons/app_icon.png`),
            message: `You are running the latest version of the app.`
        });
    });

    // Handle update downloaded
    autoUpdater.on(`update-downloaded`, () => {
        dialog.showMessageBox({
            type: `info`,
            title: `Update downloaded`,
            icon: path.join(__dirname, `../assets/icons/app_icon.png`),
            message: `The update has been downloaded. Restart the app to install the latest version.`,
            buttons: [`Restart`, `Later`]
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    // Handle update error
    autoUpdater.on(`error`, (err) => {
        dialog.showErrorBox(`Update error`, err.message);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        darkTheme: true,
        height: 600,
        show: true,
        webPreferences: {
            nodeIntegration: true,
        },
        fullscreenable: true,
        title: `Kick App`,
        closable: true,
        autoHideMenuBar: true,
        icon: path.join(__dirname, `../assets/icons/app_icon.png`),
    });

    mainWindow.loadURL(`https://www.kick.com`);

    // Emitted when the window is closed
    mainWindow.on(`close`, (event) => {
        if (app.isQuitting) {
            mainWindow = null;
        } else {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    const interceptedUsernames = new Set();

    /**
     * KickRPC Created By MistyKnives
     * https://github.com/MistyKnives/Kick-Discord-RPC for your own livestream RPC :)
     */
    mainWindow.on(`page-title-updated`, (event, title) => {
        const defaultSession = session.defaultSession;

        interceptedUsernames.clear();

        // Intercept the HTTP Requests
        defaultSession.webRequest.onBeforeRequest((details, callback) => {
            // Check if its a GET Request and URL starts with 'https://kick.com/api/v2/channels/'
            if (details.method === `GET` && details.url.startsWith(`https://kick.com/api/v2/channels/`)) {
                // Grab the username using regex '/channel/username'
                const usernameRegex = /\/channels\/([a-zA-Z]+)/;
                const match = details.url.match(usernameRegex);
                // If matches then continue
                if (match && match[1] && !/^\d+$/.test(match[1])) {
                    const username = match[1];
                    // Just add it to a Set so it only prints once, due to multiple requests being made that starts with that username
                    if (!interceptedUsernames.has(username)) {
                        interceptedUsernames.add(username);
                        // Grab from MistyKnives Kick API
                        const request = net.request(`https://mistyknives.co.uk/api/v1/channels/${username}`);
                        request.on(`response`, (response) => {
                            let data = ``;
                    
                            response.on(`data`, (chunk) => {
                                data += chunk;
                            });
                            
                            // Setup RPC
                            response.on(`end`, () => {
                                let json;
                                try {
                                    json = JSON.parse(data);
                                } catch (error) {
                                    console.error(`Error parsing JSON:`, error);
                                    return;
                                }
                                if (json.message !== null && typeof json.message === `string` && json.message.includes("not found in kick.com`s database")) return;
                                if(json.livestream === null) return;

                                const startTimestamp = new Date();

                                rpc.setActivity({
                                    details: json.livestream.session_title,
                                    state: json.livestream.categories[0].name,
                                    startTimestamp,
                                    largeImageKey: json.livestream.thumbnail.url,
                                    largeImageText: json.user.username,
                                    instance: false,
                                    buttons: [{ label: `Watch Here`, url: `https://kick.com/${username}` }],
                                });
                            });
                        });

                        request.on(`error`, (error) => {
                            console.error(`Error:`, error);
                        });
                    
                        request.end();
                    }
                }
            }
            callback({});
        });
    });
}

function createTray() {
    tray = new Tray(path.join(__dirname, `../assets/icons/app_icon.png`));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: `Show`,
            click: () => {
                mainWindow.show();
            },
        },
        {
            label: `Exit`,
            click: () => {
                app.isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.on(`click`, () => {
        mainWindow.show();
    });

    tray.setContextMenu(contextMenu);
}

app.on(`ready`, () => {
    createWindow();
    createTray();
    checkForUpdates(); // Call the update checker function
});

app.on(`activate`, () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

rpc.login({ clientId }).catch(console.error);