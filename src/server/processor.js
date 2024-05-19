/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/

import { app, ipcMain } from 'electron';


const path = require('path');
const fs = require('fs');
let browers_path = "./resources/browsers";
if (!fs.existsSync(browers_path)) {
	browers_path = path.resolve(app.getAppPath(), '../../resources/browsers');
}
if (!fs.existsSync(browers_path)) {
    console.log('Browser path not found!')
}
browers_path = path.resolve(browers_path);
process.env['PLAYWRIGHT_BROWSERS_PATH'] = browers_path;
console.log('Browsers path:', process.env['PLAYWRIGHT_BROWSERS_PATH']);

const playwright = require('playwright');

const vm = require('vm');


import AliskoSession from './verter/AliskoSession';


// import Actor from './verter/actor';
import Predictor from './verter/predictor';

import IconRecognizer from './verter/recognizer';

import MailCatcherApi from './verter/MailCatcherApi';
//const cpus = require('os').cpus().length;
import { escapeDouble, getLogFileNameOf } from './verter/utils';
import {encode} from 'html-entities';

const MAX_RUNNING_KERNELS = 2;
const FAKE_NONEMPTY_COMMAND = "//";

class Processor {

	// named environments for every kernel possible to start using in promices
	kernels = {};
	results = {};
	aliskoGlobals = {};
	browserHeadless = undefined;
	browserHead = undefined;
	activeKernelName = 'unknown';
	runAllMode = false;
    _jobQueue = [];

    headless = 1;
    winHeight = 1200;
    winWidth = 1200;
	timeout = 15000;
	threads = 2;

	constructor() {
		this.predictor = new Predictor();
		this.iconRecognizer = new IconRecognizer();
	}

	// bind processor to app events
	async bind(mainWindow, recorderWindow) {
		this.mainWindow = mainWindow;
		this.recorderWindow = recorderWindow;
		this.stop = false;
		this.runningNow = 0;

		// вывести строку в лог на стороне сервера, т.е. в cmd окно
		ipcMain.handle('log', (event, s) => {
			console.log('log', s);
		})

		// ИНИЦИАЛИЗАЦИЯ клиента
		// по запросу клиента отправляем сообщение с данными инициализации от electron app которая напрямую клиенту недоступна
		ipcMain.handle('request-initialize', (event, code) => {
			let options = {
				'userDataPath': app.getPath('userData'),
			}
			this.mainWindow.webContents.send('response-initialize', options);
			this.stopAllKernels();
		})

		ipcMain.handle('run-code', this.runCode.bind(this));
		ipcMain.handle('halt-code', this.haltCode.bind(this));
		ipcMain.handle('kernel-stop', this.stopKernelEvent.bind(this));
		ipcMain.handle('active-kernel-changed', this.activeKernelChanged.bind(this));
		ipcMain.handle('recorder-refresh', this.recorderRefresh.bind(this));
		ipcMain.handle('gui-toggle-recorder-visibility',  this.toggleRecorderVisibility.bind(this));
		ipcMain.handle('predictor-command', this.predictorCommand.bind(this));
		ipcMain.handle('predictor-hilite', this.predictorHilite.bind(this));
		ipcMain.handle('predictor-scroll', this.predictorScroll.bind(this));
		ipcMain.handle('main-folder-really-changed', this.mainFolderChanged.bind(this));
		ipcMain.handle('processor-runall', this.runAll.bind(this));
		ipcMain.handle('processor-stopall', this.stopAll.bind(this));
		ipcMain.handle('processor-clearall', this.clearAll.bind(this));
		ipcMain.handle('settings-changed', this.settingsChanged.bind(this));



		this.recorderWindow.on('close', this.closeRecorderWindow.bind(this));

		this.writeAliskoCode = this.writeAliskoCode.bind(this);
		this.recorderRefreshIfVisible = this.recorderRefreshIfVisible.bind(this);

		// подготовим браузер
		if (this.browserHead) {
		    this.browserHead.close();
		}
		if (this.browserHeadless) {
		    this.browserHeadless.close();
		}

		setInterval(this.startNextFromQueue.bind(this), 500); // 1 sec run new thread
	}
	mainFolderChanged(event, param) {
		this._mainFolder = param;
		this.recorderWindow.webContents.send('change-main-folder-recorder', this._mainFolder);
	}
	settingsChanged(event, options) {
	    this.headless = options.settings_headless > 0 ? 1 : 0;
	    this.winHeight = parseInt(options.settings_winHeight);
	    this.winWidth = parseInt(options.settings_winWidth);
		this.timeout = parseInt(options.settings_timeout);
		this.threads = parseInt(options.settings_threads);
	}
	async getBrowser() {
	    const browserType = 'chromium';
	    if (this.headless > 0) {
	        if (!this.browserHeadless) {
	            this.browserHeadless = await playwright[browserType].launch({
	                headless:true,
	            }); // await ?
	        }
	        return this.browserHeadless;
	    } else {
	        if (!this.browserHead) {
	            this.browserHead = await playwright[browserType].launch({
	                headless:false,
	            }); // await ?
	        }
	        return this.browserHead;
	    }
	}


