/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import VerterConsole from './console';
import { escapeDouble } from './utils';
const vm = require('vm');

// to make sure packed version have such modules?

class HaltException extends Error {
	constructor(message) {
		super(message); // (1)
		this.message = message;
		this.name = 'HaltException';
	}
}
class QueueException extends Error {
	constructor(message) {
		super(message); // (1)
		this.name = 'QueueException';
	}
}

class AliskoSession {
    localContexts = [];
    constructor(processor, kernelName) {
        this.kernelName = kernelName;
        this.processor = processor;
				this._inProcess = false;
				this._commandInProcess = undefined;
				this._willBeRequeued = false;
				this._lastLoggedLineNum = -1;
				this._lastTrapTxt = '';

        // TBD placeholders for future mobile testing
        this.webModeEnabled = true;
        this.lastUsedMode = 'web';


				this._lastDialog = undefined;
				this._newDialog = this._newDialog.bind(this);
				this._dialogClosed = this._dialogClosed.bind(this);
				this._reEmitDialogEvent = this._reEmitDialogEvent.bind(this);

				this._lastPageOpened = undefined;
				this._reEmitContextNewPageEvent = this._reEmitContextNewPageEvent.bind(this);

				this._lastFileChooser = undefined;
				this._newFileChooser = this._newFileChooser.bind(this);
				this._reEmitFileChooserEvent = this._reEmitFileChooserEvent.bind(this);

				this._lastState = 'LOADING';
				this._refresh = this._refresh.bind(this);
				this.getRootFolder = this.getRootFolder.bind(this);
				this._insideCommand = false;
	}
	// PUBLIC FUNCTIONS: -----------------------------------------
	getRootFolder() {
		return this.processor._mainFolder;
	}
	// claim and require variables. IF variable not ready - wait antoer test to have it! ---------
	save(varName, varValue) {
	    this._logExecution('alisko.save', varName);
			this.processor.aliskoGlobals[varName] = varValue;
	}
	load(varName) {
	    this._logExecution('alisko.load', varName);
	    if (varName in this.processor.aliskoGlobals) {
				return this.processor.aliskoGlobals[varName];
			}
			// oops, lets wait when it will be ready?
			this.processor.reQueueKernel(this.kernelName, varName);
			this._willBeRequeued = true;
			throw new QueueException("Wait for variable:" + varName);
	}

	_eval(cmd) {
		eval(cmd);
	}


	async recognizeIcons(params) {
    this._logExecution('alisko.recognizeIcons', "");
    let iouThreshold = 0.5;
		let confidenceThreshold = 0.4;
		let maxBoxes = 200;
		let recognizerVersion = "0.9.5";
		let channels = 3;
		if (params) {
			if (params.iouThreshold) iouThreshold = params.iouThreshold;
			if (params.confidenceThreshold) confidenceThreshold = params.confidenceThreshold;
			if (params.recognizerVersion) recognizerVersion = params.recognizerVersion;
			if (params.maxBoxes) maxBoxes = params.maxBoxes;
			if (params.channels) channels = params.channels;
		}
		let options = {
			iouThreshold: iouThreshold,
			confidenceThreshold: confidenceThreshold,
			recognizerVersion: recognizerVersion,
			maxBoxes: maxBoxes,
			channels: channels,
		}
		let img = await this._getScreenshot();
		const blocks = await this.processor.recognizeIcons(img, options);

		// apply blocks into element attributes
		let page = this.vmContext.page;
		await page.evaluate( ({blocks}) => {
			for (let b of blocks) {
				let x = (b.x0 + b.x1 ) / 2;
				let y = (b.y0 + b.y1 ) / 2;
				let el = document.elementFromPoint(x,y);
				if (el) {
					el.setAttribute('_icon',' '+b.classname+' ');
				}
			}
        }, {blocks:blocks} );

	}

	// internal functions ----------------------------------------
    bindToContext(vmContext) {
        this.vmContext = vmContext;
    }
    browserProxy(browser) {
        // TBD make proxy-object
        const proxyHandler = new BrowserProxy(this);
        const result = new Proxy(browser, proxyHandler);
        return result;
    }

    getConsole() {
        this.console = new VerterConsole(this.processor, this.kernelName, this);
        return this.console;
    }

    async close() {
        // TBD close session created under browser proxy
        for (let ctx of this.localContexts) {
            try {
                await ctx.close();
            } catch(e) {
                // cant close?
								console.log('@context close fail?', e);
            }
        }
    }

