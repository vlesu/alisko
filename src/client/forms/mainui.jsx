/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import * as React from 'react';


const axios = require('axios');

// import SplitPane, { Pane } from 'react-split-pane';
import Split from 'react-split'

import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AppBar from '@mui/material/AppBar';
//import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormLabel from '@mui/material/FormLabel';
import Drawer from '@mui/material/Drawer';

// https://material-ui.com/components/material-icons/
import Tooltip from '@mui/material/Tooltip';
import FolderOpen from '@mui/icons-material/FolderOpen';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
// https://react-icons.github.io/react-icons/icons?name=fa
import { RiFootprintFill, RiFileAddLine } from "react-icons/ri";
// import { MdCameraAlt } from "react-icons/md";
import { CgCamera, CgMenu } from "react-icons/cg";
import { VscRootFolderOpened, VscRefresh, VscRunAll, VscChecklist, VscClearAll } from "react-icons/vsc";
import { FaRegUserCircle } from "react-icons/fa";



// import {version} from '../../../package.json';


import ProjectFileTree from '../components/ProjectFileTree';
import TabPanel from '../components/TabPanel';
import TabLabel from '../components/TabLabel';
import CodeEditor from '../components/CodeEditor';
import ReportViewer from '../components/ReportViewer';
import LogViewer from '../components/LogViewer';
import ToolbarTooltip from '../components/ToolbarTooltip';

import '../forms/mainui.css';

class MainForm extends React.Component {

	state = {
		mainFolder: "",
		userDataPath: "",
		activeTabValue: "",
		tabs: [],
		kernels: {},
		results: {},
		recorderVisible: false,
		dialogOpened: false,
		userLicenseState: "checking",
		userAgree: false,
		menuDrawer: false,
		settings_headless: 1,
		settings_winHeight: 1200,
		settings_winWidth: 1000,
		settings_timeout: 15000,
		settings_threads: 2,
	}


	constructor(props) {
		super(props);

		// logging on client
		window.electronAPI.on('log', (event, data) => {
		});

		// initialization
		window.electronAPI.on('response-initialize', (event, options) => {
			this.initializeMainFrame(options)
		});
		window.electronAPI.invoke('request-initialize', {});

		window.electronAPI.on('gui-main-folder-changed', (event, newMainFolder) => {
			this.changeMainFolder(newMainFolder, true);
		});
		window.electronAPI.on('gui-recorder-window-closed', (event, datas) => {
			this.setState({ recorderVisible: false });
		});
		window.electronAPI.on('kernel-started', this.kernelStartedEvent.bind(this));
		window.electronAPI.on('kernel-stopped', this.kernelStoppedEvent.bind(this));
		window.electronAPI.on('kernel-state-changed', this.kernelStateChangedEvent.bind(this));
		window.electronAPI.on('file-changed', this.fileChangedEvent.bind(this));
		window.electronAPI.on('file-saved-need-close', this.fileSavedNeedCloseEvent.bind(this));
		window.electronAPI.on('app-close-request', this.appCloseRequest.bind(this));
		window.electronAPI.on('task-queue-empty-or-disabled', this.unToggleRunAll.bind(this));

		window.onresize = this.onWindowResized;

		this.closeTab = this.closeTab.bind(this);

	} // of constructor ----------

	componentDidMount() {
		let email =  localStorage.getItem('userEmail');
		let pass =  localStorage.getItem('userPassword');
		let agree =  localStorage.getItem('userAgree');
		let lic =  localStorage.getItem('userLicense');

		let version = '';
		this.setState({
			userEmail: email ? email : '',
			userPassword: pass ? pass : '',
			userLicense: lic ? lic : 'professional',
			userAgree: agree ? true : false,
			userMessageLinkText: '',
			userMessageLinkUrl: undefined,
			version: version,
		}, ()=>{
			this.checkLicense();
		})
		window.electronAPI.invoke('get-version').then((version)=>{
			this.setState({
				version: version,
			})
		});
		this.settingsChanged({});


		this.openFile("Welcome", <div style={{ padding: 10 }}>Welcome to Alisko testing UI </div>)
	}

