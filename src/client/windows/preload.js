/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


const { contextBridge, ipcRenderer } = require('electron/renderer')

/*
		if (fs.existsSync(mainFolder)) {
				this.changeMainFolder(mainFolder, false);
		}
		->
		window.electronAPI.fs('existsSync',[mainFolder]).then((ok)=>{
			if (ok) {
				this.changeMainFolder(mainFolder, false);
			}
		})

		path.join
		->
		window.electronAPI.join

		ipcRenderer.invoke
		->
		window.electronAPI.invoke

		ipcRenderer.on
		->
		window.electronAPI.on
*/

var separator = '?';
ipcRenderer.invoke('get-path-separator', {}).then((sep)=>{
	separator = sep;
})

contextBridge.exposeInMainWorld('electronAPI', {
  join: (...args)=>{return args.join(separator);},
	basename: (fname)=>{return fname.split(separator).pop();},
  fs: (funcname, paramsArr, callback=false)=>{
    if (callback instanceof Function) { // async
		  ipcRenderer.invoke('fs', {funcname: funcname, params: paramsArr, callback: true}).then(callback);
		} else { //sync
		  return ipcRenderer.invoke('fs', {funcname: funcname, params: paramsArr, callback: false});
		}
  },
	openExternal: (command) => ipcRenderer.invoke('openExternal', command),

  // TBD secutity isolation required https://www.electronjs.org/docs/latest/tutorial/ipc
  invoke:  (eventName, params={}) => ipcRenderer.invoke(eventName, params),
  emit:  (eventName, params={}) => ipcRenderer.emit(eventName, params),
	on: (eventName, callback) => {
		//if (eventName.startsWith('vsplit')) {console.log('on',eventName, callback)}
		ipcRenderer.on(eventName, callback);
		return () => {
        ipcRenderer.removeListener(eventName, callback);
    };
	},
})