    // helpers for predictor -----------------------
    _startCommand(commandCode, writeCode, writeLine=0,postEventJSON=undefined) {
        this._inProcess = true;
        this._commandInProcess = commandCode;
        this._commandToWrite = writeCode;
        this._lineToCommandToWrite = writeLine;
        this._commandFail = false;
        this._reEmitPageEventMode = false;
        this._reEmitDialogEventMode = false;
        this._reEmitFileChooserEventMode = false;
        this._willBeRequeued = false;
        this._lastLoggedLineNum = -1;
        this._postEventJSON = postEventJSON;
        // prepare for command halt
        let scope = this;
        this.halted = false;
        this.haltPromiseReject = undefined;
        this.haltPromiseResolve = undefined;
				this.haltPromise = new Promise((resolve, reject)=>{
					scope.haltPromiseReject = reject;
					scope.haltPromiseResolve = resolve;
				})//.catch((error) => {
				// console.log('@race catched ', error);
				//}); // do not resolve it here
				this.readyPromise = new Promise((resolve, reject)=>{
				    scope.readyPromiseResolve = resolve;
				});
				this.processor.changeKernelState(this.kernelName, {state:'running'});
				Error.stackTraceLimit = 500;
				this._insideCommand = false;
	}
	_stopCommand({ result, startresult }) {
		this._inProcess = false;
		let result1 = result;
		if (!result1) result1 = '';
		if (startresult) {
		    this.startresult = startresult;
		    if (startresult=='fail') {
		        result1 = 'fail';
		    }
		}
		if (this._willBeRequeued) result1 = 'inqueue';
		this.processor.changeKernelState(this.kernelName, {state:'ready', result:result1,reWriteIndex:true});
		if (typeof this.readyPromiseResolve == "function") this.readyPromiseResolve();
		//if (this.haltProiseReject) this.haltProiseReject();
	}
	// TBD https://www.matthewslipper.com/2019/09/22/everything-you-wanted-electron-child-process.html
	async halt() {
		this.halted = true; // for sync
		try { // for async
			this.haltPromiseReject(new HaltException('HALTED!')); // start promise to raise exception in that thread
		} catch (e) {
			console.log('@ while halt',e)
		}
	}
    async _writeCode() {
			if (!this._commandFail) {
				// console.log('@_writeCode', this._commandToWrite);
				this.processor.writeAliskoCode(this.kernelName, this._commandToWrite, this._lineToCommandToWrite);
				this._commandToWrite = "";
			} else {
				// console.log('@command fail, do not _writeCode');
			}
    }
    async _showError(e, otherFilename=undefined) {
        this.processor.showError(this.kernelName, e, otherFilename);
        if (e.name == 'QueueException') {
            // halt kernel immediatly if we wait for param to be declared TBD errors happens if tasks in playwright queue?
            await this.processor.stopKernel(this.kernelName);
        }

    }
    async _refresh(delay = 0) {
        if (delay == 0) { //imediatly
            await this.processor.recorderRefreshIfVisible(this.kernelName);
            // after refresh we should send postEvent if required
            if (this._postEventJSON) {
                this.processor.postEvent(this.kernelName, JSON.parse(this._postEventJSON));
            }
            this._postEventJSON = undefined;
        } else { // later
            setTimeout(this._refresh /*.bind(this)*/, delay);
        }
    }
    _pageDomcontentloaded = async()=>{
			this._refresh(500);
    }
    _getWaiterCode = async()=>{
        this._waiterCode = '';
        let {page, txt} = await this.processor.getPageText(this.kernelName);
        if (this._lastTrapTxt!='' && txt!='') {
            this._waiterCode = await this.processor.predictor.predictWaiterCode(page, this._lastTrapTxt, txt);
        }
        this._trapMode = true;
        this._lastTrapTxt = txt;
        return this._waiterCode;
    }

    async _nextLine(line) {
        this.processor.editorNextLine(this.kernelName, line);
    }
    async _getInfoState() {
        let webInfoState = {
            url: 'alisko://error',
        }
        try {
            webInfoState =  {
                url:  this.vmContext.page ?  await this.vmContext.page.url() : ''
            }
        } catch (e) { // internal usage function only
            console.log('@ error while _getInfoState', e);
			// this._showError(e);
        }
        return {
            webModeEnabled: this.webModeEnabled,
            lastUsedMode: this.lastUsedMode,
            webInfoState:  webInfoState,
        }
	}
    async _getScreenshot() {
		if (this._lastState != 'READY') return undefined; // cant make screenshot at dialog mode
        try {
            const buf = await this.vmContext.page.screenshot({
                // timeout: 0,
            })
            return buf;
        } catch (e) { // internal usage function only
            // this._showError(e);
            console.log('@ error in _getScreenshot..',e)
        }
        return undefined;
    }
	_setStateReady() {
		this._lastState = "READY";
		this._lastFileChooser = undefined;
	}

