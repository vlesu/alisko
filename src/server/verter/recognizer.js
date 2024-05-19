/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import { app } from 'electron';

// instantiate tensorflow.js from raw node_modules
const isDev = !app.isPackaged; // require('electron-is-dev');
const path = require('path');
const fs = require('fs');

// const sharp = require("sharp");
const PNG = require("pngjs").PNG;

const resources_paths = [
	"../../../../resources",
	"../../resources",
	path.resolve(app.getAppPath(), '../../resources'),
	path.resolve(app.getAppPath(), 'resources'),
];
let ort;
let ort_resolved = false;
for (const res_path of resources_paths) {
    let coderootfoldr =res_path.replace(/\\/g,"/");
		let onnxrootfoldr = coderootfoldr+"/node_modules/onnxruntime-node";
		console.log('trying onnxruntime root folder = ', onnxrootfoldr);
		try {
			ort = eval('require("'+onnxrootfoldr+'")');
			ort_resolved = true;
			console.log(' ...OK!');
			break;
		} catch (e) {
			console.log(' ...fail');
			continue;
		}
}

if (!ort_resolved)  {
	throw 'onnxruntime-node not found';
}

/*
// let coderootfoldr = isDev ? "../../resources" : "../../../../resources";
console.log('isDev = ', isDev ? true : false);
let coderootfoldr = "../../../../resources";
// let coderootfoldr = isDev ? "../../resources" : path.resolve(app.getAppPath(), '../../resources');
coderootfoldr = coderootfoldr.replace(/\\/g,"/");
let onnxrootfoldr = coderootfoldr+"/node_modules/onnxruntime-node";
console.log('onnxruntime root folder = ', onnxrootfoldr)
//const ort = eval('require("../../resources/node_modules/onnxruntime-node")');
const ort = eval('require("'+onnxrootfoldr+'")');
*/

// https://dev.to/andreygermanov/how-to-create-yolov8-based-object-detection-web-service-using-python-julia-nodejs-javascript-go-and-rust-4o8e#nodejs
// !!!!!!!!!!!!!!!!!!!
class IconRecognizer {
	constructor(processor, modelPath = "./resources/models", versions = ["20240106"]) {
		if (!isDev) {
			modelPath = path.resolve(app.getAppPath(), '../../'+modelPath);
		}
		this._processor = processor;
        this.models = {};
        this.loadModels(modelPath, versions);
    }

    async loadModels(modelPath, versions) {
			  // TBD load recent available model?
				let modelFullPath = modelPath + '/icons/20240219_1280.onnx'
				console.log('%%% loading model:',modelFullPath);
				this.icon_detection_model = await ort.InferenceSession.create(modelFullPath);
				console.log('%%% model ready');
    }

