/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import * as React from 'react';
//import PropTypes from 'prop-types';

import { TreeView } from '@mui/x-tree-view/TreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import Typography from '@mui/material/Typography';

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
// https://react-icons.github.io/react-icons/icons?name=fa
import { FaRegClock, FaRegCircle, FaRegCheckCircle, FaStop } from 'react-icons/fa';
import { BiXCircle } from "react-icons/bi";

import CircularProgress from '@mui/material/CircularProgress';

const COLOR_GREEN = '#090';
const COLOR_RED = '#a00';
const COLOR_GRAY = '#ccc';


// cheet sheet https://github.com/typescript-cheatsheets/react/blob/main/README.md#basic-cheatsheet-table-of-contents

const DEFAULT_FILE_CONTENT='// Author: You\n// Code dialect: javascript inside VM\n'+
  '// Predefined playwright variables: browser.* , context.* , page.* \n// Available: console.log(*), alisko.*\n\n'

class ProjectFileTree extends React.Component {

	state = {
		data: {},
		menuChoosenNode: undefined,
		menuMode: undefined,
		dialogOpened: false,
		root: 'theroot',
	};

	constructor(props) {
		super(props);
	} // of constructor ----------
	componentDidMount() {
		this.rebuildTree();
	}
	componentDidUpdate(prevProps) {
		if (this.props.directory != prevProps.directory) {
			this.rebuildTree();
		}
	}

	rebuildTree() {
		let root = this.props.directory;

		if (root) {
			window.electronAPI.invoke('scanDirTree', root).then((scanDirTreeResult)=>{
				if (scanDirTreeResult===false) return;
				let o = {
					id: 'theroot',
					path: root,
					name: root,
					eltype: 'dir',
					children: scanDirTreeResult,
				};
				this.setState({
					data: o,
					// root: root,
				});
			})
		}
	}

	createFolder= async () => {
		const scope = this;

		this._showDialog({
			title: 'Create new folder',
			label: 'New folder name',
			ok: 'Create',
			value: '',
		}, (val)=>{
			let newname = window.electronAPI.join(this.state.menuChoosenNode, val);
			if (newname) {
        window.electronAPI.fs('existsSync',[newname]).then((okexists)=>{
					if (okexists) {
						scope._showDialog({
							title: 'Folder already exists',
						});
					} else {
						window.electronAPI.fs('mkdir', [newname], (err)=>{
							if (err) {
								scope._showDialog({
									title: 'Create folder fail',
								});
								return;
							};
							scope.rebuildTree();
						})
					}
				})
			}
		})
	}
	renameFolder= async () => {
		this.renameFile();
	}
	deleteFolder= async () => {
		const scope = this;
		this._showDialog({
			title: 'Delete folder',
			content: 'Delete folder ' +  this._getNameUnderRoot(),
			ok: 'Delete',
		}, (val)=>{
      window.electronAPI.fs('rmdir', [this.state.menuChoosenNode, {recursive:true}], (err)=>{
			//fs.rmdir(this.state.menuChoosenNode, {recursive:true}, (err)=>{
				if (err) {
					scope._showDialog({
						title: 'Remove file fail',
					});
				}
				scope.rebuildTree();
			});
		})
	}
	openFile= async () => {
		this.setState({
			menuMode:undefined,
		}, ()=>{
			this.props.onFileClick(this.state.menuChoosenNode)
		});
	}
	createFileAtRootFolder = async() => {
		this.setState({menuChoosenNode: this.props.directory}, ()=>{
			this.createFile();
		})
	}
	createFile = async () => {
		const scope = this;
		this._showDialog({
			title: 'Create new test',
			label: 'New test name (only name, without suffixes and extensions)',
			ok: 'Create',
			value: '',
		}, (val)=>{
			let newname = window.electronAPI.join(this.state.menuChoosenNode, val);
			if (!newname) return;
			newname = newname + "_test.js";

      window.electronAPI.fs('existsSync',[newname]).then((okexists)=>{
        if (!okexists) {
  				let content = '';
  				//if (newname.endsWith('_test.js')) {
  				content = DEFAULT_FILE_CONTENT;
  				//}
          window.electronAPI.fs('appendFile', [newname, content], (err)=>{
  				//fs.appendFile(newname, content, function (err) {
  					if (err) {
  						scope._showDialog({
  							title: 'Create file fail',
  						});
  						return;
  					};
  					scope.props.onFileClick(newname);
  					scope.rebuildTree();
  				});
  			} else {
  				scope._showDialog({
  					title: 'File already exists',
  				});
  			}
      })
		})
	}
	renameFile= async () => {
		this._showDialog({
			title: 'Rename file',
			label: 'New file name',
			ok: 'Rename',
			value: this._getNameUnderRoot(),
		}, (val)=>{
			let newname = window.electronAPI.join( this.props.directory, val);
      window.electronAPI.fs('rename', [this.state.menuChoosenNode,  newname], (err)=>{
			//fs.rename(this.state.menuChoosenNode,  newname, ()=>{
				this.rebuildTree();
			})
		})
	}
	deleteFile= async () => {
		const scope = this;
		this._showDialog({
			title: 'Delete file',
			content: 'Delete file ' +  this._getNameUnderRoot(),
			ok: 'Delete',
		}, (val)=>{
      window.electronAPI.fs('unlink', [this.state.menuChoosenNode], (err)=>{
			//fs.unlink(this.state.menuChoosenNode, (err)=>{
				if (err) {
					scope._showDialog({
						title: 'Remove file fail',
					});
				}
				scope.rebuildTree();
			});
		})
	}
	_getNameUnderRoot() {
		return this.state.menuChoosenNode.substring( this.props.directory.length + 1);
	}