	// new dialog chain------------------------------------
	_newDialog(dlg) {
		if (this._reEmitDialogEventMode) return true;// reEmit should not change anything, its fake event
		// subst
		let oldAccept=dlg.accept.bind(dlg);
		let oldDismiss = dlg.dismiss.bind(dlg);
		dlg.accept = (promptText="")=>{
			this._dialogClosed();
			return oldAccept(promptText);
		};
		dlg.dismiss = ()=>{
			this._dialogClosed();
			return oldDismiss();
		};
	    // dont wait
		let needResolve = this._commandToWrite ? true : false;
	    // inform everyone
		this._commandToWrite = ""; // should not write command, if we are waiting for it right now
		this._lastDialog = dlg;
		this._lastState = "DIALOG";
		this.processor.recorderChangeState(this.kernelName, {
			state: this._lastState,
			type: dlg.type(),
			message: dlg.message(),
			commandInProcess: this._commandInProcess,
		});
		if (needResolve) {
		    setTimeout(this.myHaltPromiseResolve.bind(this), 100);
		}
		return true; // handled?!
	}
	myHaltPromiseResolve() {
	    this.haltPromiseResolve(true);
	}
	_dialogClosed() {
		this._lastDialog = undefined;
		this._lastState = "READY";
		this.processor.recorderChangeState(this.kernelName, {
			state: this._lastState,
		});
	}
	_reEmitDialogEvent(page) {
		if (this._lastDialog) {
			this._reEmitDialogEventMode = true;
			page.emit('dialog', this._lastDialog);
		}
	}

	// new filechooser chain -------
	_newFileChooser(filechooser) {
		if (this._reEmitFileChooserEventMode) return true;// reEmit should not change anything, its fake event
		// subst
		let oldSetFiles=filechooser.setFiles.bind(filechooser);
		filechooser.setFiles = async (files, options)=>{
			this._fileChooserClosed();
			// assume element is connected
			let e = filechooser.element();
			let page = filechooser.page();
			await page.evaluate( ({e})=>{
				if(!e.isConnected){ // force to bind element to DOM if it is not yet
					document.body.appendChild(e);
				}
			},{e});
			return oldSetFiles(files, options);
		};
		// inform everyone
		this._lastFileChooser = filechooser;
		this._lastState = "FILECHOOSER";
		this.processor.recorderChangeState(this.kernelName, {
			state: this._lastState,
			commandInProcess: this._commandInProcess,
		});
		this._refresh(700); // refresh on new page is slow! with delay
		return true; // handled?!
	}
	_fileChooserClosed() {
		this._lastFileChooser = undefined;
		this._lastState = "READY";
		this.processor.recorderChangeState(this.kernelName, {
			state: this._lastState,
		});
	}
	_reEmitFileChooserEvent(page) {
		if (this._lastFileChooser) {
			this._reEmitFileChooserEventMode = true;
			page.emit('filechooser', this._lastFileChooser);
		}
	}

