/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import * as React from 'react';
import ReactDOM from 'react-dom';

import { Buffer } from 'buffer';

import Paper from '@mui/material/Paper';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ToolbarTooltip from '../components/ToolbarTooltip';
//import Input from '@mui/material/Input';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

import KeyboardEventHandler from '../components/KeyboardEventHandler';

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';

// https://react-icons.github.io/react-icons/icons?name=fa
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { IoCameraReverseOutline, IoLibraryOutline } from "react-icons/io5";
import { FaExternalLinkAlt, FaMousePointer, FaKeyboard, FaEye, FaHandRock } from "react-icons/fa";

import ChooseFileTree from '../components/ChooseFileTree';
import '../forms/mainui.css';

const SCREENSHOT_DEFAULT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAABJ0AAASdAHeZh94AAAAFklEQVQImWP8//8/AwMDEwMDAwMDAwAkBgMBmjCi+wAAAABJRU5ErkJggg==';
const HILITER_DEFAULT = { top: -100, left: -100, width: 0, height: 0, msg: undefined, cursor: 'pointer', isInput:false, };

class RecorderForm extends React.Component {
  mouseMoveHaveSent = false;

  state = {
    url: '',
    inprogress: false,
    backdropHeight: 10000,
    // скриншот по умолчанию: белое поле:
    screenshot: SCREENSHOT_DEFAULT,
    hiliter: HILITER_DEFAULT,
    recorderState: 'READY',
    recorderCommandInProcess: undefined,
    dialogAnswer: "",
    mainFolder: undefined,
    fileNameChoosen: undefined,
    actionState: 'mouse',
    showKeyboard: false,
    keyboardMessage: '',
    funcKeys: false,
    funcKeysGlobal: false,
    commandChooseOptions: [],
	grabDialog:false,
	grabRequireText:"",
	runnable: false,
	showLibrary: false,
	needWriteCode: true,
  }

  constructor(props) {
    super(props);
    window.electronAPI.on('screen-refreshed', this.screenRefreshed.bind(this));
    window.electronAPI.on('screen-will-be-refreshed', this.setWaiter.bind(this));
    this.imageOnClick = this.imageOnClick.bind(this);
    this.imageMouseMove = this.imageMouseMove.bind(this);
    this.imageWheel = this.imageWheel.bind(this);
    this.dialogAccept = this.dialogAccept.bind(this);
    this.dialogDismiss = this.dialogDismiss.bind(this);
    this.dialogDismissForget = this.dialogDismissForget.bind(this);
    this.newPageSwitch = this.newPageSwitch.bind(this);
    this.newPageDismiss = this.newPageDismiss.bind(this);
    this.newPageForget = this.newPageForget.bind(this);
    this.fileChooserAccept = this.fileChooserAccept.bind(this);
    this.fileChooserForget = this.fileChooserForget.bind(this);
    this.choosedFileToUpload = this.choosedFileToUpload.bind(this);
    this.keyboardProceed = this.keyboardProceed.bind(this);
    this.handleKeys = this.handleKeys.bind(this);
    this.focusInput = this.focusInput.bind(this);
    window.electronAPI.on('predictor-hilited', this.predictorHilited.bind(this));
    window.electronAPI.on('recorder-changestate', this.recorderChangeState.bind(this));
    window.electronAPI.on('change-main-folder-recorder', this.recorderChangeMainFolder.bind(this));
    window.electronAPI.on('predictor-command-variants', this.recorderShowVariants.bind(this));
    window.electronAPI.on('predictor-grab-info', this.recorderGrabInfo.bind(this));
    window.electronAPI.on('predictor-command-keyboard-hint', this.recorderKeyboardHint.bind(this));
    window.electronAPI.on('active-tab-changed-for-recorder', this.recorderActiveTabChanged.bind(this));



  } // of constructor ----------

  componentDidMount() {
    this.setState({
      backdropHeight: this.refs.topbar.offsetHeight,
    });
  }
  recorderActiveTabChanged(event, options) {
    this.setState({
      runnable: options.runnable,
    });
  }
  recorderChangeMainFolder(event, options) {
    this.setState({
      mainFolder: options,
    });
  }

