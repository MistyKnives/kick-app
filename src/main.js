const { app, BrowserWindow, Tray, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let tray;

// Check for updates
function checkForUpdates() {
    // Configure update source
    autoUpdater.setFeedURL({
        provider: "github",
        owner: 'ipexadev',
        repo: 'kick-app',
        // For private repositories, you can use an access token
        // token: 'your-github-access-token'
    });

    // Check for updates
    autoUpdater.checkForUpdates();

    // Handle update found
    autoUpdater.on('update-available', () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Update available',
            message: 'A new update is available. Do you want to download and install it?',
            buttons: ['Yes', 'No']
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });

    // Handle update not available
    autoUpdater.on('update-not-available', () => {
        dialog.showMessageBox({
            title: 'No updates',
            icon: path.join(__dirname, '../assets/icons/app_icon.png'),
            message: 'You are running the latest version of the app.'
        });
    });

    // Handle update downloaded
    autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Update downloaded',
            icon: path.join(__dirname, '../assets/icons/app_icon.png'),
            message: 'The update has been downloaded. Restart the app to install the latest version.',
            buttons: ['Restart', 'Later']
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    // Handle update error
    autoUpdater.on('error', (err) => {
        dialog.showErrorBox('Update error', err.message);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
            nodeIntegration: true,
        },
        fullscreenable: true,
        title: 'Mollie Manager',
        closable: true,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../assets/icons/app_icon.png'),
    });

    mainWindow.loadURL('https://www.kick.com');

    // Emitted when the window is closed
    mainWindow.on('close', (event) => {
        if (app.isQuitting) {
            mainWindow = null;
        } else {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    tray = new Tray(path.join(__dirname, '../assets/icons/app_icon.png'));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show',
            click: () => {
                mainWindow.show();
            },
        },
        {
            label: 'Exit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.on('click', () => {
        mainWindow.show();
    });

    tray.setContextMenu(contextMenu);
}

app.on('ready', () => {
    createWindow();
    createTray();
    checkForUpdates(); // Call the update checker function
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