	// new page chain -------
	_newPage(page) {
		if (this._reEmitPageEventMode) return true;

		// bind to new page
		page.on('dialog', this._newDialog);
		page.on('filechooser', this._newFileChooser);
		page.on('domcontentloaded', this._pageDomcontentloaded);

		//page.on('response', this._pageResponse);
		//page.on('requestfinished', this._pageRequestfinished);
		//page.on('load', this._pageLoad);


	    // set default page parametres. async, but these settings will be set before real actions proceed. But if we make this function async, new page dialog appears...
		page.setViewportSize({
		    width: this.processor.winWidth,
		    height: this.processor.winHeight,
		});
		page.setDefaultTimeout(this.processor.timeout);

		let oldWaitForEvent = page.waitForEvent.bind(page);
		page.waitForEvent = async(eventName, ...options1) => {
			if (eventName=='dialog') {
				setTimeout(this._reEmitDialogEvent.bind(this), 100, page);
			}
			if (eventName=='filechooser') {
				setTimeout(this._reEmitFileChooserEvent.bind(this), 100, page);
			}
			this._logExecution('waitForEvent', options1);
			// race for halt?!
			return Promise.race([  this.haltPromise, oldWaitForEvent(eventName,...options1) ]);
			// return oldWaitForEvent(eventName,...options1);
		};

		let oldBringToFront = page.bringToFront.bind(page);
		page.bringToFront = async(...options1) => {
			this._lastPageOpened = undefined;
			this._lastState = "READY";
			this._refresh(100);
			return oldBringToFront(...options1);
		};

		// ОБЕТКИ ОСНОВНЫХ ФУНКЦИЙ - для контроля процесса и возможности останова

		const PAGE_WAITFORSEL_FUNCTIONS = ["click","dblclick","tap","fill",
			"focus","hover","selectOption","type","press","check","uncheck",
		];
		for(let fk of PAGE_WAITFORSEL_FUNCTIONS) {
			let f0 = page[fk].bind(page);
			page[fk] = async (selector, ...options) => {
				this._logExecution(fk, [selector]);
				// wait for selector before action
				await Promise.race([ this.haltPromise, page.waitForSelector(selector) ]);
				if (this.halted) return;
				// race for halt?!
				return Promise.race([  this.haltPromise, f0(selector, ...options) ]);
			}
		}

		const PAGE_ASYNC_FUNCTIONS = [
			"$","$$","waitForSelector","dispatchEvent","evaluateHandle","$eval","$$eval","evaluate",
			"addScriptTag","addStyleTag","exposeFunction","exposeBinding","setExtraHTTPHeaders",
			"content","setContent",
			"goto","reload","goBack","goForward","close",
			"waitForLoadState","waitForNavigation","waitForRequest","waitForResponse",// "waitForEvent",
			"emulateMedia","setViewportSize",
			"addInitScript","route","unroute",
			"title","textContent","innerText","innerHTML","getAttribute", // "screenshot",
			"isChecked","isDisabled","isEditable","isEnabled","isHidden","isVisible",
			"setInputFiles", // or waitfor?
			"waitForTimeout","waitForFunction",
			// "pause", // TBD ? really halt exectuin?
		];
		for(let fk of PAGE_ASYNC_FUNCTIONS) {
			let f0 = page[fk].bind(page);
			page[fk] = async (...options) => {
				this._logExecution(fk, options);
				 // race for halt?!
				return Promise.race([  this.haltPromise, f0(...options) ]);
			}
		}

		const PAGE_ASYNC_FUNCTIONS_NORACE = [
			"screenshot",
		];
		for(let fk of PAGE_ASYNC_FUNCTIONS_NORACE) {
		    let f0 = page[fk].bind(page);
		    page[fk] = async (...options) => {
		        this._logExecution(fk, options);
		        return f0(...options); // race for halt?!
		    }
		}


		const PAGE_SYNC_FUNCTIONS = ["on","addListener","off","removeListener"];
		for(let fk of PAGE_SYNC_FUNCTIONS) {
			let f0 = page[fk].bind(page);
			page[fk] = (...options) => {
				if (this.halted) {
					throw new HaltException('HALTED!!'); // sunc halte before sync functions
				}
				this._logExecution(fk, options);
				return f0(...options);
			}
		}


		this._lastPageOpened = page;
		// special track new page event for visual recordings
		if (this._lastState == "LOADING") return true;
		this._lastState = "NEWPAGE";
		this._refresh(700); // refresh on new page is slow! with delay
		return true; // handled?!
	}
	_reEmitContextNewPageEvent(ctx) {
		if (this._lastPageOpened) {
			this._reEmitPageEventMode = true;
			ctx.emit('page', this._lastPageOpened);
		}
	}
	_logExecution(fnName, options) {
		let s = fnName;
		if (options.length>0 && typeof options[0] === 'string')  {
			s += '( ' + options[0] + ', ... )';
		} else {
			s += '( ... )';
		}
		// get line num
		let lineNum = -1, colnum = -1;
		let e = new Error("nothing");
		let stackLines = e.stack.split('\n');
		//for (let i = stackLines.length-1; i>=0; i--) { // linux? TBD
		for (let i = 1; i<stackLines.length; i++) {
			let ls = stackLines[i];
			let ii = ls.indexOf(this.kernelName);
		    if (ii>=0) {
		        let fn = ls.substring(ii);
				//lineNum = fn.split(':')[2]-1;
				//colnum = parseInt(fn.split(':')[3])-1;
				let splitlen = fn.split(':').length;
				lineNum = parseInt(fn.split(':')[splitlen-2])-1; // linux? TBD
				colnum = parseInt(fn.split(':')[splitlen-1])-1; // linux? TBD
				break;
			}
		}
		if (lineNum>=0) { // если не нашли - значит это вызвано откуда-то из наших технических мест!?
		    this._lastLoggedLineNum = lineNum;
			this.processor.logCommandInProcess(this.kernelName, s, lineNum, colnum);
		}
		// отработка beforeCommand события на любых функциях кроме console.log
		if (this._insideCommand==false && typeof this.vmContext["beforeCommand"] == "function" && fnName!="console.log") {
			try {
				let options = {
					filename: this.kernelName,
					lineOffset: lineNum, // TBD +1 -1 ?
					displayErrors: false, // true default?
				};
				let beforeCommandCode = 'alisko._insideCommand=true;\nbeforeCommand("'+escapeDouble(this.kernelName)+'",'+parseInt(lineNum)+');alisko._insideCommand=false;';
				vm.runInContext(beforeCommandCode, this.vmContext, options);
			} catch (e) {
				console.log('error in _logExecution',e)
				this.processor.logCommandInProcess(this.kernelName, 'Error in beforeCommand', lineNum, colnum);
			}
		}
	}
}