	settingsChanged = async(options) => {
		let headless = localStorage.getItem('settings_headless');
		if (typeof headless === "undefined" || headless === null) headless = 1;
		if (typeof options.headless !== "undefined") headless = options.headless;

		let winHeight = localStorage.getItem('settings_winHeight');
		if (!winHeight) winHeight = 800;
		if (typeof options.winHeight !== "undefined") winHeight = options.winHeight;

		let winWidth = localStorage.getItem('settings_winWidth');
		if (!winWidth) winWidth = 1200;
		if (typeof options.winWidth !== "undefined") winWidth = options.winWidth;

		let timeout = localStorage.getItem('settings_timeout');
		if (!timeout) timeout = 15000;
		if (typeof options.timeout !== "undefined") timeout = options.timeout;

		let threads = localStorage.getItem('settings_threads');
		if (!threads) threads = 2;
		if (typeof options.threads !== "undefined") threads = options.threads;


		let settings = {
			settings_headless: headless,
			settings_winHeight: winHeight,
			settings_winWidth: winWidth,
			settings_timeout: timeout,
			settings_threads: threads,
		}
		localStorage.setItem('settings_headless', headless);
		localStorage.setItem('settings_winHeight', winHeight);
		localStorage.setItem('settings_winWidth', winWidth);
		localStorage.setItem('settings_timeout', timeout);
		localStorage.setItem('settings_threads', threads);
		this.setState(settings);

		window.electronAPI.invoke('settings-changed', settings);
	}

	checkLicense = async()=> {
		const BASEURL = "http://alisko.vlesu.com/api/";
		try {
			this.setState({
				userLicenseState: 'pass',
			}, ()=>{
				localStorage.setItem('userEmail', '');
				localStorage.setItem('userPassword', '');
				localStorage.setItem('userAgree', '');
				localStorage.setItem('userLicense', '');
			})
			return;
		} catch(e) {
			console.log(e);
		}
		// await new Promise(resolve => setTimeout(resolve, 2000));
		setTimeout(this.checkLicense, 1000);
	}
	/*
	logout = async() => {
		this.setState({
			userLicenseState: 'dialog',
			userEmail: '',
			userPassword: '',
			userLicense: 'professional',
			userAgree: false,
			userMessageLinkText: '',
			userMessageLinkUrl: undefined,
			menuDrawer: false,
		}, () => {
			localStorage.setItem('userEmail', "");
			localStorage.setItem('userPassword', "");
			localStorage.setItem('userAgree', "");
			localStorage.setItem('userLicense', "");
		});
	}
	*/



	async appCloseRequest() {
		// check are we require to save files?
		const { tabs } = this.state;
		let ll = this.state.mainFolder.length;
		let unsavedFiles = [];
		for (let i = 0; i < tabs.length; i++) {
			if (tabs[i].filechanged) {
				unsavedFiles.push(tabs[i].id.substring(ll+1));
			}
		}
		if (unsavedFiles.length == 0) { // nothing to save
			window.electronAPI.invoke('app-closed');
		} else { // maybe we save?
			const {button, value} = await this._showDialog({
				title: 'Some files not saved. Are you sure to quit?',
				content: (<pre>{unsavedFiles.join("\n")}</pre>),
				ok: 'Quit anyway',
			});
			if (button == 'ok'){
				window.electronAPI.invoke('app-closed');
			};
		}
	}