	showResultOfFile= async () => {
		this.setState({
			menuMode:undefined,
		}, ()=>{
      window.electronAPI.invoke('getLogFileNameOf', [this.state.menuChoosenNode, this.props.directory]).then((reportName)=>{
        window.electronAPI.fs('existsSync',[reportName]).then((okexists)=>{
          his.props.onFileClick(reportName);
        })
			})
      /*
			let reportName = getLogFileNameOf(this.state.menuChoosenNode, this.props.directory);
			if (fs.existsSync(reportName)) {
				this.props.onFileClick(reportName);
			}
      */
		});
	}

	// dialog specs
	_showDialog({title, content, label, ok, value}, okCallback) {
		this.dialogDone = okCallback;
		this.setState({
			menuMode:undefined,
			dialogOpened: true,
			dialogTitle: title,
			dialogText: content,
			dialogLabel: label,
			dialogValue: value,
			dialogAction: ok,
		})
	}
	_dialogDone = async () =>{
		this.setState({
			dialogOpened: false,
		}, ()=>{
			this.dialogDone(this.state.dialogValue);
		});
	}


	renderOneTree(nodes) {
		return (<TreeItem
					onClick={() => {
						if (nodes.eltype == 'file') {
							this.props.onFileClick(nodes.path);
						}
					}}
					onContextMenu={(e)=>{
						e.stopPropagation();
						this.setState({
							mouseX: event.clientX - 2,
							mouseY: event.clientY - 4,
							menuChoosenNode: nodes.path,
							menuMode: nodes.id=='theroot'?'dir_root': nodes.eltype + ( nodes.path.endsWith("_test.js") ? "_test" : ""),
						});
					}}
			key={nodes.id}
			nodeId={nodes.id}
			classes={{ root: 'fileTreeRoot', label: 'fileTreeLabel' }}
			label={<div style={{ display: 'flex', }}>
				{nodes.eltype == 'file' ? (
					<Typography variant="caption" className="labelmark">
						{nodes.path in this.props.kernels ? // kernel opened, state running or depends on result
							( this.props.kernels[nodes.path].state == 'running' ?  <CircularProgress size={12}/> :
								(this.props.kernels[nodes.path].result=='pass' ? <FaStop color={COLOR_GREEN} /> :
								  (this.props.kernels[nodes.path].result=='fail' ? <FaStop color={COLOR_RED} /> :
									 this.props.kernels[nodes.path].result=='inqueue' ? <FaRegClock color={COLOR_RED} /> :
									   <FaStop color={COLOR_GRAY} /> ) ) )
						  : ( nodes.path in this.props.results ? // kernel closed, result persist
								(this.props.results[nodes.path].result =='pass' ? <FaRegCheckCircle color={COLOR_GREEN} /> :
								 (this.props.results[nodes.path].result =='fail' ? <BiXCircle color={COLOR_RED} /> :
								   this.props.results[nodes.path].result=='inqueue' ? <FaRegClock color={COLOR_GRAY} /> :
								   <FaRegCircle color={COLOR_GRAY} /> ) )
							// kernel closed, result not found - just gray if file
						    : (nodes.eltype == 'file' && nodes.path.endsWith("_test.js")  ? <FaRegCircle color={COLOR_GRAY} /> : undefined) )  }
					</Typography>
				): undefined}
				<Typography variant="body2">
					{nodes.name}
				</Typography>
			</div>}
		>
			{Array.isArray(nodes.children) ? nodes.children.map((node) => this.renderOneTree(node)) : null}
		</TreeItem>);
	}