	// run all files -------------------------
	async runAll(event, param) {
		// prepare list of files
		this._jobQueue = [];
		await this.scanToQueue(this._mainFolder);
		// lets go on!
		this.runAllMode = true;
		// this.startNextFromQueue();
	}
	async stopAll(event, param) {
		console.log('@ STOP ALL queue');
		this.runAllMode = false;
	}
	async clearAll(event, param) {
		await this.stopAll();
		await this.stopAllKernels();
		this.results = {};
		this.aliskoGlobals = {};
		// clean up folder
		fs.rmdir(path.join(this._mainFolder, "_reports"), {recursive:true}, ()=>{});
	}
	scanToQueue(root) {
		if (root && fs.existsSync(root)) {
			let files = fs.readdirSync(root).sort();
			files.forEach((file) => {
				let fn = path.join(root, file);
				let stat = fs.statSync(fn);
				let o = {
					id: fn,
					name: path.basename(fn),
				};
				if (stat.isDirectory()) {
					this.scanToQueue(fn);
				} else { // file
					if (fn.toLowerCase().endsWith("_test.js")) {
						this.addToQueue(fn);
					}
				}
			})
		}
	}
	addToQueue(fileName) {
		if (fileName in this.kernels && this.kernels[fileName].alisko._inProcess) return; // already runned right now
		if (fileName in this.results && this.results[fileName].result == 'pass') return; // already finished
		// lets add file to queue
		this._jobQueue.push({
			fileName: fileName,
			requirements: []
		})
	}
	getFromQueue() {
		for(let i = 0; i < this._jobQueue.length; i++) {
			let q = this._jobQueue[i];
			let ok = true;
			for(let r of q.requirements) {
				if (!(r in this.aliskoGlobals)) {
					ok = false;
				}
			}
			if (ok) {
				this._jobQueue.splice(i, 1);
				return q;
			}
		}
	}
	async startNextFromQueue() {
		if (this.stop) return;
		if (!this.runAllMode) return;
		if (this.canRunMoreRunners() && this._jobQueue.length>0) {
			let q = this.getFromQueue();
			if (!q) {  // cant find something right now
                // if nothing changed, maybe stop auto-run mode?
			    if (this.runningNow == 0) {
			        this.sendToClient("task-queue-empty-or-disabled", {});
			    }
			    return;
			};
			// run file
			let code = fs.readFileSync(q.fileName, 'utf8');
			let param = {
				kernelName: q.fileName,
				requirements: q.requirements,
				lineNum: 0,
				endLineNum: code.split(/\n/).length, // count lines
				restart: true,
				code: code
			}
			await this.runCode(undefined, param);
		}
		if (this._jobQueue.length==0 && this.runningNow == 0) {
		    this.runAllMode = false;
		    this.sendToClient("task-queue-empty-or-disabled", {});
		}
	}
	canRunMoreRunners() {
		// find how much kernels is running now
		let runningNow = 0;
		for (const kernelName in this.kernels) {
			if (this.kernels[kernelName].alisko._inProcess) {
				runningNow+=1;
			}
		}
		this.runningNow = runningNow;
		return runningNow < this.threads;
	}
	reQueueKernel(kernelName, newRequirement) {
		let requirements = this.kernels[kernelName].requirements;
		requirements.push(newRequirement);
		this._jobQueue.unshift({
			fileName: kernelName,
			requirements: requirements
		})
	}