	kernelStateChangedEvent(event, param) {
		const { kernelName, params } = param;
		const { state, result } = params;
		let result1 = result;
		if (!result1) result1 = '';
		this.setState((prevState, props) => {
			if (kernelName in prevState.kernels) {
				prevState.kernels[kernelName].state = state;
				prevState.kernels[kernelName].result = result1;
			}
			prevState.results[kernelName] = params; // as is
			return prevState;
		}, ()=>{
			// REALLY stop kernel if result is OK and tab is not opened
			// TBD settings "should i close passed tabs result?"
			let tab = this.findTabByFilename(kernelName);
			if (result1 == 'pass') {
				if (!tab) {
					window.electronAPI.invoke('kernel-stop', { kernelName: kernelName });
				}
			}
			// inform opened tab about change state of process
			if (tab) {
				window.electronAPI.emit('kernel-state-changed+'+kernelName, params);
			}
		});
	}
	kernelStartedEvent(event, param) {
		const { kernelName } = param;
		this.setState((prevState, props) => {
			prevState.kernels[kernelName] = {
				kernelName: kernelName,
				state: 'ready',
				result: 'unknown',
				content: <LogViewer kernelName={kernelName} />,
			};
			return prevState;
		}, () => {
			this.updateKernelBindings(kernelName);
		});
	}
	kernelStoppedEvent(event, param) {
		const { kernelName } = param;
		this.setState((prevState, props) => {
			if (kernelName in prevState.kernels) {
				delete prevState.kernels[kernelName];
			}
			return prevState;
		}, () => {
			this.updateKernelBindings(kernelName);
		});
	}
	updateKernelBindings(kernelName, kernelReallyChanged=false) {
		//  This window GUI update
		let splitter = this.refs.vsplit;
		if (!splitter) return;
		splitter = splitter.split;
		let sizes = splitter.getSizes();
		let mustShowLogger = (this.state.activeTabValue in this.state.kernels);
		if (!mustShowLogger && sizes[0] < 99) {
			// tbd save state
			splitter.setSizes([100, 0]);
		}
		if (mustShowLogger && sizes[0] > 90) {
			// tbd restore state
			splitter.setSizes([75, 25]);
		}
		this.vertSplitResized();
		this.hSplitResized();
		if (kernelReallyChanged) {
			window.electronAPI.invoke('active-kernel-changed', {kernelName: kernelName});
			window.electronAPI.emit('editor-focus-'+ kernelName);
		}
	}
	// runnings -------------------
	clearAllTests = async () => {
		window.electronAPI.invoke('processor-clearall');
		this.setState({results: {}, runAllMode:false});
		setTimeout(this.rebuildTreeAfter, 2000);
	}
	rebuildTreeAfter = async () => {
		this.refs.projectFileTree.rebuildTree();
	}
	runAllTests = async () => {
		this.setState({runAllMode: !this.state.runAllMode}, async ()=>{
			if (this.state.runAllMode) {
				// check are we require to save files?
				const { tabs } = this.state;
				let ll = this.state.mainFolder.length;
				let unsavedFiles = [];
				for (let i = 0; i < tabs.length; i++) {
					if (tabs[i].filechanged) {
						unsavedFiles.push(tabs[i].id.substring(ll+1));
					}
				}
				if (unsavedFiles.length == 0) { // nothing to save
					window.electronAPI.invoke('processor-runall');
				} else { // maybe we save?
					const {button, value} = await this._showDialog({
						title: 'Some files are not saved.',
						content: (<div> Would you like to run all anyway? We will use the saved files. Unsaved files:<br/>
							<pre>{unsavedFiles.join("\n")}</pre></div>),
						ok: 'Run anyway',
					});
					if (button == 'ok'){
						window.electronAPI.invoke('processor-runall');
					};
				}
			} else { // stop
				window.electronAPI.invoke('processor-stopall');
			}
		})
	}
	unToggleRunAll () {
		this.setState({runAllMode: false});
	}

	// config load and save ---------------------------------------------

	async saveConfig() {
		localStorage.setItem('mainFolder', this.state.mainFolder);
	}

	initializeMainFrame(options) {
		this.setState({ userDataPath: options['userDataPath'] })
		// preload config
		let mainFolder = localStorage.getItem('mainFolder');

		window.electronAPI.fs('existsSync',[mainFolder]).then((ok)=>{
			if (ok) {
				this.changeMainFolder(mainFolder, false);
			}
		})
	}

	// events from main process handling
	async changeMainFolder(newFolder, saveConfig = false) {
		this.setState({
			mainFolder: newFolder,
			results: {},
		}, ()=>{
			if (saveConfig) {
				this.saveConfig();
			}
			window.electronAPI.invoke('main-folder-really-changed',newFolder);
		});
	}

