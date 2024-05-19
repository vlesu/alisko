/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import * as React from 'react';
import Tooltip from '@mui/material/Tooltip';

class ToolbarTooltip extends React.Component {
	render() {
		return (<Tooltip title={this.props.title} enterDelay={1500}>
			{this.props.children}
		</Tooltip>);
	}
}

export default ToolbarTooltip;