  // отработка "скриншот пришел" ---------------------------------------
  screenRefreshed(event, options) {
    if (options.img) { // active
      let src = 'data:image/png;base64,' + Buffer.from(options.img).toString('base64');
      this.setState({
        screenshot: src,
        hiliter: HILITER_DEFAULT,
        url: options.webInfoState.url,
        inprogress: false,
        recorderCommandInProcess: undefined, // TBD?
        recorderState: options.state,
        showKeyboard: false,
      }, () => {
        setTimeout(this.invokeResizeme.bind(this), 300);
      });
    } else if (options.active == false) { // inactive
      this.setState({
        screenshot: SCREENSHOT_DEFAULT,
        hiliter: HILITER_DEFAULT,
        url: '',
        inprogress: false,
        showKeyboard: false,
      }, () => {
        setTimeout(this.invokeResizeme.bind(this), 300);
      });
    } else { // active but state not ready
      this.setState({
        recorderState: options.state,
        // recorderCommandInProcess: undefined,  // TBD?
        showKeyboard: false,
      });
    };
    this.mouseMoveHaveSent = false;
	if (options.state == "FILECHOOSER") {
		this.refs.ChooseFileTree1.rebuildTree();
	}
  }
  invokeResizeme() {
    let deltax = 1, deltay = 5; // debugging specs - for menu and window borders?
    let dims = {
      width: Math.max(750, this.refs.mainimg.offsetWidth + deltax),
      height: Math.max(600, this.refs.mainimg.offsetHeight + this.refs.topbar.offsetHeight + deltay),
    };
    this.setState({
      backdropHeight: this.refs.topbar.offsetHeight,
    });
    window.electronAPI.invoke('recorder-resizeme', dims);
    // this.refs.refresher1.focus();
    // ReactDOM.findDOMNode(this.refs.maindiv).focus();
  }

  // dialogs and popups ------------------------------
  recorderChangeState(event, options) {
    this.setState({
      recorderState: options.state,
      dialogMessage: options.message,
      dialogType: options.type,
      recorderCommandInProcess: options.commandInProcess,
      dialogAnswer: "",
      showKeyboard: false,
    });
	if (options.state == "FILECHOOSER") {
		this.refs.ChooseFileTree1.rebuildTree();
	}
  }
  dialogAccept(event, options) {
    this.invokeCommand('predictor-command', {
      command: 'dialog.accept',
      param: {
        msg: this.state.dialogAnswer,
        commandInProcess: this.state.recorderCommandInProcess,
      },
  	  needWriteCode: this.state.needWriteCode,
    });
  }
  dialogDismiss(event, options) {
    this.invokeCommand('predictor-command', {
      command: 'dialog.dismiss',
      param: { commandInProcess: this.state.recorderCommandInProcess },
 	  needWriteCode: this.state.needWriteCode,
    });
  }
  dialogDismissForget(event, options) {
    this.invokeCommand('predictor-command', {
      command: 'dialog.forget',
      param: { commandInProcess: this.state.recorderCommandInProcess },
 	  needWriteCode: this.state.needWriteCode,
    });
  }

  newPageSwitch(event, options) {
    this.invokeCommand('predictor-command', {
      command: 'newpage.switch',
      param: { commandInProcess: this.state.recorderCommandInProcess },
  	  needWriteCode: this.state.needWriteCode,
    });
  }
  newPageDismiss(event, options) {
    this.invokeCommand('predictor-command', {
      command: 'newpage.dismiss',
      param: { commandInProcess: this.state.recorderCommandInProcess },
  	  needWriteCode: this.state.needWriteCode,
    });
  }
  newPageForget(event, options) {
    this.invokeCommand('predictor-command', {
      command: 'newpage.forget',
      param: { commandInProcess: this.state.recorderCommandInProcess },
  	  needWriteCode: this.state.needWriteCode,
    });
  }

