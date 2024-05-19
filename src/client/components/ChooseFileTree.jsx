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

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
// https://react-icons.github.io/react-icons/icons?name=fa
import { FaRegClock, FaRegCircle, FaRegCheckCircle } from 'react-icons/fa';

// cheet sheet https://github.com/typescript-cheatsheets/react/blob/main/README.md#basic-cheatsheet-table-of-contents

class ChooseFileTree extends React.Component {

	state = {
		data: {},
		results: {},
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

	renderOneTree(nodes) {
		return (<TreeItem
			key={nodes.id}
			nodeId={nodes.id}
			label={nodes.name}
		>
			{Array.isArray(nodes.children) ? nodes.children.map((node) => this.renderOneTree(node)) : null}
		</TreeItem>);
	}

	render() {
		return (<div>
			<TreeView
				defaultCollapseIcon={<ExpandMoreIcon />}
				defaultExpanded={['theroot']}
				defaultExpandIcon={<ChevronRightIcon />}
				disableSelection={false}
				onNodeSelect={(event,value)=>this.props.onNodeSelect(value)}
			>
				{this.state.data.id ? this.renderOneTree(this.state.data) : 'Not found'}
			</TreeView>
		</div>);
	}
}

export default ChooseFileTree;
