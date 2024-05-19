/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import * as React from 'react';

import Button from '@mui/material/Button';
import FolderOpen from '@mui/icons-material/FolderOpen';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { MdEdit } from "react-icons/md";


const MAXLEN = 20;

class TabLabel extends React.Component {
    state = {
    }
    constructor(props) {
        super(props);
    }

    render() {
		/*  <span > 
		*/
        return (<span style={{whiteSpace: 'nowrap'}}  className="theTab">
                {this.props.filechanged ? (
                    <MdEdit style={{paddingRight: 7}}/>
                ) : undefined}
				{this.props.label.length>MAXLEN ? 
					this.props.label.substring(0,MAXLEN)+"..." 
					: this.props.label}
			<IconButton size="small" edge="end" className="inTabX"
				onClick={() => { this.props.onClickClose(this.props.value) }}>
                <CloseIcon />
            </IconButton>
		</span>);
      }
}

export default TabLabel;