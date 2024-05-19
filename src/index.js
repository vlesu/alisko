/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/

import { app, BrowserWindow, ipcMain, screen, session   } from 'electron';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const isDev = !app.isPackaged; // require('electron-is-dev');

process.on('uncaughtException', function (error) {
    console.log('@main process uncought exception',error)
})

import { Processor } from './server/processor';
import { GUIHelper } from './server/guihelper';


// bing events
const processor = new Processor();
const guihelper = new GUIHelper();


const createWindow = () => {

    // get displays and pos
    const displays = screen.getAllDisplays();
    const padding = 10;
    const framedelta_pix = 5;
    const mainwindow_w = 1200;
    let recorder_x = mainwindow_w + 2 * padding;
    let recorder_y = padding + framedelta_pix;
    if (displays.length>1) { // multi-display system
        const a = displays[1].workArea;
        recorder_x = a.x + padding;
        recorder_y = a.y + padding;
    }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 800,
    width: mainwindow_w,
    icon: './resources/app/icons/favicon4.ico', // https://www.electronforge.io/guides/create-and-add-icons
    minWidth: 800,
    minHeight: 400,
    x:padding,y:padding, // pos = top left corner of primary display
    autoHideMenuBar: true,
    /// icon: https://www.electronjs.org/docs/api/native-image
    webPreferences: {
      //nodeIntegration: true,
      //enableRemoteModule: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      //webSecurity: false,
      // devTools: false,
    }
  });
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  if (!isDev) {
    mainWindow.removeMenu();
  } else {
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  }

  const recorderWindow = new BrowserWindow({
    height: 1200,
    width: 1200,
    icon: './resources/app/icons/favicon4.ico',
    x:recorder_x,y:recorder_y,
    useContentSize: true,
    autoHideMenuBar: true,
    resizable: false, fullscreenable: false,
    show: false,
    webPreferences: {
      //nodeIntegration: true,
      preload: RECORDER_WINDOW_PRELOAD_WEBPACK_ENTRY,
        // devTools: false,
    }
  });
  recorderWindow.loadURL(RECORDER_WINDOW_WEBPACK_ENTRY);
  //recorderWindow.removeMenu();
  if (!isDev) {
    recorderWindow.removeMenu();
  } else {
    // Open the DevTools.
    recorderWindow.webContents.openDevTools();
  }

  mainWindow.on('close', (event) => {
    if (processor.stop) return; /// really close
    event.preventDefault();
    mainWindow.webContents.send('app-close-request');
  });
  ipcMain.handle('app-closed', (event, code) => {
    processor.stop = true;
    guihelper.stop = true;
    try {
      processor.stopAllFinally();
      recorderWindow.hide();
      recorderWindow.close();
    } catch (e) {};
    mainWindow.close();
  });
  mainWindow.on('closed', () => {
      app.quit();
  });
  processor.bind(mainWindow, recorderWindow);
  guihelper.bind(mainWindow, recorderWindow);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