  fileChooserAccept(event, options) {
    // TBD check if choosen file present!
    let fileName = this.state.fileNameChoosen.substring(this.state.mainFolder.length);
    this.invokeCommand('predictor-command', {
      command: 'filechooser.accept',
      param: { file: fileName },
  	  needWriteCode: this.state.needWriteCode,
    });
  }
  fileChooserForget(event, options) {
    this.invokeCommand('predictor-command', {
      command: 'filechooser.forget',
      param: {},
  	  needWriteCode: this.state.needWriteCode,
    });
  }
  choosedFileToUpload(fileName) {
    if (fileName) {
      window.electronAPI.fs('existsSync',[fileName]).then((okexists)=>{
        if (okexists) {
          window.electronAPI.fs('statSync',[fileName]).then((stat)=>{
            console.log(stat)
            if (stat.size>0) { // TBUNLOCK () isFile() ?????
              this.setState({ fileNameChoosen: fileName })
            } else {
              this.setState({ fileNameChoosen: undefined })
            }
          })
        } else {
          this.setState({ fileNameChoosen: undefined })
        }
      })
    }
    /*
    if (fileName && fs.existsSync(fileName)) {
      let stat = fs.statSync(fileName);
      if (stat.isFile()) {
        this.setState({ fileNameChoosen: fileName })
        return;
      }
    }
    this.setState({ fileNameChoosen: undefined })
    */
  }
  recorderShowVariants(event, options) {
    this.setState({commandChooseOptions: options})
  }
  executeCommandChoosen(item) {
    this.setState({commandChooseOptions: []}, ()=>{
      this.invokeCommand('predictor-command', {
        command: 'execute.command',
        param: {},
        exactCommand: item,
  	    needWriteCode: this.state.needWriteCode,
      });
    });
  }

  recorderGrabInfo(event, options) {
    this.setState({
		grabDialog: true,
		grabInitialText: options.text,
		grabRequireText:  options.text,
		grabOptions: options,
	})
  }
  grabStage2 = async()=>{
    let options = this.state.grabOptions;
	this.setState({ grabDialog: false }, ()=>{
	  options.requiredText = this.state.grabRequireText;
	  this.invokeCommand('predictor-command', {
        command: 'page.grab2',
        param: options,
  	    needWriteCode: this.state.needWriteCode,
      });
	});
  }

  // отправка любой команды -------------------------------------------------
  invokeCommand(eventName, options) {
    this.setState({
      inprogress: true,
    }, () => {
      window.electronAPI.invoke(eventName, options);
    })
  }
  setWaiter() {
    this.setState({
      inprogress: true,
    });
  }
  backdropClick() {
  }

  // строка адреса -----------------------------------------
  navigateCommand() {
    this.invokeCommand('predictor-command', {
      command: 'page.goto',
      param: this.state.url,
  	  needWriteCode: this.state.needWriteCode,
    });
    this.refs.url_input.blur();
  }
  urlHandleKeypress(event) {
    if (event.code == "Enter") {
      this.navigateCommand();
    }
  }
  urlFocus(event) {
    event.target.select();
  }

  // клик по картинке, в зависимости от используемого инструмента ------------------
  imageOnClick(e) {
    let x = e.nativeEvent.offsetX;
    let y = e.nativeEvent.offsetY;
    if (!["mouse","keyboard","waitfor","grab"].includes(this.state.actionState)) return;
    if (this.state.actionState == "keyboard") {
      this.setState({
        savedX:x,
        savedY:y,
        showKeyboard: true,
        keyboardMessage:'',
        funcKeys: !this.state.hiliter.isInput,
        funcKeysGlobal: false,
      }, ()=>{
        setTimeout(this.focusInput, 100);
      });
      return;
    }
    let cmd = (this.state.actionState == 'mouse' ? 'click' : this.state.actionState) // waitfor, grab
    window.electronAPI.invoke('predictor-command', {
      command: 'page.'+cmd,
      param: { x: x, y: y },
	  needWriteCode: this.state.needWriteCode,
    });
	if (this.state.actionState!="grab") {
		this.setState({
			inprogress: true,
		});
	}
  }
  imageMouseMove(e) {
    let x = e.nativeEvent.offsetX;
    let y = e.nativeEvent.offsetY;
    if (!["mouse","keyboard","waitfor", "grab"].includes(this.state.actionState)) return;
    if (!this.mouseMoveHaveSent) {
      this.mouseMoveHaveSent = true;
      let instrument = 'click';
      if (this.state.actionState == "keyboard") {
        instrument = "fill";
      }
      if (this.state.actionState == "waitfor") {
        instrument = "waitfor";
      }
      window.electronAPI.invoke('predictor-hilite', {
        command: 'page.' + instrument, // which tool planned tp be use, TBD choose tool here
        param: { x: x, y: y },
	    needWriteCode: this.state.needWriteCode,
      });
    }
  }
  predictorHilited(event, params) {
    const { x, y, w, h, msg, cursor, isInput } = params;
    let h1 = h;
    let y1 = y;
    const pads = 4;
    const bordw = 2;
    const dy = this.state.backdropHeight;
    if (w>=0) {
  	  if (y1<0) { // dont allow hiliters block above top line
	  	  h1 += y1;
  		  y1 = 0;
  		  if (h1 <= 0) {
  		    return;
  		  }
  	  }
      let hiliter = {
        left: x - pads - bordw,
        top: y1 - pads + dy - bordw,
        width: w + 2 * pads,
        height: h1 + 2 * pads,
        msg: msg,
        cursor: cursor,
        isInput: isInput,
      }
      this.setState({ hiliter: hiliter });
    }
    this.mouseMoveHaveSent = false;
  }
  recorderKeyboardHint(event, options) {
	this.setState({
        savedX:options.x,
        savedY:options.y,
        showKeyboard: true,
        keyboardMessage:'',
        funcKeys: false,
        funcKeysGlobal: false,
      }, ()=>{
        setTimeout(this.focusInput, 100);
      });
  }



