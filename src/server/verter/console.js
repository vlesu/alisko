/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


class VerterConsole {
	constructor(processor, kernelName, alisko) {
		this._processor = processor;
		this._kernelName = kernelName;
		this._alisko = alisko;
	}

	log(...options) {
		// TBD multi-args ?
	    // TBD serialize what is possibe, and omit all other..
        this._alisko._logExecution("console.log", ["..."]);
		let msg;
		try {
			msg = JSON.stringify(options);
		} catch (e) {
			msg = '(message arrived but can not be seralized)'
		}
		this._processor.logRunToClient(this._kernelName, msg)
	}
	error(e) {
		let msg;
		this._alisko._logExecution("console.error", ["..."]);
	    try {
			msg = JSON.stringify(e);
		} catch (ee) {
			msg = '(message arrived but can not be seralized)'
		}
		this._processor.logRunToClient(this._kernelName, msg)
	}
}


export default VerterConsole;