	// run code  ----------------------------------------------------------------
	async runCode(event, param) {
		const { kernelName, code, lineNum, endLineNum, restart, requirements } = param;
		let additionalOk = "";
		let additionalFail = "";
		let additionalBroken = {};
		if (kernelName in this.kernels && this.kernels[kernelName].alisko.startresult == 'fail') {
		    await this.stopKernel(kernelName);
		}
		if (restart) {
			await this.stopKernel(kernelName);
			additionalOk += "result:'pass',";
			additionalFail += "result:'fail',";
			additionalBroken['result'] = 'fail';
		}
		await this.ensureKernelStarted(kernelName);
		if (this.kernels[kernelName].alisko.startresult == 'fail') {
		    return; // SORRY kernel start fail
		}
		if (this.kernels[kernelName].alisko._inProcess) {
			return; // SORRY ready in process
		}
		if (requirements) {
			this.kernels[kernelName].requirements = requirements;
		}
		let options = {
			filename: kernelName,
			lineOffset: lineNum, // TBD +1 -1 ?
			displayErrors: false, // true default?
			// importModuleDynamically : importModuleFunction to overload in context?
		};
		this.logRunToClient(kernelName,  code, 'command');
		let finishedCommandCode = 'alisko._startCommand(); alisko._lastTrapTxt = ""; ( async () => {\n'
				+ code +
				'\n} ) ().then('+
					'()=>{alisko._stopCommand({'+additionalOk+'});alisko._refresh();alisko._nextLine('+endLineNum+')},'+
					'(e)=>{alisko._stopCommand({'+additionalFail+'});alisko._showError(e)}'+
					')';
		try {
			vm.runInContext(finishedCommandCode, this.kernels[kernelName].vmContext, options);
		} catch (e) {
			this.kernels[kernelName].alisko._stopCommand(additionalBroken);
			this.showError(kernelName, e);
		}
	}
	async haltCode(event, param) {
		const { kernelName } = param;
		if (kernelName in this.kernels) {
			this.kernels[kernelName].alisko.halt();
		}
	}

	async changeKernelState(kernelName, params) {
		this.sendToClient('kernel-state-changed', {kernelName, params});
		this.results[kernelName] = params;
		// TBD should we close kernel if it is green?
		// this.startNextFromQueue(); // if required.
		if (params.reWriteIndex) this.reWriteIndex();
	}
	async editorNextLine(kernelName, line) {
		this.sendToClient('editor-newline+'+kernelName, {kernelName:kernelName, line:line});
	}
	showError(kernelName,e,otherFilename=undefined) {
    console.log('@', kernelName, ',exception:', e);
    if (!otherFilename) {
        otherFilename = kernelName;
    }
		let stackLines = ( e.message + '\n' + e.stack ).split('\n');
		let stackInfo = otherFilename;
		let lineNum = -1;
		let colnum = 0;
		for (let i = 1; i<stackLines.length; i++) {
		    let ls = stackLines[i];
		    let ii = ls.indexOf(otherFilename);
		    if (ii>=0) {
		        let fn = ls.substring(ii);
				let splitlen = fn.split(':').length;
				lineNum = parseInt(fn.split(':')[splitlen-2])-1; // linux? TBD
				colnum = parseInt(fn.split(':')[splitlen-1])-1; // linux? TBD
		        //lineNum = fn.split(':')[2]-1;
		        //colnum = parseInt(fn.split(':')[3])-1;
		        stackInfo = fn.split(':')[1];
		        break;
		    }
		}
		if (isNaN(colnum)) colnum=0;
		if (lineNum<0 && kernelName in this.kernels && otherFilename==kernelName) { // if not found - lets subst last logged in string?
		    lineNum = this.kernels[kernelName].alisko._lastLoggedLineNum;
		}
        let s = 'ERROR: ' + e.name + ': ' + e.message + ' at ' + stackInfo + ':' + lineNum + ':' + colnum;
		let options = {
			kernelName: kernelName,
			msg: s,
			line: lineNum,
			column: colnum,
			inprocess: true,
			styleName: 'error',
		}
		this.sendToClient('editor-runtime-error+'+kernelName, options);
		this.sendToClient('run-log', options);
	    // TBD write log
		this.logToFile(kernelName, s, 'error');
        // make screenshot and write it to file log?
	}