  // use choose keyboard keystroke
  keyboardProceed(event, param) {
    if (this.state.keyboardMessage!='') {
      window.electronAPI.invoke('predictor-command', {
        command: 'page.' + (this.state.funcKeys ? 'press' : 'fill'),
        param: {
          x: this.state.savedX,
          y:  this.state.savedY,
          msg: this.state.keyboardMessage,
          isGlobal: this.state.funcKeysGlobal,
        },
	    needWriteCode: this.state.needWriteCode,
      });
    }
    this.setState({
      showKeyboard: false,
      keyboardMessage:'',
    });
  }
  handleKeys(k,e) {
    let keyName = e.key;
    if (e.shiftKey && e.key!="Shift") keyName = 'Shift+' + keyName;
    if (e.altKey && e.key!="Alt") keyName = 'Alt+' + keyName;
    if (e.ctrlKey && e.key!="Control") keyName = 'Control+' + keyName;
    if (this.state.funcKeys) {
      this.setState({keyboardMessage: keyName}, ()=>{
        //ReactDOM.findDOMNode(this.refs.keyinput1).focus();
        setTimeout(this.focusInput, 100);
      });
    }
  }
  focusInput() {
    this.keyinput1.focus();
  }

  imageWheel(e) {
    let d = e.deltaY;
    let x = e.nativeEvent.offsetX;
    let y = e.nativeEvent.offsetY;
    window.electronAPI.invoke('predictor-scroll', {
      x: x, y: y, d: d,
    });
  }

  useSample = async(sampleTxt) => {
	  this.setState( {showLibrary:false}, ()=>{
		  if (sampleTxt=="") return;
		  this.invokeCommand('predictor-command', {
			command: 'execute.command',
			param: {},
			exactCommand: {
				commandCode: sampleTxt,
			},
	        needWriteCode: this.state.needWriteCode,
		  });
	  } );
  }

