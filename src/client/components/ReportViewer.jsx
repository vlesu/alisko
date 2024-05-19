/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import * as React from 'react';

import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';

import { VscRefresh } from "react-icons/vsc";

import ToolbarTooltip from './ToolbarTooltip';


class ReportViewer extends React.Component {
	state = {
		txt: '',
	}
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		const scope = this;
	}
	componentWillUnmount() {
	}

	focusEditor() {
		//let editor = this.refs.aceEditor1.editor;
		//editor.focus();
	}

	reloadFile() {
		this.refs.iframe1.src = this.props.fileName; // force reload event over other domain
	}



	// ---------------------------------------------------------------
	render() {
		return (<div style={{ flexGrow: 1, flexShrink: 1, display: 'flex', flexDirection: 'column', }}>
			<div className="toolbar2">
				<ToolbarTooltip title="Reload report ">
					<IconButton size="medium" className="rounded-square"
						onClick={()=>{ this.reloadFile() }} >
						<VscRefresh />
					</IconButton>
				</ToolbarTooltip>
			</div>
			<div style={{ flexGrow: 1, flexShrink: 1, display: 'flex', flexDirection: 'column', }}
			>
				<iframe src={this.props.fileName} sandbox="" ref="iframe1"
					style={{border: 0,flexGrow: 1, flexShrink: 1, display: 'flex',}}></iframe>
			</div>
		</div>);
	}
}

export default ReportViewer;
