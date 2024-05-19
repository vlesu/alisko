/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import * as React from 'react';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';

import Icon from '@mui/material/Icon';
import SaveIcon from '@mui/icons-material/Save';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import { GiFootprint, GiStopSign, GiPauseButton } from "react-icons/gi";
import { RiFootprintFill, RiRunLine, RiPlayFill } from "react-icons/ri";
import { MdUndo, MdRedo } from "react-icons/md";
import { GiHalt } from "react-icons/gi";
import { CgCloseR }  from "react-icons/cg";
import { FaStop } from "react-icons/fa";



import AceEditor from "react-ace";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/snippets/javascript";
import "ace-builds/src-noconflict/theme-github";
import 'ace-builds/src-min-noconflict/ext-searchbox';
// https://github.com/securingsincity/react-ace/blob/master/docs/FAQ.md#how-do-i-add-language-snippets

import ToolbarTooltip from './ToolbarTooltip';


class CodeEditor extends React.Component {
	state = {
		txt: '',
		animateMode: false,
		aceMode: 'text',
		haltEnabled: true,
		markers: []
	}
	constructor(props) {
		super(props);
		this.myRef = React.createRef();
	}

	componentDidMount() {
		const scope = this;
		//fs.readFile(this.props.fileName, 'utf8', function (err, data) {
		window.electronAPI.fs('readFile',[this.props.fileName, 'utf8'], (data)=>{
			//if (err) {
			//	console.log('File read error', err);
			//	return;
			//}
			let isRunnable = scope.props.fileName.toLowerCase().endsWith("_test.js");
			let aceMode = scope.props.fileName.toLowerCase().endsWith(".js") ? 'javascript' : 'text';
			if (isRunnable) {
				// last line of text always should be empty
				if (!data.endsWith("\n")) {
					data+="\n";
				}
			}
			scope.setState({
				txt: data,
				isRunnable: isRunnable,
				aceMode: aceMode,
				defaultTxt: data,
				changed: false,
			}, ()=>{
			   let editor = scope.refs.aceEditor1.editor;
			   scope.clearUndoHistory(editor);
			});
		});
		this.addCodeLine = this.addCodeLine.bind(this);
		this.addCodeLineRemoveListener =window.electronAPI.on('recorder-add-code-line+'+this.props.fileName, this.addCodeLine);
		this.nextLine = this.nextLine.bind(this);
		this.nextLineRemoveListener =window.electronAPI.on('editor-newline+'+this.props.fileName, this.nextLine);
		this.onRuntimeError = this.onRuntimeError.bind(this);
		this.onRuntimeErrorRemoveListener =window.electronAPI.on('editor-runtime-error+'+this.props.fileName, this.onRuntimeError);
		this.fileSaveClose = this.fileSaveClose.bind(this);
		this.fileSaveCloseRemoveListener =window.electronAPI.on('file-save-close+'+this.props.fileName, this.fileSaveClose);
		this.kernelStateChanged = this.kernelStateChanged.bind(this);
		this.kernelStateChangedRemoveListener =window.electronAPI.on('kernel-state-changed+'+this.props.fileName, this.kernelStateChanged);
		this.moveRunningArrow = this.moveRunningArrow.bind(this);
		this.moveRunningArrowRemoveListener =window.electronAPI.on('move-running-arrow+'+this.props.fileName, this.moveRunningArrow);
		this.focusEditor = this.focusEditor.bind(this);
		this.focusEditorRemoveListener = window.electronAPI.on('editor-focus-'+this.props.fileName, this.focusEditor);
		this.vplsitResized = this.vplsitResized.bind(this);
		this.vplsitResizedRemoveListener = window.electronAPI.on('vsplit-resize+'+this.props.fileName, this.vplsitResized);
	}
	componentWillUnmount() {
		//window.electronAPI.removeListener('recorder-add-code-line+'+this.props.fileName, this.addCodeLine);
		//window.electronAPI.removeListener('editor-newline+'+this.props.fileName, this.nextLine);
		//window.electronAPI.removeListener('editor-runtime-error+'+this.props.fileName, this.onRuntimeError);
		//window.electronAPI.removeListener('file-save-close+'+this.props.fileName, this.fileSaveClose);
		//window.electronAPI.removeListener('kernel-state-changed+'+this.props.fileName, this.kernelStateChanged);
		//window.electronAPI.removeListener('move-running-arrow+'+this.props.fileName, this.moveRunningArrow);
		//window.electronAPI.removeListener('editor-focus-'+this.props.fileName, this.focusEditor);
		//window.electronAPI.removeListener('vsplit-resize+'+this.props.fileName, this.vplsitResized);
		this.addCodeLineRemoveListener();
		this.nextLineRemoveListener();
		this.onRuntimeErrorRemoveListener();
		this.fileSaveCloseRemoveListener();
		this.kernelStateChangedRemoveListener();
		this.moveRunningArrowRemoveListener();
		this.focusEditorRemoveListener();
		this.vplsitResizedRemoveListener();
	}