  // отрисовка ------------------------------
  render() {
    return (<div style={{
      flexGrow: 1, flexShrink: 1, display: 'flex', flexDirection: 'column',
      backgroundColor: '#eeeeee',
      overflow: 'none',
    }}>
      <div ref="topbar" className="topbar">
        <div className="urltoolbar" >
          <div className="urltoolbar1">
            <ToolbarTooltip title="Refresh screenshot" ref="refresher1">
              <IconButton size="medium" className="rounded-square"
                onClick={() => { window.electronAPI.invoke('recorder-refresh'); }} >
                <IoCameraReverseOutline />
              </IconButton>
            </ToolbarTooltip>
            <Divider orientation="vertical" flexItem className="paddedDivider" />

            <ToolbarTooltip title="Use mouse to click on elements">
              <ToggleButton
                value="check" style={{ border: 'none', }} size="medium" className="rounded-square"
                selected={this.state.actionState == 'mouse'}
                onChange={() => {
                  this.setState({ actionState: 'mouse' })
                }}
              >
                <FaMousePointer size="26" />
                Click
              </ToggleButton>
            </ToolbarTooltip>

            <ToolbarTooltip title="Use keyboard ty send keys into desired element or into whole page">
              <ToggleButton
                value="check" style={{ border: 'none', }} size="medium" className="rounded-square"
                selected={this.state.actionState == 'keyboard'}
                onChange={() => {
                  this.setState({ actionState: 'keyboard' })
                }}
              >
                <FaKeyboard size="26" />
                &nbsp;Keyboard
              </ToggleButton>
            </ToolbarTooltip>

            <ToolbarTooltip title="Wait for this element to appears on page">
              <ToggleButton
                value="check" style={{ border: 'none', }} size="medium" className="rounded-square"
                selected={this.state.actionState == 'waitfor'}
                onChange={() => {
                  this.setState({ actionState: 'waitfor' })
                }}
              >
                <FaEye size="26" />
                &nbsp;Wait for
              </ToggleButton>
            </ToolbarTooltip>

            <ToolbarTooltip title="Get data from page content to variable">
              <ToggleButton
                value="check" style={{ border: 'none', }} size="medium" className="rounded-square"
                selected={this.state.actionState == 'grab'}
                onChange={() => {
                  this.setState({ actionState: 'grab' })
                }}
              >
                <FaHandRock size="26" />
                &nbsp;Grab
              </ToggleButton>
            </ToolbarTooltip>

			<ToolbarTooltip title="Choose code sample">
				<IconButton size="medium" className="rounded-square MuiToggleButton-root" style={{border: 0}}
					onClick={(event) =>  {this.setState({ showLibrary: true,menuAnchorEl:event.currentTarget }) }} >
					<IoLibraryOutline size="26"  />
					&nbsp; <span className=""> Library</span>
				</IconButton>
			</ToolbarTooltip>
			<Menu
				anchorEl={this.state.menuAnchorEl}
				open={this.state.showLibrary}
				onClose={()=>{this.setState({showLibrary:false})}}
				keepMounted
				>
				<MenuItem onClick={()=>this.useSample("")}>Cancel</MenuItem>
				<Divider />
				<MenuItem onClick={()=>this.useSample("await page.goBack();")}>Go back</MenuItem>
				<MenuItem onClick={()=>this.useSample("await page.goForward();")}>Go forward</MenuItem>
				<MenuItem onClick={()=>this.useSample("await page.reload();")}>Reload page</MenuItem>
				<MenuItem onClick={()=>this.useSample("await page.waitForTimeout(500);")}>Wait for timeout in ms (use carefully!)</MenuItem>
				<Divider />
				<MenuItem onClick={()=>this.useSample("oldContext = context;\noldPage = page;\ncontext = await browser.newContext();\npage = await context.newPage();\npage.bringToFront();")}>Open "incognito" page</MenuItem>
				<MenuItem onClick={()=>this.useSample("context = oldContext;\npage = oldPage;")}>Return to "main" page from "incognito"</MenuItem>
				<Divider />
				<MenuItem onClick={()=>this.useSample("if (context.pages().length>1) {\n  await page.close();\n  page=context.pages()[context.pages().length-1];\n}")}>Close active browser tab + switch to last tab</MenuItem>
				<MenuItem onClick={()=>this.useSample("await page.setViewportSize({ width: 1200, height: 800 });")}>Change window size (see code generated)</MenuItem>
				<MenuItem onClick={()=>this.useSample("await page.setDefaultTimeout( 10000 ); // timeout in ms")}>Change default page timeout</MenuItem>

			</Menu>

			<ToolbarTooltip title="Write actions as code">
				<FormControlLabel
				  control={<Switch color="secondary"
					checked={this.state.needWriteCode}
					onChange={()=>this.setState({needWriteCode:!this.state.needWriteCode})}
					/>}
				  label="Recorder"
				/>
			</ToolbarTooltip>

          </div>
        </div>
        <div className="urlbar">
          <input className="urlInput" ref="url_input"
            value={this.state.url}
            onChange={(event) => { this.setState({ url: event.target.value }) }}
            onKeyPress={this.urlHandleKeypress.bind(this)}
            onFocus={this.urlFocus.bind(this)} />
          <ToolbarTooltip title="Navigate to this URL">
            <IconButton size="small"
              onClick={() => { this.navigateCommand(); }} >
              <FaExternalLinkAlt />
            </IconButton>
          </ToolbarTooltip>
        </div>
      </div>

      <Backdrop id="dialog_handler" style={{ zIndex: 400, top: this.state.backdropHeight }}
        open={this.state.recorderState == 'DIALOG'} >
        <Paper style={{ padding: 30, width: 500, display: 'flex', flexDirection: 'column', }}>
          <DialogTitle id="simple-dialog-title">Dialog appears:</DialogTitle>
          <div>{this.state.dialogMessage}</div>
          {this.state.recorderCommandInProcess ? (<div style={{ paddingTop: 10, paddingBottom: 10, }}>
            While executing command: <br />
            <b>{this.state.recorderCommandInProcess}</b></div>) : undefined}
          <TextField id="standard-basic" label="Your answer to dialog (if applicable)"
            value={this.state.dialogAnswer} onChange={(event) => { this.setState({ dialogAnswer: event.target.value }) }} />
          <div style={{
            paddingTop: 50, paddingBottom: 10,
            display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
          }}>
            <Button variant="contained" onClick={this.dialogAccept} color="primary">
              Accept
			      </Button>
            <Button variant="contained" onClick={this.dialogDismiss}>
              Dismiss
			      </Button>
            <Button variant="contained" onClick={this.dialogDismissForget}>
              Cancel
			      </Button>
          </div>
          <div>
            Accept - accept dialog and write that code into Editor<br />
            Dismiss - dismiss dialog and write that code into Editor<br />
            Cancel - dismiss dialog but do not write anything
		      </div>
        </Paper>
      </Backdrop>

      <Backdrop id="newpage_handler" style={{ zIndex: 400, top: this.state.backdropHeight }}
        open={this.state.recorderState == 'NEWPAGE'} >
        <Paper style={{ padding: 30, width: 600, display: 'flex', flexDirection: 'column', }}>
          <DialogTitle id="simple-dialog-title">New page appears:</DialogTitle>
          <div style={{
            paddingTop: 50, paddingBottom: 10,
            display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
          }}>
            <Button variant="contained" onClick={this.newPageSwitch} color="primary">
              Switch to new
			      </Button>
            <Button variant="contained" onClick={this.newPageDismiss}>
              Do not change
		        </Button>
            <Button variant="contained" onClick={this.newPageForget}>
              Cancel
			      </Button>
          </div>
          <div>
            Switch to new - switch to appeared page and write that code into Editor<br />
            Do not change - activate old page and write that code into Editor<br />
            Cancel - do not write anything
		      </div>
        </Paper>
      </Backdrop>

      <Backdrop id="filechooser_handler" style={{ zIndex: 400, top: this.state.backdropHeight }}
        open={this.state.recorderState == 'FILECHOOSER'} >
        <Paper style={{ padding: 30, width: 500, display: 'flex', flexDirection: 'column', }}>
          <DialogTitle id="simple-dialog-title">File chooser appears:</DialogTitle>
          <div style={{ height: 200, width: '100%', overflowY: 'scroll' }}><ChooseFileTree
		    ref="ChooseFileTree1"
            directory={this.state.mainFolder}
            onNodeSelect={this.choosedFileToUpload}
          /></div>
          <div style={{
            paddingTop: 50, paddingBottom: 10,
            display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
          }}>
            <Button variant="contained" onClick={this.fileChooserAccept}
			  disabled={!this.state.fileNameChoosen} color="primary">
              Choose file
		        </Button>
            <Button variant="contained" onClick={this.fileChooserForget}>
              Cancel
			      </Button>
          </div>
          <div>
            Choose files - attach choosen files<br />
            Cancel - forget about this dialog
		      </div>
        </Paper>
      </Backdrop>

      <Backdrop id="keyboard_handler" style={{ zIndex: 350, top: this.state.backdropHeight }}
        open={this.state.showKeyboard} >
        <Paper style={{ padding: 30, width: 500, display: 'flex', flexDirection: 'column', }}>
          <DialogTitle id="simple-dialog-title">Type into field:</DialogTitle>
          <KeyboardEventHandler handleKeys={['all']}  onKeyEvent={this.handleKeys} style={{ display: 'flex', flexDirection: 'column',}}>
            <TextField id="standard-basic" label="String to send to"
              inputRef={ (el) => { this.keyinput1 = el} }
              value={this.state.keyboardMessage}
              onChange={(event) => {
                if (!this.state.funcKeys) {
                  this.setState({ keyboardMessage: event.target.value })
                }
              }} />
          </KeyboardEventHandler>
          <FormControlLabel
            control={<Checkbox
              checked={this.state.funcKeys}
              onChange={()=>{
                this.setState({funcKeys: !this.state.funcKeys}, ()=>{
                  if (this.state.funcKeys) {
                    setTimeout(this.focusInput, 100);
                  }
                })
              }}
              name="funcKeys" />}
            label="Press as special keys (tab, enter, etc)"
          />
          <div style={{display: this.state.funcKeys ? 'block' : 'block'}}>
            <FormControlLabel
              control={<Checkbox
                checked={this.state.funcKeysGlobal}
                onChange={()=>this.setState({funcKeysGlobal: !this.state.funcKeysGlobal})}
                name="funcKeysGlobal" />}
              label="Send as global page message (to global keyboard)"
            />
          </div>
          <div style={{
            paddingTop: 50, paddingBottom: 10,
            display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
          }}>
            <Button variant="contained" onClick={this.keyboardProceed}
			  disabled={!this.state.keyboardMessage} color="primary">
              Send keys
		        </Button>
            <Button variant="contained" onClick={()=>this.setState({showKeyboard: false})}>
              Cancel
			      </Button>
          </div>
        </Paper>
      </Backdrop>


      <Backdrop id="commandOptions_handler" style={{ zIndex: 350, top: this.state.backdropHeight }}
        open={this.state.commandChooseOptions.length>0} onClick={()=>this.setState({commandChooseOptions: []})}>
        <Paper style={{ padding: 30, width: 500, display: 'flex', flexDirection: 'column', }}>
          <DialogTitle id="simple-dialog-title">Choose command:</DialogTitle>
          <List>
            {this.state.commandChooseOptions.map((item, i)=>{
                return <ListItem button={true} key={i}
                  onClick={(event)=>{this.executeCommandChoosen(item)}}
                  ><ListItemText primary={item.title} /></ListItem>;
              })}
          </List>
          <div style={{
            paddingTop: 10, paddingBottom: 10,
            display: 'flex', flexDirection: 'row', justifyContent: 'center',
          }}>
            <Button variant="contained" onClick={()=>this.setState({commandChooseOptions: []})}>
              Cancel
			      </Button>
          </div>
        </Paper>
      </Backdrop>

	  <Backdrop id="grabDialog_handler" style={{ zIndex: 351, top: this.state.backdropHeight }}
        open={this.state.grabDialog}>
        <Paper style={{ padding: 30, width: 500, display: 'flex', flexDirection: 'column', }}>
          <DialogTitle id="simple-dialog-title">Grab text into variable</DialogTitle>
		  <div style={{paddingBottom:20}}>Please remove unnecessary text and proceed. In text field below should remain only what you require.</div>
		  <TextField label="Required part of text"
              value={this.state.grabRequireText}
              onChange={(event) => {
                  this.setState({ grabRequireText: event.target.value })
              }} />
          <DialogActions>
            <Button onClick={this.grabStage2}
			  disabled={!this.state.grabRequireText} color="primary">
              Grab
		        </Button>
            <Button onClick={()=>this.setState({grabDialog: false})}>
              Cancel
			      </Button>
          </DialogActions>
        </Paper>
      </Backdrop>


      <Backdrop id="inprogreess_wait" ref="backdrop1" style={{ zIndex: 300, top: this.state.backdropHeight }}
        open={this.state.inprogress} onClick={this.backdropClick.bind(this)} >
        <CircularProgress color="inherit" />
      </Backdrop>

      <Backdrop id="is_runnabe" ref="backdrop_runnable" style={{ zIndex: 990, top: 0 }}
        open={!this.state.runnable} >
		<div style={{backgroundColor: '#eee', padding: 20,borderRadius: 10,}}>
			Please open in main Alisko window any test file (*_test.js)
		</div>
      </Backdrop>


      <div id="hiliter" style={{
        zIndex: 100, position: 'fixed', borderColor: 'rgba(0,100,0,0.2)', borderWidth: 2, borderRadius: 8, borderStyle: 'solid',
        top: this.state.hiliter.top, left: this.state.hiliter.left, width: this.state.hiliter.width, height: this.state.hiliter.height,
      }}
      ></div>

      <div id="clickHandler" style={{ zIndex: 200, position: 'absolute', top: this.state.backdropHeight, left: 0, right: 0, bottom: 0, cursor: this.state.hiliter.cursor }}
        onClick={this.imageOnClick} onMouseMove={this.imageMouseMove} onWheel={this.imageWheel}
      ></div>

      <div id="imageBackground" ref="maindiv"><img ref="mainimg" src={this.state.screenshot} /></div>

    </div>);
  }
}


export default RecorderForm;

/*

          <TextField label="URL"
            variant="filled" style={{flexGrow: 1,}} InputProps={{disableUnderline: true}} className={"chidrenRounded"}
            autoFocus={true} onKeyPress={this.urlHandleKeypress.bind(this)}
            value={this.state.url} onChange={(event)=>{this.setState({url: event.target.value})}}/>

*/