	// предсказатель команд -----------------------------------
	async predictorCommand(event, params)  {
		// console.log('@predictorCommand arrived:',params)
    const { command, param, exactCommand, needWriteCode } = params;
		let exactCommand1 = exactCommand;
		await this.ensureKernelStarted(this.activeKernelName);
		if (this.kernels[this.activeKernelName].alisko._inProcess) {
			console.log('@kernel in progress, fail silently',params)
			return; // SORRY  in process
		}
		const alisko = this.kernels[this.activeKernelName].alisko;
		if (!exactCommand1) { // if we do not know exact  command yet, then decode it
			exactCommand1 = await this.predictor.predictCommand({
				kernel: this.kernels[this.activeKernelName],
				command: command,
				param: param
			});
		}
		let { commandCode, writeableCode, writebaleLine, commandVariants, commandSecondStage, trapMode } = exactCommand1;
		if (commandVariants) {
			this.recorderWindow.webContents.send('predictor-command-variants', commandVariants);
			return;
		}
		if (commandSecondStage) {
		    this.recorderWindow.webContents.send(commandSecondStage.eventName, commandSecondStage.options);
		    return;
		}
		if (writeableCode===undefined) writeableCode=commandCode;
		if (writebaleLine===undefined) writebaleLine=0;
		let postEventCode='';
		if (exactCommand1.postEvent) {
		    postEventCode=',"'+escapeDouble(JSON.stringify(exactCommand1.postEvent))+'"';
		}
		if (trapMode) { // две trap команды подряд: между ними ставим waitFor если определился
		    let waiterCode = await alisko._getWaiterCode();
		    writeableCode = waiterCode + writeableCode;
		} else { // если не trap команда - то пусть перестаем отслеживать текст
		    alisko._lastTrapTxt = '';
		}
		if (!needWriteCode) {
		    writeableCode = FAKE_NONEMPTY_COMMAND ; // fake non-empty command which we will not write
		}
		if (commandCode) {
		    let finishedCommandCode = 'alisko._startCommand("'+escapeDouble(commandCode)+'","'+escapeDouble(writeableCode)+'",'+writebaleLine+postEventCode+'); ( async () => {'
					+ commandCode +
					'\n} ) ().then( '+
						'()=>{alisko._stopCommand({});alisko._writeCode();alisko._commandInProcess = undefined; alisko._refresh(100)},'+
						'(e)=>{alisko._stopCommand({});}'+ // TBD what we will do with errors with our generated commands? "'+escapeDouble(writeableCode)+'"
						')';
				// пробный запуск, если пройдет без ошибок - запишем эту команду
				//console.log('@runInContext: finishedCommandCode=',finishedCommandCode)
				try {
				    vm.runInContext(finishedCommandCode, this.kernels[this.activeKernelName].vmContext, {displayErrors: false});
				} catch (e) {
					this.kernels[this.activeKernelName].alisko._inProcess = false;
					this.showError(this.activeKernelName, e);
				}
		} else { // no command code to run
			this.recorderRefresh();
		}
	}
	postEvent(kernelName, postEventData) {
	    this.recorderWindow.webContents.send(postEventData.eventName, postEventData.options);
	}
	async writeAliskoCode(kernelName, code, lineDelta) {
		  // console.log('@writeAliskoCode', code)
	    if ( code == FAKE_NONEMPTY_COMMAND ) return;
			this.sendToClient('recorder-add-code-line+'+kernelName, {kernelName:kernelName, code:code, lineDelta: lineDelta,});
	}
	async getPageText(kernelName) {
	    if (kernelName in this.kernels) {
	        try {
	            const {vmContext, alisko} = this.kernels[this.activeKernelName];
	            const {page} = vmContext;
	            const txt = await page.innerText('css=html'); // text of root element
	            return {page: page, txt:txt};
	        } catch (e) {
	            console.log('@ get page text error',e);
	            // this.showError(this.activeKernelName, e);
	        }
	    }
	    return {};
	}