	clearUndoHistory = async (editor)=>{
	    // let editor = this.refs.aceEditor1.editor;
		const session = editor.getSession();
		const undoManager = session.getUndoManager();
		undoManager.reset();
		session.setUndoManager(undoManager);
	}

	focusEditor() {
		let editor = this.refs.aceEditor1.editor;
		editor.focus();
	}

	fileSaveClose() {
		let scope = this;
		this.saveFile((err)=>{
			if (!err) {
				window.electronAPI.emit('file-saved-need-close', {fileName: scope.props.fileName} );
			}
		})
	}

	vplsitResized(event, param) {
		let editor = this.refs.aceEditor1.editor;
		editor.resize();
	}

	kernelStateChanged(param) {
		// TBD - change avaiability of HALT button
		// TBD - move arrow and cursor on state not "running"
	}
	moveRunningArrow(param) {
		this.setState({markers: [{
			startRow: param.line-1, // 0-based
			type: "line",
			className: "CUSTOMMARK"
		}]})
	}

	addCodeLine(event, params) {
		// console.log('@addCodeLine',params);
		const {code,lineDelta} = params;
		if (code.trim() == "") return;
		let editor = this.refs.aceEditor1.editor;
		let lineNum = editor.getSelectionRange().start.row; // our line number BEFORE code insertion (assume we at start of line)
		var lasColumn = editor.session.getLine(lineNum).length; // or simply Infinity

		editor.gotoLine(lineNum+1+lineDelta, 0); // go line where we plan to insert (for most cases, beginning of current line)
		editor.insert(code + '\n');
		let lineNum2 = editor.getSelectionRange().start.row; // start line of insertion ( linenum+1 ? )
		// editor.gotoLine(lineNum2+1+lineDelta, 0); // ge next line after inserion
		let lineNum3 = editor.getSelectionRange().end.row; // final line of insertion (for two-line code will be lineNum+2)
		let insertedRowsCount = code.split("\n").length;
		editor.gotoLine(lineNum+1+insertedRowsCount, 0); // ge next line after inserion
		this.setState({markers: []});

		//editor.gotoLine(lineNum+1+lineDelta, Infinity);
		//editor.insert('\n' + code);
		//let lineNum2 = editor.getSelectionRange().start.row;
		//editor.gotoLine(lineNum2+1-lineDelta, Infinity);

		// https://ace.c9.io/api/editor.html#Editor.getSession
		// https://github.com/securingsincity/react-ace
	}

	saveFile(cbFunc) {
		const scope = this;
		//fs.writeFile(this.props.fileName, this.state.txt, 'utf8', function (err) {
		window.electronAPI.fs('writeFile',[this.props.fileName, this.state.txt, 'utf8'], (err)=>{
			if (err) {
				console.log('File write error', err);
			} else {
				scope.setState({defaultTxt: scope.state.txt, changed: false,});
				window.electronAPI.emit('file-changed', {fileName: scope.props.fileName, changed: false} );
			}
			if (cbFunc) {
				cbFunc(err);
			}
		})
	}

	// построчный запуск и анимированный запуск ------------------------
	runOneLine() {
		let editor = this.refs.aceEditor1.editor;
		const selectedText = editor.getSelectedText();
		let lineNum = editor.getSelectionRange().start.row;
		let endLineNum = editor.getSelectionRange().end.row;
		let code;
		if (selectedText) { // some code selected
			code = selectedText;
		} else { // no code selected - run one line selected
			code = editor.session.getLine(lineNum);
		}

		let kernelName = this.props.fileName;
		window.electronAPI.invoke('run-code', { kernelName, code, lineNum, endLineNum });
	}
	runFile() {
		let editor = this.refs.aceEditor1.editor;
		let code = this.state.txt
		let lineNum = 0;
		let endLineNum = editor.session.doc.getLength();
		let kernelName = this.props.fileName;
		window.electronAPI.invoke('run-code', { kernelName, code, lineNum, endLineNum, restart: true });

	}
	runHalt() {
		this.setState({animateMode: false}, ()=>{
			let kernelName = this.props.fileName;
			window.electronAPI.invoke('halt-code', { kernelName });
		})
	}
	stopKernel () {
		this.setState({animateMode: false}, ()=>{
			let kernelName = this.props.fileName;
			window.electronAPI.invoke('halt-code', { kernelName });
			window.electronAPI.invoke('kernel-stop', { kernelName });
		});
	}
	changeAnimateMode() {
		this.setState({ animateMode: !this.state.animateMode }, () => {
			if (this.state.animateMode) {
				this.runOneLine();
			}
		});
	}
	nextLine(event, params) {
		const {line} = params;
		let editor = this.refs.aceEditor1.editor;
		let lineNum = editor.getSelectionRange().start.row;
		let lastLineNum = editor.session.doc.getLength();
		if (line+1 < lastLineNum) {
			editor.gotoLine(line+2, 0);
			if (this.state.animateMode) {
				this.runOneLine();
			}
		} else {
			this.setState({animateMode: false});
		}
	}
	onRuntimeError(event, params) {
		const {line, column} = params;
		this.setState({animateMode: false});
		if (line>=0) {
			let editor = this.refs.aceEditor1.editor;
			editor.gotoLine(line, column);
			editor.focus();
		}
	}
	editorUndo = async()=>{
		let editor = this.refs.aceEditor1.editor;
		editor.undo();
	}
	editorRedo = async()=>{
		let editor = this.refs.aceEditor1.editor;
		editor.redo();
	}
	aceChanged = async (value, event) => {
		let isChanged = !(value == this.state.defaultTxt);
		let requireInform = this.state.changed != isChanged;
		if (this.state.isRunnable) {
			// last line of text always should be empty
			if (!value.endsWith("\n")) {
				value+="\n";
			}
		}
		this.setState({ txt: value, changed: isChanged}, ()=>{
			if (requireInform) {
				window.electronAPI.emit('file-changed', {fileName: this.props.fileName, changed: isChanged} );
			}
		});
	}

