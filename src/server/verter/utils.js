/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


const fs = require('fs');
const path = require('path');

function scanDirTree(root) {
	if ( ! fs.existsSync(root) ) {
		return false;
	}
	let folderArray = [], fileArray = [];
	if (root && fs.existsSync(root)) {
		let dirs = fs.readdirSync(root)
		dirs = dirs.sort((a, b) => { // underscores first
			if ( a.startsWith("_") && ! b.startsWith("_") ) return -1;
			if ( b.startsWith("_") && ! a.startsWith("_") ) return 1;
			return a>b ? 1 : ( a<b ? -1 : 0);
		});
		dirs.forEach((file) => {
			let fn = path.join(root, file);
			let stat = fs.statSync(fn);
			let o = {
				id: fn,
				path: fn,
				name: path.basename(fn),
			};
			if (stat.isDirectory()) {
				let oo = scanDirTree(fn);
				if (oo.length > 0) {
					o.children = oo;
				}
				o.eltype = 'dir';
				folderArray.push(o);
			} else {
				o.eltype = 'file';
				fileArray.push(o);
			}
		});
		return folderArray.concat(fileArray);
	}
	return [];
}



function escapeDouble(s) {
	s = s ? (""+s).trim() : ""
    return s.replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('\n','\\n').replaceAll('\r','\\r');
}
function escapeSingle(s) {
	s = s ? (""+s).trim() : ""
    return s.replaceAll('\\','\\\\').replaceAll("'","\\'").replaceAll('\n','\\n').replaceAll('\r','\\r');
}

function getLogFileNameOf(kernelName,mainFolder) {
    let internalName = kernelName.substring(mainFolder.length+1).replace("/","_").replace("\\","_").replace("_test.js","");
    let logDir = path.join(mainFolder, "_reports");
    internalName = path.join(logDir, internalName + ".htm");
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }
    return internalName;
}

const NONNONNONEXISTENT = "NONNONNONEXISTENT";

function normalizeText(s, brokeText=undefined) {
    if (!s) return NONNONNONEXISTENT; // typeof s !== "string"
    s = s.trim();
    s = s.split('\n')[0];
    s = s.split('"')[0]; // TBD можно попробовать искать внутри кавычек, это тоже кандидаты?
    s = s.split("'")[0];
    if (brokeText) s = s.split(brokeText)[0];
    s = s.trim();
    if (s=="") return NONNONNONEXISTENT;
    return s;
}


export { escapeDouble, escapeSingle, normalizeText, NONNONNONEXISTENT, getLogFileNameOf, scanDirTree };
