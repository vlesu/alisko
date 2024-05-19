/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/

import { app, BrowserWindow, ipcMain, dialog, autoUpdater } from 'electron';

import { getLogFileNameOf, scanDirTree } from './verter/utils';
const fs = require('fs');
const path = require('path');
const util = require('util');
const arrayOfAPIFunctionsFs = Object.entries(fs);
const { shell } = require('electron');

let updateUrl = "https://alisko.vlesu.com/updates/"+process.platform;
console.log('Update url:', updateUrl);

class GUIHelper {

	constructor() {
	}

	reply(eventName, eventData) {
		if (this.mainWindow && !this.stop) {
			this.mainWindow.webContents.send(eventName, eventData);
		}
	}

	// bind processor to app events
	async bind(mainWindow, recorderWindow) {
		this.mainWindow = mainWindow;
		this.recorderWindow = recorderWindow;
		this.stop = false;

		ipcMain.handle('gui-request-change-folder', (event, code) => {
		    dialog.showOpenDialog({
				properties: ['openDirectory']
			}).then((result) => {
				if (!result.canceled && result.filePaths.length > 0) {
					let mainFolder =  result.filePaths[0];
					this.reply('gui-main-folder-changed', mainFolder);
				}
			})
		})

		ipcMain.handle('recorder-resizeme', (event, params) => {
			const {width, height} = params;
			this.recorderWindow.setContentSize(width, height);
		});

		// https://www.electronjs.org/docs/latest/tutorial/updates
		ipcMain.handle('update-required', (event, params) => {
			const dialogOpts1 = {
				type: 'info',
				buttons: ['Search for updates', 'Cancel'],
				title: 'Application Update',
				message: "Should we try to find recent updates?",
				detail:
					'If new version will be found andwill be downloaded in background, we will ask you about restart.'
			}
			dialog.showMessageBox(dialogOpts1).then((returnValue1) => {

				if (returnValue1.response === 0) {
					console.log('Check for update at channel:',updateUrl)
					autoUpdater.setFeedURL(updateUrl);
					autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
					  const dialogOpts = {
					    type: 'info',
					    buttons: ['Restart', 'Later'],
					    title: 'Application Update',
					    message: process.platform === 'win32' ? releaseNotes : releaseName,
					    detail:
					      'A new version has been downloaded. Restart the application to apply the updates.'
					  }
					  dialog.showMessageBox(dialogOpts).then((returnValue) => {
					    if (returnValue.response === 0) autoUpdater.quitAndInstall()
					  })
					})
					autoUpdater.checkForUpdates();
				}
				
			})
		});

		ipcMain.handle('get-version', (event, params) => {
			return app.getVersion();
		});

		ipcMain.handle('scanDirTree', (event, params) => {
			return scanDirTree(params);
		});

		ipcMain.handle('fsExistsSync', (event, params) => {
			return fs.existsSync(params);
		});

		ipcMain.handle('fs', (event, fullparams) => {
			// console.log('requiesting fs.',fullparams.funcname,' with params',fullparams.params, 'and callback',fullparams.callback)
			const indexOfAPIFunction = arrayOfAPIFunctionsFs.findIndex(x => x[0] == fullparams.funcname);
			const APIFunction = arrayOfAPIFunctionsFs[indexOfAPIFunction][1];
			if (fullparams.callback) { // async
				const APIFunctionPromise = util.promisify(APIFunction)
				return APIFunctionPromise(...fullparams.params);
			} else { // sync
				return APIFunction(...fullparams.params);
			}
		});

		ipcMain.handle('get-path-separator', (event, params) => {
			return path.sep;
		});

		ipcMain.handle('getLogFileNameOf', (event, params) => {
			return getLogFileNameOf(...params);
		});

		ipcMain.handle('openExternal', (event, command) => {
			return	shell.openExternal(command);
		});



	}
}

export { GUIHelper };