	// tab operations
	findTabByFilename(fileName) {
		const { tabs } = this.state;
		for (const tab of tabs) {
			if (tab.id == fileName) {
				return tab;
			}
		}
		return null;
	}
	async closeTab(fileName, force=false) {
		const { tabs } = this.state;
		const scope = this;
		for (let i = 0; i < tabs.length; i++) {
			if (tabs[i].id == fileName) {
				// TBD ask "are you sure, if file unsaved?"
				if (!force && tabs[i].filechanged) {
					const {button, value} = await this._showDialog({
						title: 'File not saved. Save?',
						content: fileName,
						ok: 'Save',
						second: "Do not save",
					})
					if (button == 'ok') { // save
						window.electronAPI.emit('file-save-close+'+fileName);
					}
					if (button == '2') { // not save
						scope.closeTab(fileName, true);
					}
					return;
				}

				let shouldIStop = false;

				tabs.splice(i, 1);
				// find new active tab
				let fileNameToOpen = "no tabs";
				if (i < tabs.length) {
					fileNameToOpen = tabs[i].id;
				} else if (i > 0) {
					fileNameToOpen = tabs[i - 1].id;
				}
				// set
				if (fileNameToOpen == "no tabs") {
					this.setState({ tabs: tabs }, () => {
						this.updateKernelBindings("nonExistentTabName", true);
					});
				} else {
					this.setState({ tabs: tabs, activeTabValue: fileNameToOpen }, () => {
						this.updateKernelBindings(fileNameToOpen, true);
					});
				}
				// TBD delete kernel and editor
				if (shouldIStop) {
					window.electronAPI.invoke('kernel-stop', { kernelName: fileName });
				}
				return;
			}
		}
	}
	fileSavedNeedCloseEvent(param) {
		const {fileName} = param;
		this.closeTab(fileName, true); // force close
	}
	openFile(fileName, content = null) {
		const { tabs } = this.state;
		// ensure file is not opened
		const tab = this.findTabByFilename(fileName);
		if (tab) {
			this.setState({ activeTabValue: fileName });
			return;
		}
		// file not opened yet, lets open it
		tabs.push({
			title: window.electronAPI.basename(fileName),
			id: fileName,
			filechanged: false,
			content: content ? content :
				(fileName.toLowerCase().endsWith(".htm") ? <ReportViewer fileName={fileName}/> : <CodeEditor fileName={fileName}/>)
		})
		this.setState({ tabs: tabs, activeTabValue: fileName }, () => {
			this.updateKernelBindings(fileName, true);
			if (fileName in this.state.kernels) { // kernel present, lets hilite last run?
				window.electronAPI.emit('kernel-renew-hilite', { kernelName: fileName });
			}
		});
	}
	onFileClick(fileName) {
		this.openFile(fileName)
	}

	fileChangedEvent(param) {
		const {fileName, changed} = param;
		const { tabs } = this.state;
		for (let i = 0; i < tabs.length; i++) {
			if (tabs[i].id == fileName) {
				tabs[i].filechanged = changed;
			}
		}
		this.setState({ tabs: tabs });
	}



	handlePageChange(event, newValue) {
		if (this.findTabByFilename(newValue)) {
			this.setState({ activeTabValue: newValue }, () => {
				this.updateKernelBindings(newValue, true);
			});
		} else {
			this.updateKernelBindings("nonExistentTabName", true);
		}
	};

	changeRecorderVisibility() {
		this.setState({ recorderVisible: !this.state.recorderVisible }, () => {
			window.electronAPI.invoke('gui-toggle-recorder-visibility', { recorderVisible: this.state.recorderVisible });
		}, ()=>{
			updateKernelBindings(this.state.activeTabValue);
		});
	}

	vertSplitResized() {
		window.electronAPI.emit('vsplit-resize+'+this.state.activeTabValue);
	}
	hSplitResized() {
		let vToolBarW = 70;
		let gutterW = 10;
		let hsplitter = this.refs.hsplit;
		if (!hsplitter) return;
		let sizes = hsplitter.split.getSizes();
		let calculatedW = ( window.innerWidth - vToolBarW ) * sizes[1]/100 - gutterW;
		let tabsholder = this.refs.tabsholder;
		tabsholder.style.maxWidth = Math.round(calculatedW) + 'px';
	}
	onWindowResized = async() => {
		if (this.refs && this.refs.hsplit) {
			this.hSplitResized();
		}
	}