	// ---------------------------------------------------------------
	render() {
		return (<div style={{ flexGrow: 1, flexShrink: 1, display: 'flex', flexDirection: 'column', }}>
			<div className="toolbar2">
				<ToolbarTooltip title="Save file  (Ctrl+S)">
					<IconButton size="medium" className="rounded-square"
						onClick={()=>{ this.saveFile() }} >
						<SaveIcon />
					</IconButton>
				</ToolbarTooltip>
				<ToolbarTooltip title="Undo (Ctrl+Z)">
					<IconButton size="medium" className="rounded-square"
						onClick={this.editorUndo} >
						<MdUndo />
					</IconButton>
				</ToolbarTooltip>
				<ToolbarTooltip title="Redo (Ctrl+R)">
					<IconButton size="medium" className="rounded-square"
						onClick={this.editorRedo} >
						<MdRedo />
					</IconButton>
				</ToolbarTooltip>
				{this.state.isRunnable ? (<div style={{display: 'flex',flexDirection: 'row',}}>
				<Divider orientation="vertical" flexItem className="paddedDivider"/>

				<ToolbarTooltip title="Run one active line, or run selected text (F8)">
					<IconButton size="medium" className="rounded-square"
						onClick={this.runOneLine.bind(this)} >
						<RiFootprintFill />
					</IconButton>
				</ToolbarTooltip>
				<ToolbarTooltip title="Animate line-by-line">
					<ToggleButton
						value="check" style={{ border: 'none', }} size="small" className="rounded-square"
						selected={this.state.animateMode}
						onChange={() => {
							this.changeAnimateMode();
						}}
					>
						<RiRunLine size="32"/>
					</ToggleButton>
				</ToolbarTooltip>
				<ToolbarTooltip title="Restart kernel and Run whole file from the first line">
					<IconButton size="medium" className="rounded-square"
						onClick={this.runFile.bind(this)} >
						<RiPlayFill />
					</IconButton>
				</ToolbarTooltip>
				<ToolbarTooltip title="Stop execution">
					<IconButton size="medium" className="rounded-square"
						disabled={!this.state.haltEnabled}
						onClick={this.runHalt.bind(this)} >
						<GiPauseButton />
					</IconButton>
				</ToolbarTooltip>
				<ToolbarTooltip title="Stop and close JS kernel">
					<IconButton size="medium" className="rounded-square"
						onClick={this.stopKernel.bind(this)} >
						<CgCloseR />
					</IconButton>
				</ToolbarTooltip>
				</div>) : undefined}
			</div>
			<div style={{ flexGrow: 1, flexShrink: 1, display: 'flex', flexDirection: 'column', }}
			>
				<AceEditor
					ref="aceEditor1"
					value={this.state.txt}
					markers={this.state.markers}
					mode={this.state.aceMode}
					theme="github"
					onChange={this.aceChanged}
					name="UNIQUE_ID_OF_DIV"
					editorProps={{
						$blockScrolling: true,
					}}
					setOptions={{
						useWorker: false,
						enableBasicAutocompletion: true,
						enableLiveAutocompletion: true,
						enableSnippets: true,
						showGutter: true,
						highlightActiveLine: true,
					}}
					showPrintMargin={false}
					height="100%"
					width="100%"
					commands={[
					  {
						name: 'Save',
						bindKey: {win: 'Ctrl-s', mac: 'Command-s'},
						exec: () => { this.saveFile() }
					  },
					  {
						name: 'Run one line',
						bindKey: {win: 'F8', mac: 'F8'},
						exec: () => { this.runOneLine() }
					  },
					  ]}
					onLoad={this.clearUndoHistory}
				/>
			</div>
		</div>);
	}
}

export default CodeEditor;