class BrowserProxy {
    constructor(alisko1) {
        this.alisko = alisko1;
    }
    get(obj, prop, receiver) {
        if (prop === "newContext") { // у нас хотят получить функцию, что вызвать ее, сука, ПОТОМ...
            return (async(...options1) => { // а мы им дадим СВОЮ функцию в качестве переменной, чтобы ее вызывали
                // когда ее таки вызовут - внутри мы сами вызовем оригинальную функцию!
                let ctx = await obj.newContext(...options1);
                this.alisko.localContexts.push(ctx); // to close later
                // довесим в ctx необходимые события
                ctx.on('page', this.alisko._newPage.bind(this.alisko));
								let oldWaitForEvent = ctx.waitForEvent.bind(ctx);
								ctx.waitForEvent = async(eventName, ...options1) => {
									if (eventName=="page") {
										setTimeout(this.alisko._reEmitContextNewPageEvent, 100, ctx); // почему obj а не this? this не работает???
									}
									//return oldWaitForEvent(eventName,...options1);
									this.alisko._logExecution('waitForEvent', options1);
									 // race for halt?!
									return Promise.race([  this.alisko.haltPromise, oldWaitForEvent(eventName,...options1) ]);
								};
                // и вернем прокси объект
                // return new Proxy(ctx, new ContextProxy(this.alisko));
								return ctx;
                //});
            }).bind(obj);
        }
        // return Reflect.get(...arguments);
        let value = obj[prop];
        return typeof value == 'function' ? value.bind(obj) : value;
    }
}

export default AliskoSession;

/*
class ContextProxy {
    constructor(alisko1) {
        this.alisko = alisko1;
    }
    get(obj, prop, receiver) {
		// обвязываем своими событиями новые странички
        if (prop === "newPage") {
            return (async(...options1) => {
                let page = await obj.newPage(...options1);
                // довесим в page необходимые события
				page.on('dialog', this.alisko._newDialog.bind(this.alisko));
				if (this.alisko._lastState != "LOADING") {
					this.alisko._lastState = "NEWPAGE";
				};
                return new Proxy(page, new PageProxy(this.alisko)); // и вернем прокси объект
                //});
            }).bind(obj);
        }

        let value = obj[prop];
        return typeof value == 'function' ? value.bind(obj) : value;
    }
}

class PageProxy {
    constructor(alisko1) {
        this.alisko = alisko1;
    }
    get(obj, prop, receiver) {
        // протоколировать ПОПЫТКИ получения каждой из функциональных команд согласно списку ()
        let monitored_props = ['click', 'goto'];
        if (monitored_props.includes(prop)) {
            return (async(...options1) => {
                let s = '@ ' + prop + ' ' + JSON.stringify(options1);
                this.alisko.console.log(s);
                let func = obj[prop].bind(obj);
                return func(...options1); // run really
            }).bind(obj);
        }
		if (prop == "waitForEvent") {
            return (async(eventName, ...options1) => {
				setTimeout(this.alisko._reEmitEvent.bind(this.alisko), 100, obj, eventName); // почему obj а не this? this не работает???
				return obj.waitForEvent(eventName,...options1);
            });
		}
        let value = obj[prop];
        return typeof value == 'function' ? value.bind(obj) : value;
    }
}
*/




/*

    set(obj, prop, value) {
        console.log('@@ setting property ',prop);
        obj[prop] = value;
        return true;
    }

*/