	// подсветка элемента, с которым будем работать
	async predictorHilite(event, params) {
		const { command, param } = params;
		if (this.activeKernelName in this.kernels) {
			let reply = await this.predictor.hilitePosition({
				kernel: this.kernels[this.activeKernelName],
				command: command,
				param: param
			});
			this.recorderWindow.webContents.send('predictor-hilited', reply);
		} else {
			this.recorderWindow.webContents.send('predictor-hilited', {found:false});
		}
	}

	async predictorScroll(event, params) {
		const {x,y,d} = params;
		if (this.activeKernelName in this.kernels) {
			try {
				const {vmContext, alisko} = this.kernels[this.activeKernelName];
            	const {page} = vmContext;
				await page.evaluate( ({d}) => {
					window.scrollBy( 0, d );
				}, {d:d});
				alisko._refresh(50); // async
			} catch (e) {
				console.log('@ scroll error',e);
				// this.showError(this.activeKernelName, e);
			}
		}
	}

	async recognizeIcons(img, options) {
		return this.iconRecognizer.recognize(img, options);
	}

	// events -----------------------------------------------------------
	activeKernelChanged(event, param) {
		const { kernelName } = param;
		this.activeKernelName = kernelName;
		this.recorderWindow.webContents.send('active-tab-changed-for-recorder', {
			kernelName: kernelName,
			runnable: kernelName.endsWith("_test.js"),
		});
		if (this.recorderVisible) {
			this.recorderRefresh();
		}
	}
	async recorderRefresh() {
	    if (this.stop) return;
		this.recorderWindow.webContents.send('screen-will-be-refreshed', {});
		if (this.activeKernelName in this.kernels) {
			let options =  await this.kernels[this.activeKernelName].alisko._getInfoState();
			options['active'] = true;
			options['state'] = this.kernels[this.activeKernelName].alisko._lastState;
			options['img'] = await this.kernels[this.activeKernelName].alisko._getScreenshot();
			await this.recorderWindow.webContents.send('screen-refreshed', options);
		} else { // this kernel inactive
			this.recorderWindow.webContents.send('screen-refreshed', {active:false});
		};
	}
	async recorderRefreshIfVisible(kernelName) {
		if (this.activeKernelName == kernelName && this.recorderVisible) {
			await this.recorderRefresh();
		}
	}
	async recorderChangeState(kernelName, options) {
		this.recorderWindow.webContents.send('recorder-changestate', options);
	}


	// отслеживание видимости окна recorder -------------------------------------------------
	// Emitted when the recorder window is closed.
	closeRecorderWindow(event) {
		if (this.stop) return;
		//win = null
		event.preventDefault();
		this.recorderWindow.hide();
		this.recorderVisible = false;
		this.sendToClient('gui-recorder-window-closed', {});
	}
	toggleRecorderVisibility (event, params)  {
		const { recorderVisible } = params;
		if (recorderVisible) {
			this.recorderWindow.show();
		} else {
			this.recorderWindow.hide();
		}
		this.recorderVisible = recorderVisible;
		if (this.recorderVisible) {
			this.recorderRefresh();
		}
	}

