/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import * as React from 'react';

class TabPanel extends React.Component {
    state = {
    }
    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    render() {
        return (<div style={{
            flexGrow: 1, flexShrink: 1,
            display: (this.props.value === this.props.index ? 'flex' : 'none'),
            flexDirection: 'column',
        }}>
            {this.props.children}
        </div>);
    }
}

export default TabPanel;