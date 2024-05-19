/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/

import './index.css';

import React from 'react';

//import ReactDOM from 'react-dom';
import RecorderApp from './recorderapp';

//ReactDOM.render(<RecorderApp />, document.getElementById('root'));

import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(<RecorderApp tab="home" />);