	// dialog specs -----------------------------
	_showDialog({title, content, label, ok, value, second}) {
		this.setState({
			menuMode:undefined,
			dialogOpened: true,
			dialogTitle: title,
			dialogText: content,
			dialogLabel: label,
			dialogValue: value,
			dialogAction: ok,
			dialogSecond: second,
		})
		return new Promise((resolve, reject)=>{
			this.dialogDone = resolve;
		})
	}
	_dialogDone = async () =>{
		this.setState({
			dialogOpened: false,
		}, ()=>{
			this.dialogDone({button: 'ok', value: this.state.dialogValue});
		});
	}
	_dialogSecond  = async () =>{
		this.setState({
			dialogOpened: false,
		}, ()=>{
			this.dialogDone({button: '2', value: this.state.dialogValue});
		});
	}
	_dialogCancel = async () => {
		this.setState({
			dialogOpened: false,
		}, ()=>{
			this.dialogDone({button: 'cancel', value: this.state.dialogValue});
		});
	}

	render() {
		return (<div style={{ flexGrow: 1, flexShrink: 1, display: 'flex', flexDirection: 'row', }}>
			<Drawer anchor='right' open={this.state.menuDrawer} onClose={()=>this.setState({menuDrawer:false})}>
				{/*
				<div className="drawerHeader">
					<div className="drawerHeaderTitle">
						<FaRegUserCircle size="32"/>
						<div className="drawerHeaderUsername">
							{this.state.userEmail}
							<Button color="primary" onClick={this.logout}>
								Logout
							</Button>
						</div>
					</div>
					<IconButton onClick={()=>this.setState({menuDrawer:false})}>
						<ChevronRightIcon />
					</IconButton>
				</div>
				*/}
				<Divider />
            	<div className="drawerBody">
					<div className="drawerForm">
						<div>
						   Settings:
						</div>
						<FormControlLabel
							control={
							<Checkbox
								checked={this.state.settings_headless > 0 ? true : false}
								onChange={()=>{this.settingsChanged({headless: this.state.settings_headless > 0 ? 0 : 1})}}
								color="primary"
							/>
							}
							label="Hide browser window"
						/>
						<TextField className="drawerFormItem"
							required type="number"
							label="Page width"
							value={this.state.settings_winWidth}
							onChange={(event) => { this.settingsChanged({ winWidth: event.target.value }) }}
						/>
						<TextField className="drawerFormItem"
							required type="number"
							label="Page height"
							value={this.state.settings_winHeight}
							onChange={(event) => { this.settingsChanged({ winHeight: event.target.value }) }}
						/>
						<TextField className="drawerFormItem"
							required type="number"
							label="Timeout in ms"
							value={this.state.settings_timeout}
							onChange={(event) => { this.settingsChanged({ timeout: event.target.value }) }}
						/>
						<TextField className="drawerFormItem"
							required type="number"
							label="Parallel threads for Test all command"
							value={this.state.settings_threads}
							onChange={(event) => { this.settingsChanged({ threads: event.target.value }) }}
						/>
						<div className="drawerFormItem">
						   To apply changes above <br/>please restart the test.
						</div>
					</div>
				</div>
            	<div className="drawerFooter">
				 <div>© Alisko v{this.state.version}</div>
				 <div><a href="#" onClick={()=>{
					window.electronAPI.openExternal('http://alisko.vlesu.com/');
				 }}>Feedback</a>
				 <span style={{paddingLeft: 10,paddingRight:10}}>|</span>
				 <a href="#" onClick={()=>{
					window.electronAPI.openExternal('http://alisko.vlesu.com/terms.htm');
				}}>License</a></div>
				<div>
				<a href="#" onClick={()=>{
				 window.electronAPI.invoke('update-required', {});
			 }}>Check for updates</a>
				</div></div>
            </Drawer>
			<Dialog style={{ zIndex: 9999,}}
				open={this.state.userLicenseState=="checking"} >
				<div style={{ width:300, height:150,textAlign:'center',verticalAlign:'center' }}>
					<p>Please wait...</p>
					<div><CircularProgress color="inherit" /></div>
				</div>
			</Dialog>
			<Dialog style={{ zIndex: 9998,}}
				open={this.state.userLicenseState=="dialog"} >
					<DialogTitle>Welcome</DialogTitle>
					<DialogContent style={{minWidth: 500,}}>
						<TextField
							autoFocus
							required type="email"
							label="email"
							value={this.state.userEmail}
							onChange={(event) => { this.setState({ userEmail: event.target.value }) }}
							fullWidth
						/>
						<TextField
							required  type="password"
							label="password"
							value={this.state.userPassword}
							onChange={(event) => { this.setState({ userPassword: event.target.value }) }}
							fullWidth
							style={{paddingTop: 15,paddingBottom:15}}
						/>
						<FormControlLabel
							control={
							<Checkbox
								checked={this.state.userAgree}
								onChange={()=>{this.setState({userAgree:!this.state.userAgree})}}
								color="primary"
							/>
							}
							label={
								<span>
									I agree with
									<a href="#" style={{paddingLeft: 5,}} onClick={()=>{
										window.electronAPI.openExternal('http://alisko.vlesu.com/terms.htm');
									}}>terms and conditions</a>
								</span>}
						/>
						<div style={{color: 'red',textAlign:'center',paddingTop:15}}>
							{this.state.userMessage}
							{this.state.userMessageLinkText ? (
								<a href="#" style={{paddingLeft: 5,}} onClick={()=>{
									window.electronAPI.openExternal(this.state.userMessageLinkUrl);
								}}>{this.state.userMessageLinkText}</a>
							) : undefined}
							</div>
					</DialogContent>
					<DialogActions>
						<Button onClick={this.checkLicense} color="primary" disabled={!this.state.userAgree}>
							Sign in or Register
						</Button>
					</DialogActions>
			</Dialog>
			<Dialog open={this.state.dialogOpened ? true : false} onClose={()=>this.setState({dialogOpened:false})}>
				<DialogTitle id="form-dialog-title">{this.state.dialogTitle}</DialogTitle>
				<DialogContent style={{minWidth: 500,}}>
				{this.state.dialogText ? (
					<DialogContentText>
						{this.state.dialogText}
					</DialogContentText>
				) : undefined}
				{this.state.dialogLabel ? (
					<TextField
						autoFocus
						margin="dense"
						id="name"
						label={this.state.dialogLabel}
						value={this.state.dialogValue}
						onChange={(event) => { this.setState({ dialogValue: event.target.value }) }}
						onKeyPress={(ev)=>{if (ev.key === 'Enter') {this._dialogDone()} }}
						fullWidth
					/>
				): undefined}
				</DialogContent>
				<DialogActions>
				<Button onClick={this._dialogDone} color="primary" size="large">
					{this.state.dialogAction}
				</Button>
				{this.state.dialogSecond ? (
					<Button onClick={this._dialogSecond} size="large">
						{this.state.dialogSecond}
					</Button>
				) : undefined}
				<Button onClick={this._dialogCancel} size="large">
					Cancel
				</Button>
				</DialogActions>
			</Dialog>
			<Split
				ref="hsplit"
				onDragEnd={this.hSplitResized.bind(this)}
				direction="horizontal"
				minSize={[250, 400]}
				sizes={[25, 75]}
				style={{ flexGrow: 1, flexShrink: 1, flexDirection: 'row', display: 'flex' }}>
				<div className="leftPane">
					{this.state.mainFolder != "" ? (
					<div className="toolbar" >
						<ToolbarTooltip title="Open project folder..">
							<IconButton size="medium" className="rounded-square"
								onClick={() => {
									window.electronAPI.invoke('gui-request-change-folder');
								}} >
								<VscRootFolderOpened />
							</IconButton>
						</ToolbarTooltip>
						<ToolbarTooltip title="Create new test file">
							<IconButton size="medium" className="rounded-square"
								onClick={() => { this.refs.projectFileTree.createFileAtRootFolder() }} >
								<RiFileAddLine />
							</IconButton>
						</ToolbarTooltip>
						<ToolbarTooltip title="Reload project folder">
							<IconButton size="medium" className="rounded-square"
								onClick={() => { this.refs.projectFileTree.rebuildTree() }} >
								<VscRefresh />
							</IconButton>
						</ToolbarTooltip>
						<Divider orientation="vertical" flexItem className="paddedDivider"/>
						<ToolbarTooltip title="Run all tests.">
							<ToggleButton
								value="check" style={{ border: 'none', }} size="small" className="rounded-square"
								selected={this.state.runAllMode}
								onChange={() => {
									this.runAllTests();
								}}
							>
								<VscRunAll size="32"/>
							</ToggleButton>
						</ToolbarTooltip>
						<ToolbarTooltip title="Stop all kernels and clear all test results">
							<IconButton size="medium" className="rounded-square"
								onClick={this.clearAllTests} >
								<VscClearAll />
							</IconButton>
						</ToolbarTooltip>
					</div>
					) : undefined}
					{this.state.mainFolder != "" ? (
						<ProjectFileTree ref="projectFileTree"
							directory={this.state.mainFolder}
							kernels={this.state.kernels} results={this.state.results}
							onFileClick={this.onFileClick.bind(this)} />
					) : <div style={{ flexGrow: 1, flexShrink: 1, flexDirection: 'column', display: 'flex',
							alignItems: 'center', justifyContent: 'center', whiteSpace: 'normal',textAlign: 'center',padding: 10,}}>
						<Button color="primary"
							onClick={() => {
								window.electronAPI.invoke('gui-request-change-folder');
							}} >
							Click here
						</Button>
						to choose main project folder
					</div>}
				</div>
				<div className="centerPane">
					  <div style={{maxWidth: 1200,}} ref="tabsholder">
						<Tabs
							value={this.state.activeTabValue}
							onChange={this.handlePageChange.bind(this)}
							indicatorColor="primary"
							variant="scrollable"
							scrollButtons="auto"
						>
							{this.state.tabs.map((item) => {
							    // draggable: TBD https://codesandbox.io/s/k260nyxq9v
								return <Tab
									label={<TabLabel
										value={item.id}
										onClickClose={this.closeTab}
										label={item.title}
										filechanged={item.filechanged}
									/>}
									value={item.id}
									component="span"
									key={item.id} />
							})}
						</Tabs>
					</div>
					<Split ref="vsplit"
						onDragEnd={this.vertSplitResized.bind(this)}
						direction={"vertical"}
						minSize={[200, 0]}
						sizes={[75, 25]}
						style={{ flexGrow: 1, flexShrink: 1, flexDirection: 'column', display: 'flex' }}>
						<div style={{ flexGrow: 0, flexShrink: 0, flexDirection: 'column', display: 'flex', position: 'relative' }}>
							<div style={{ display: 'flex', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, }}>
								{this.state.tabs.map((item) => {
									return <TabPanel value={this.state.activeTabValue} index={item.id} key={item.id}>
										{item.content}
									</TabPanel>;
								})}
							</div>
						</div>
						<div style={{ flexGrow: 0, flexShrink: 0, flexDirection: 'column', display: 'flex', position: 'relative' }}>
							<div style={{ display: 'flex', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, }}>
								{Object.entries(this.state.kernels).map(([k, item], i) => {
									return <TabPanel value={this.state.activeTabValue} index={item.kernelName} key={item.kernelName}>
										{item.content}
									</TabPanel>;
								})}
							</div>
						</div>
					</Split>
				</div>
			</Split>
			<div className="vtoolbar">
				<ToolbarTooltip title="Open menu..">
					<IconButton size="medium" className="rounded-square"
						onClick={() => this.setState({menuDrawer: true}) } >
						<CgMenu />
					</IconButton>
				</ToolbarTooltip>
				{this.state.mainFolder != "" ? (
					<ToolbarTooltip title="Open/close interactive browser window">
						<ToggleButton
							value="check" style={{ border: 'none', }} size="medium" className="rounded-square"
							selected={this.state.recorderVisible}
							onChange={() => {
								this.changeRecorderVisibility();
							}}
						>
							<CgCamera size="26" />
						</ToggleButton>
					</ToolbarTooltip>
				) : undefined}
			</div>
		</div>);
	}
}


export default MainForm;