	// logging ----------------------------------------------------------------
	sendToClient(eventName, options) {
		if (this.mainWindow && !this.stop) {
			this.mainWindow.webContents.send(eventName, options);
		}
	}
	logRunToClient(kernelName, msg, outFormat='output') {
		let options = {
			kernelName: kernelName,
			msg: msg,
			styleName: outFormat,
		}
		this.sendToClient('run-log', options);
	    // TBD write log
		this.logToFile(kernelName, msg, outFormat);

	}
	logCommandInProcess(kernelName, commandSignature, lineNum, colnum) {
	    let msg =  'line:'+lineNum+' @ ' + commandSignature
		let options = {
			kernelName: kernelName,
			msg: msg,
			line: lineNum,
			column: colnum,
			inprocess: true,
			styleName: 'commandInprocess',
		}
		this.sendToClient('run-log', options);
	    // TBD write log
		this.logToFile(kernelName, msg, 'commandInprocess');
    }
	getLogFileNameFor(kernelName) {
		let internalName = getLogFileNameOf(kernelName, this._mainFolder);
	    return internalName;
	}
	logToFile(kernelName, msg, style) {
	    // style can be command, error or output TBD
		let logFileName = this.getLogFileNameFor(kernelName);
		let s = encode(msg.trim());
	    fs.appendFile(logFileName, "<div class='"+style+"'>" + s + "</div>\n\n", ()=>{});
	    // colorize and escape TBD !!!
	    // err control TBD
	    // reuse file handle TBD
	}
	getLogHeader() {
		let s = `<style>
			.command {
				padding: 5px;
				font-weight: bold;
				white-space: pre-wrap;
				background-color: #ccc;
				margin-top: 20px;
			}
			.commandInprocess {
				padding: 5px;
				font-weight: bold;
				background-color: #cfc;
			}
			.error {
				padding: 5px;
				background-color: #fcc;
			}
			.output {
				padding: 5px;
				white-space: pre-wrap;
			}
			.info {
				padding: 5px;
			}
		</style>

		`;
		let d = new Date();
		let ds = d.toString();
		s += "<div class='info'>"+ds+"</div>";
		return s;
	}
	async reWriteIndex() {
		let s1 = `<style>
			.state_pass {
				background-color: #cfc;
				padding: 5px;
			}
			.state_fail {
				background-color: #fcc;
				padding: 5px;
			}
			.state_inprocess {
				background-color: #eee;
				padding: 5px;
			}
		</style>
		`;
		let kernls = [];
		for (const kernelName of Object.keys(this.results)) {
			kernls.push(kernelName);
		};
		kernls.sort();
		for (const kernelName of kernls) {
			const r = this.results[kernelName];
			const childName = path.basename( this.getLogFileNameFor( kernelName ) );
			const withFolderName = kernelName.substring(this._mainFolder.length + 1);
			let s = "<div class='state_"+ r.result+"'><a href='"+childName+"'>" + withFolderName + ' : ' + r.result + "</a></div>\n";
			s1 += s;
		}
		let logIndex = this.getLogFileNameFor( path.join( this._mainFolder, "_index" ) );
		fs.writeFileSync(logIndex, s1, "utf8");
	}