	render() {
		return (
			<div style={{ flexGrow: 1, flexShrink: 0, flexDirection: 'column', display: 'flex', position: 'relative' }}>
				<div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'stretch'}}>
					<TreeView
						defaultCollapseIcon={<ExpandMoreIcon />}
						defaultExpanded={[this.state.root]}
						defaultExpandIcon={<ChevronRightIcon />}
						disableSelection={true}
						style={{display: 'flex',overflowY: 'auto',overflowX: 'hidden'}}
						classes={{ root: 'fileTreeRoot' }}
					>
						{this.state.data.id ? this.renderOneTree(this.state.data) : 'Not found'}
					</TreeView>
					<Menu
						open={this.state.menuMode=='dir_root'}
						onClose={()=>{this.setState({menuMode:undefined})}}
						anchorReference="anchorPosition"
						anchorPosition={this.state.mouseY >= null && this.state.mouseX >= null
							? { top: this.state.mouseY, left: this.state.mouseX }
							: undefined}
						keepMounted
						>
						<MenuItem onClick={this.createFile}>Create test file</MenuItem>
						<MenuItem onClick={this.createFolder}>Create subfolder</MenuItem>
					</Menu>
					<Menu
						open={this.state.menuMode=='dir'}
						onClose={()=>{this.setState({menuMode:undefined})}}
						anchorReference="anchorPosition"
						anchorPosition={this.state.mouseY >= null && this.state.mouseX >= null
							? { top: this.state.mouseY, left: this.state.mouseX }
							: undefined}
						keepMounted
						>
						<MenuItem onClick={this.createFile}>Create test file</MenuItem>
						<MenuItem onClick={this.createFolder}>Create subfolder</MenuItem>
						<MenuItem onClick={this.renameFolder}>Rename</MenuItem>
						<MenuItem onClick={this.deleteFolder}>Delete this folder</MenuItem>
					</Menu>
					<Menu
						open={this.state.menuMode=='file'}
						onClose={()=>{this.setState({menuMode:undefined})}}
						anchorReference="anchorPosition"
						anchorPosition={this.state.mouseY >= null && this.state.mouseX >= null
							? { top: this.state.mouseY, left: this.state.mouseX }
							: undefined}
						keepMounted
						>
						<MenuItem onClick={this.openFile}>Open this file</MenuItem>
						<MenuItem onClick={this.renameFile}>Rename</MenuItem>
						<MenuItem onClick={this.deleteFile}>Delete this file</MenuItem>
					</Menu>
					<Menu
						open={this.state.menuMode=='file_test'}
						onClose={()=>{this.setState({menuMode:undefined})}}
						anchorReference="anchorPosition"
						anchorPosition={this.state.mouseY >= null && this.state.mouseX >= null
							? { top: this.state.mouseY, left: this.state.mouseX }
							: undefined}
						keepMounted
						>
						<MenuItem onClick={this.openFile}>Edit this file</MenuItem>
						<MenuItem onClick={this.renameFile}>Rename</MenuItem>
						<MenuItem onClick={this.deleteFile}>Delete this file</MenuItem>
						<Divider />
						<MenuItem onClick={this.showResultOfFile}>Show test results</MenuItem>
					</Menu>
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
						<Button onClick={this._dialogDone} color="primary">
							{this.state.dialogAction}
						</Button>
						<Button onClick={()=>this.setState({dialogOpened:false})} color="primary">
							Cancel
						</Button>
						</DialogActions>
					</Dialog>
				</div>
			</div>);
	}
}

export default ProjectFileTree;
 //
  // 		onLabelClick={this.props.onFileClick}

  /*



  */
