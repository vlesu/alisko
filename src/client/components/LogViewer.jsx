/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import * as React from 'react';


class LogViewer extends React.Component {
	state = {
		txt: ''
	}
	mounted = false;
	lastMovingArrow = undefined;

	constructor(props) {
		super(props);

	}
	componentDidMount() {
		this.runLogEvent = this.runLogEvent.bind(this);
		this.runLogEventRemoveListerner = window.electronAPI.on('run-log', this.runLogEvent);
		this.renewHiliteEvent = this.renewHiliteEvent.bind(this);
		this.renewHiliteEventRemoveListerner =window.electronAPI.on('kernel-renew-hilite', this.renewHiliteEvent); 
		this.mounted = true;
	}
	componentWillUnmount() {
		this.mounted = false;
		//window.electronAPI.removeListener('run-log', this.runLogEvent);
		//window.electronAPI.removeListener('kernel-renew-hilite', this.renewHiliteEvent);
		this.runLogEventRemoveListerner();
		this.renewHiliteEventRemoveListerner();
	}

	renewHiliteEvent(param) {
		const { kernelName, msg, inprocess } = param;
		if (this.mounted && kernelName == this.props.kernelName) {
			if (this.lastMovingArrow) { // re-emit event
				window.electronAPI.emit('move-running-arrow+'+kernelName, this.lastMovingArrow);
			}
		}
	}


	runLogEvent(event, param) {
		const { kernelName, msg, inprocess, styleName } = param;
		if (this.mounted && kernelName == this.props.kernelName) {
			this.log(msg, styleName);
			if (inprocess) {
				window.electronAPI.emit('move-running-arrow+'+kernelName, param);
				this.lastMovingArrow = param;
			}
		}
	}
	log(msg, styleName='') {
		/*
		this.setState((prevState, props) => ({
			txt: prevState.txt + msg + '\n',
		}));
		 {this.state.txt}
		 */
		this.refs.mainout.innerHTML += "<div class='log_"+styleName+"'>" + msg + "</div>\n";
		this.refs.logend.scrollIntoView({ behavior: "smooth" });
	}

	render() {
		return (<div style={{ overflowY: 'scroll', overflowX: 'scroll', minHeight: '100%', backgroundColor: '#f0f0f0' }}>
			<div style={{ padding: 5, }}>Output:</div>
			<div style={{ padding: 5, }} ref="mainout"></div>
			<div ref="logend"></div>
		</div>);
	}

}

export default LogViewer;