	// start stop kernels ------------------------------------------------------
	async startKernel(kernelName) {
		// create new context
		let alisko1 = new AliskoSession(this, kernelName);
		let console1 = alisko1.getConsole();
		let browser1 = alisko1.browserProxy(await this.getBrowser());
		let context1 = await browser1.newContext();
		let page1 = await context1.newPage();
		let mailcatcher1 = new MailCatcherApi(alisko1);
		alisko1._setStateReady();
		await page1.bringToFront();
		let defaultContext = {
			console: console1,
			alisko: alisko1,
			browser: browser1,
			context: context1,
			page: page1,
			// I: actor,
			mailcatcher: mailcatcher1,
			// TBD only for debug
			// playwright: playwright, // TBD
		};
		vm.createContext(defaultContext);
		alisko1.bindToContext(defaultContext);
		this.kernels[kernelName] = {
			vmContext: defaultContext,
			alisko: alisko1,
			requirements: [],
			// console: console1,
			// actor: actor,
		};
		this.sendToClient('kernel-started', { kernelName: kernelName });
	    // create log file
		let logFileName = this.getLogFileNameFor(kernelName);
		fs.writeFileSync(logFileName, this.getLogHeader(),"utf8"); // clean up the log

		// initialize 'require' func
		let codeInit = `((require1) => {
			require = require1;
		})`;
		let options = {
			filename: kernelName,
			lineOffset: 0, // TBD +1 -1 ?
			displayErrors: false, // true default?
			// importModuleDynamically : importModuleFunction to overload in context?
		};
		vm.runInContext(codeInit, this.kernels[kernelName].vmContext, options)(require);

	    // run autoload if present
		let autoloadFile = path.join(this._mainFolder, "autoload.js");
		if (fs.existsSync(autoloadFile)) {
		    let code = fs.readFileSync(autoloadFile, 'utf8');
		    this.logRunToClient(kernelName,"Running autoload.js\n");
		    this.kernels[kernelName].alisko._startCommand();
		    let options = {
		        filename: autoloadFile,
		        lineOffset: 1, // TBD +1 -1 ?
		        displayErrors: false,
		    };
            try {
                vm.runInContext(code, this.kernels[kernelName].vmContext, options);
                // beforeTest
                if (typeof defaultContext["beforeTest"] == "function") {
                    let beforeTestCommandCode = '( async () => {\n' +
				        'await beforeTest();\n' +
				        '\n} ) ().then( '+
					    '()=>{alisko._stopCommand({startresult:"ready"});},'+
					    '(e)=>{alisko._stopCommand({startresult:"fail"});alisko._showError(e, "'+escapeDouble(autoloadFile)+'");}'+
					    ')';
                    vm.runInContext(beforeTestCommandCode, this.kernels[kernelName].vmContext, options);
                    await this.kernels[kernelName].alisko.readyPromise;
                } else {
                    // finishing queue
                    this.kernels[kernelName].alisko._stopCommand({startresult:"ready"});
                }
            } catch (e) {
                this.kernels[kernelName].alisko._stopCommand({startresult:"fail"});
                this.showError(kernelName, e, autoloadFile);
            }
		}

	}
	async stopKernel(kernelName) {
		if (kernelName in this.kernels) {
			await this.kernels[kernelName].alisko.close();
			delete this.kernels[kernelName];
			this.sendToClient('kernel-stopped', { kernelName: kernelName });
			this.recorderRefreshIfVisible(kernelName);
		}
	}
	async stopAllKernels() {
		for (const kernelName of Object.keys(this.kernels)) {
			await this.stopKernel(kernelName)
		}
	}
	stopKernelEvent(event, param) {
		const { kernelName } = param;
		this.stopKernel(kernelName);
	}
	async ensureKernelStarted(kernelName) {
		if (!(kernelName in this.kernels)) {
			await this.startKernel(kernelName);
		};
	}
	async stopAllFinally() {
	    await this.stopAllKernels();
	    if (this.browserHead) await this.browserHead.close();
	    if (this.browserHeadless) await this.browserHeadless.close();
	}


}

export { Processor };


		/*
		let actor = new Actor({
			browser: this.browser,
			kernelName: kernelName,
			remoteConsole: console1,
			writeAliskoCodeFunc: this.writeAliskoCode,
			refreshRecorderFunc: this.recorderRefreshIfVisible,
		});
		*/