    async recognize(imgbuf, options) {
			// TBD
			console.log('recognition options = ', options)
			const yolo_classes = ["attach", "bag", "bell", "calendar", "cart", "chat", "clock", "dislike", "down", "exit", "gear", "globe", "heart", "key", "left", "lightning", "like", "menu", "no", "ok", "person", "plus", "point", "power", "resend", "right", "search", "settings", "share", "star", "switch", "translate", "trash", "up", "volume", "warning", "wrench", "x"];
			const prob_thresold = 0.5;
			const image_size = 1280;

			// prepare input using pngjs - DO not RESAMPLE ?!
			var png = PNG.sync.read(imgbuf);
			const [img_width,img_height] = [png.width, png.height];
			const pngdata = png.data;
			//console.log(png);
			const red = [], green = [], blue = [];
			for (var y = 0; y < image_size; y++) {
	      for (var x = 0; x < image_size; x++) {
					if (x<img_width && y<img_height) {
						var idx = (img_width * y + x) << 2;
						red.push(pngdata[idx]/255.0);
						green.push(pngdata[idx+1]/255.0);
						blue.push(pngdata[idx+2]/255.0);
					} else { // padding
						red.push(0);
		        green.push(0);
		        blue.push(0);
					}
	      }
	    }
	    const input = [...red, ...green, ...blue];

			// prepare input using sharp
			/*
			const img = sharp(imgbuf);
			const md = await img.metadata();
			const [img_width,img_height] = [md.width, md.height];
			console.log('img metadata=',md)
			const pixels = await img.removeAlpha()
					.resize({width:image_size,height:image_size,fit:'fill'})
					.raw()
					.toBuffer();
			const red = [], green = [], blue = [];
	    for (let index=0; index<pixels.length; index+=3) {
	        red.push(pixels[index]/255.0);
	        green.push(pixels[index+1]/255.0);
	        blue.push(pixels[index+2]/255.0);
	    }
	    const input = [...red, ...green, ...blue];
			*/

			// run model
			const input_t = new ort.Tensor(Float32Array.from(input),[1, 3, image_size, image_size]);
	    const outputs = await this.icon_detection_model.run({images:input_t});
	    const output = outputs["output0"].data;


			// parse output
			const classes_count = yolo_classes.length;
			console.log('output len = ', output.length);
			// total len = 352800, classes = 38 + coords 4 = 42 floats per row, 8400 rows for 640x640
			let boxes = [];
			console.log('result rows = ', output.length / (classes_count+4));
			let result_rows = output.length / (classes_count+4); // 8400; for 640x640
			for (let index=0;index<result_rows;index++) {
					 const [class_id,prob] = [...Array(classes_count).keys()]
							 .map(col => [col, output[result_rows*(col+4)+index]])
							 .reduce((accum, item) => item[1]>accum[1] ? item : accum,[0,0]);
					 if (prob < prob_thresold) {
							 continue;
					 }
					 const label = yolo_classes[class_id];
					 const xc = output[index];
					 const yc = output[result_rows+index];
					 const w = output[2*result_rows+index];
					 const h = output[3*result_rows+index];
					 // for pngjs
					 const x1 = (xc-w/2);
					 const y1 = (yc-h/2);
					 const x2 = (xc+w/2);
					 const y2 = (yc+h/2);
					 // for sharp
					 /*
					 const x1 = (xc-w/2)/image_size*img_width;
					 const y1 = (yc-h/2)/image_size*img_height;
					 const x2 = (xc+w/2)/image_size*img_width;
					 const y2 = (yc+h/2)/image_size*img_height;
					 */
					 boxes.push([x1,y1,x2,y2,label,prob]);
			 }


			 boxes = boxes.sort((box1,box2) => box2[5]-box1[5])
			 const result = [];
			 while (boxes.length>0) {
					 //result.push(boxes[0]);
					 let box = boxes[0];
					 result.push({
							 x0:box[0],
							 x1:box[2],
							 y0:box[1],
							 y1:box[3],
							 confidence:box[5],
							 classname:box[4],
					 });
					 console.log('%%% box', box);
					 boxes = boxes.filter(box => iou(boxes[0],box)<0.7);
			 }
        return result;
    }
}

function iou(box1,box2) {
    return intersection(box1,box2)/union(box1,box2);
}

function union(box1,box2) {
    const [box1_x1,box1_y1,box1_x2,box1_y2] = box1;
    const [box2_x1,box2_y1,box2_x2,box2_y2] = box2;
    const box1_area = (box1_x2-box1_x1)*(box1_y2-box1_y1)
    const box2_area = (box2_x2-box2_x1)*(box2_y2-box2_y1)
    return box1_area + box2_area - intersection(box1,box2)
}

function intersection(box1,box2) {
    const [box1_x1,box1_y1,box1_x2,box1_y2] = box1;
    const [box2_x1,box2_y1,box2_x2,box2_y2] = box2;
    const x1 = Math.max(box1_x1,box2_x1);
    const y1 = Math.max(box1_y1,box2_y1);
    const x2 = Math.min(box1_x2,box2_x2);
    const y2 = Math.min(box1_y2,box2_y2);
    return (x2-x1)*(y2-y1)
}

export default IconRecognizer;
