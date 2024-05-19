/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


import { escapeDouble, escapeSingle, normalizeText, NONNONNONEXISTENT } from './utils';


class Predictor {
    async predictCommand({ kernel, command, param }) {

        if (command == 'page.goto') {
            if (!(param.startsWith("http://") || param.startsWith("https://"))) {
                param = "http://" + param;
            }
            return {
                commandCode: 'await page.goto("' + escapeDouble(param) + '");',
                trapMode: true,
            }
        }

        if (command == 'dialog.accept') {
    			if (param.commandInProcess) { // sync dialog appears
    	            return {
          					commandCode:'await page.waitForEvent("dialog").then( (d)=>{ d.accept("'+escapeDouble(param.msg)+'"); return true } );',
          					writeableCode:'page.once("dialog", (d)=>d.accept("'+escapeDouble(param.msg)+'") );\n' + param.commandInProcess,
          				};
  	      } else { // async dialog appears
  	            return {
        					commandCode:'await page.waitForEvent("dialog").then( (d)=>d.accept("'+escapeDouble(param.msg)+'") );',
        				};
			     }
        }
        if (command == 'dialog.dismiss') {
			if (param.commandInProcess) { // sync dialog appears
	            return {
					commandCode:'await page.waitForEvent("dialog").then( (d)=>{ d.dismiss(); return true } );',
					writeableCode:'page.once("dialog", (d)=>d.dismiss() );\n' + param.commandInProcess,
				};
			} else { // async dialog appears
	            return {
					commandCode:'await page.waitForEvent("dialog").then( (d)=>d.dismiss() );',
				};
			}
        }
        if (command == 'dialog.forget') {
            return {
				commandCode:'await page.waitForEvent("dialog").then( (d)=>d.dismiss() );',
				writeableCode:'',
			};
        }

        if (command == 'newpage.switch') { // always async
			return {
				commandCode:'await context.waitForEvent("page").then( (p)=>{page=p; page.bringToFront() } );alisko._setStateReady();',
				writeableCode:'await context.waitForEvent("page").then( (p)=>{page=p; page.bringToFront() } );', // await context.waitForEvent("page");\n  ?
			};
        }
        if (command == 'newpage.dismiss') { // always async
			return {
				commandCode:'await page.bringToFront();alisko._setStateReady();',
				writeableCode:'await page.bringToFront();',
			};
        }
        if (command == 'newpage.forget') {
            return {
				commandCode:'alisko._setStateReady();',
				writeableCode:'',
			};
        }

        if (command == 'filechooser.accept') {
       // TBD if file single
            return {
				commandCode:'await page.waitForEvent("filechooser").then( (f)=>{f.setFiles(alisko.getRootFolder()+"'+escapeDouble(param.file)+'") } );alisko._setStateReady();',
				writeableCode:'page.once( "filechooser", (f)=>f.setFiles( alisko.getRootFolder() + "'+escapeDouble(param.file)+'" ) );',
				writebaleLine: -1,
			};
        }
        if (command == 'filechooser.forget') {
            return {
				commandCode:'alisko._setStateReady();',
				writeableCode:'',
			};
        }


        if (command == 'page.click') {
            const {x,y} = param;
            const {vmContext, alisko} = kernel;
            const {page} = vmContext;
            const el = await this.findAt(page, x, y);
            if (el && el.boundingBox instanceof Function) {
                const { prefix, prefixAlreadyUsed, selector, root } = await this.findSelectorForPierced({
                    command: command,
                    page: page,
                    element: el,
                    x:x,y:y,
					kernel:kernel,
                })
                // get info for select and input element
                let info = await el.evaluate( (el) => {
                    let op = el.getElementsByTagName('option');
                    let options = [];
                    if (op && op.length>0) {
                        for(let i=0; i<op.length; i++) {
                            options.push(op[i].innerText)
                        }
                    }
                    return {
                        tagName: el.tagName.toLowerCase(),
                        options: options,
                        type: el.getAttribute("type"),
                        }
                });
                if (selector) {
                    // handle select element
                    if (info.tagName=='select') {
                        // return options on select
                        let commandVariants = [];
                        commandVariants.push({
                            title: 'click',
                            commandCode:prefix+"await "+root+".click( '" +escapeSingle(selector) + "' );",
                        })
                        for (let s of info.options) {
                            commandVariants.push({
                                title: 'choose option: ' + s,
                                commandCode:prefix+"await "+root+".selectOption( '" +escapeSingle(selector) + "', {label :'"+escapeSingle(s)+"'} );",
                            });
                        }
                        return {commandVariants : commandVariants};
                    }
                    // handle input click - do you like to fillin?
                    let postEvent = undefined;
                    if (this.elementIsInput(info.tagName, info.type)) {
                        postEvent = {eventName:'predictor-command-keyboard-hint',options: {x:x,y:y}};
                    }
                    // return normal click
                    return {
                        commandCode: prefix + "await "+root+".click( '" +escapeSingle(selector) + "' );",
                        writeableCode: prefixAlreadyUsed + prefix + "await "+root+".click( '" +escapeSingle(selector) + "' );",
                        postEvent: postEvent,
                        trapMode: true,
                    };
                }
            }
        }

        if (command == 'page.waitfor') {
            const {x,y} = param;
            const {vmContext, alisko} = kernel;
            const {page} = vmContext;
            const el = await this.findAt(page, x, y);
            if (el && el.boundingBox instanceof Function) {
                const { prefix, prefixAlreadyUsed, selector, root } = await this.findSelectorForPierced({
                    command: command,
                    page: page,
                    element: el,
                    x:x,y:y,
                })
                if (selector) {
                    // return normal click
                    return {
                        commandCode: prefix + "await "+root+".waitForSelector( '" +escapeSingle(selector) + "' );",
                        writeableCode: prefixAlreadyUsed + prefix + "await "+root+".waitForSelector( '" +escapeSingle(selector) + "' );"
                };
                }
            }
        }

        if (command == 'page.fill') {
            const {x,y,msg,isGlobal} = param;
            const {vmContext, alisko} = kernel;
            const {page} = vmContext;
            if (isGlobal) {
                // return {commandCode:"await page.press( 'body', '" +escapeSingle(msg)+ "' );"};
                return {commandCode:"await page.keyboard.type( '" +escapeSingle(msg)+ "' );"};
            }
            const el = await this.findAt(page, x, y);
            if (el && el.boundingBox instanceof Function) {
                let info = await el.evaluate( (el) => {
                    return {
                        tagName: el.tagName.toLowerCase(),
                        type: el.getAttribute("type"),
                        }
                });
                const { selector, prefix, prefixAlreadyUsed, root } = await this.findSelectorForPierced({
                    command: command,
                    page: page,
                    element: el,
                    x:x,y:y,
                })
                if (selector) {
                    if ( ! this.elementIsInput(info.tagName, info.type) ) {
                        return {commandCode:prefix+"await "+root+".type( '" +escapeSingle(selector)+ "', '" +escapeSingle(msg)+ "' );"};
                    }
                    return {commandCode:prefix+"await "+root+".fill( '" +escapeSingle(selector)+ "', '" +escapeSingle(msg)+ "' );"};
                }
            }
        }

        if (command == 'page.press') {
            const {x,y,msg, isGlobal} = param;
            const {vmContext, alisko} = kernel;
            const {page} = vmContext;
            if (isGlobal) {
                // return {commandCode:"await page.press( 'body', '" +escapeSingle(msg)+ "' );"};
                return {commandCode:"await page.keyboard.press( '" +escapeSingle(msg)+ "' );"};
            }
            const el = await this.findAt(page, x, y);
            if (el && el.boundingBox instanceof Function) {
                const { selector, prefix, prefixAlreadyUsed, root } = await this.findSelectorForPierced({
                    command: command,
                    page: page,
                    element: el,
                    x:x,y:y,
                })
                if (selector) {
                    return {commandCode:prefix+"await "+root+".press( '" +escapeSingle(selector)+ "', '" +escapeSingle(msg)+ "' );"};
                } else { // page.press possible just to BODY
                    return {commandCode:prefix+"await "+root+".press( 'body', '" +escapeSingle(msg)+ "' );"};
                }
            }
        }

        if (command == 'page.grab') {
            const {x,y} = param;
            const {vmContext, alisko} = kernel;
            const {page} = vmContext;
            const el = await this.findAt(page, x, y);
            if (el && el.boundingBox instanceof Function) {
                // get info for select and input element
                let info = await el.evaluate( (el) => {
                    return {
                        tagName: el.tagName.toLowerCase(),
                        type: el.type,
                        value: el.value,
                        text: el.innerText,// ? innerText textContent ?
                    }
                });
                let options = {x:x,y:y};

                if (this.elementIsInput(info.tagName, info.type) && info.value!="" ) {
                    const { selector } = await this.findSelectorForPierced({
                        command: command,
                        page: page,
                        element: el,
                        x:x,y:y,
                    })
                    if (selector) {// we can address to this input - lets ask next information
                        options.selectType = "input";
                        options.text = info.value;
                    }
                } else if (info.text) {
                    const { selector } = await this.findSelectorForPierced({
                        command: command,
                        page: page,
                        element: el,
                        x:x,y:y,
                    })
                    if (selector) {// we can address to this input - lets ask next information
                        options.selectType = "complex";
                        options.text = info.text;
                    }
                }
                // enqueue 2 stage of grab
                if (options.selectType && options.text) {
                    return {
                        commandSecondStage : {
                            eventName:'predictor-grab-info',
                            options:options
                        }
                    };
                }
            }
        }

        if (command == 'page.grab2') {
            const {x,y, requiredText, text, selectType} = param;
            const {vmContext, alisko} = kernel;
            const {page} = vmContext;

            const el = await this.findAt(page, x, y);
            if (el && el.boundingBox instanceof Function) {
                if (selectType=="input") {
                    const { selector, prefix, prefixAlreadyUsed, root } = await this.findSelectorForPierced({
                        command: "page.grab",
                        page: page,
                        element: el,
                        x:x,y:y,
                    })
                    if (selector) {
                        let cmd = "s = await "+root+".$eval( '" +escapeSingle(selector)+ "', el=>el.value );";
                        cmd += makeRegexExtractor(requiredText, text);
                        cmd += "\nconsole.log('grabbed:',s);";
                        return {commandCode:prefix+cmd};
                    }
                }

                if (selectType=="complex") {
                    const { selector, prefix, prefixAlreadyUsed, root } = await this.findSelectorForPierced({
                        command: "page.grab",
                        page: page,
                        element: el,
                        x:x,y:y,
                        brokeText: requiredText,
                    })
                    if (selector) {
                        let cmd = "s = await "+root+".innerText( '" +escapeSingle(selector)+ "' );";
                        cmd += makeRegexExtractor(requiredText, text);
                        cmd += "\nconsole.log('grabbed:',s);";
                        return {commandCode:prefix+cmd};
                    }
                }
            }
        }

        return {}; // nothing to run
    }

    async hilitePosition(params) {
        const {kernel, command, param} = params;
        const {x,y} = param;
        const {vmContext, alisko} = kernel;
        const {page} = vmContext;

        const el = await this.findAt(page, x, y);
        if (el && el.boundingBox instanceof Function) {
            const box = await el.boundingBox(); // use plawyright definition: slowly but absolute coords
            let info = await el.evaluate( (el) => {
                return {
                    cursor: window.getComputedStyle(el).cursor,
                    tagName: el.tagName.toLowerCase(),
                    type: el.getAttribute("type"),
                    windowWidth: window.innerWidth,
                    windowHeight: window.innerHeight,
                    }
            }, {el:el});

            // special for keyboard press
            return {
                found:true,
                x:box.x,
                y:box.y,
                w:box.width,
                h:box.height,
                cursor: info.cursor,
                isInput: this.elementIsInput(info.tagName, info.type),
                // ДЛЯ ОТЛАДКИ ТОЛЬКО
                // msg: await this.predictCommand(params).commandCode,
            };
        }
        return {found:false};
    }
    elementIsInput (tagName,tagType) {
        const CAN_HANDLE_KEYS_INPUT_TYPES = ['text','password','tel','search','email','number','url','range','date','datetime-local','time','month','week','color','file']
        if (tagName == 'textarea') return true;
        if (tagName == 'input' && ( !tagType || CAN_HANDLE_KEYS_INPUT_TYPES.includes(tagType.toLowerCase()) ) ) return true;
        return false;
    }

    // find element at x y, using iframe piercing
    // TBD if another domain - can we? or we should use Playwright?
    async findAt(page, x, y) {
        let element = await page.evaluateHandle( ({x,y}) => {
            return document.elementFromPoint(x,y);
        }, {x:x,y:y} );
        // TBD loop while not frame?
        let iframe = undefined;
        try {
            iframe = await element.contentFrame();
        } catch (e) {}; // something strange. Race conditions?
        if (iframe) {
            const box = await element.boundingBox();
            let xx = x-box.x;
            let yy = y-box.y;
            element = await iframe.evaluateHandle( ({x,y}) => {
                return document.elementFromPoint(x,y);
            }, {x:xx,y:yy} );
        }
        return element;
    }


    async findSelectorForPierced(params) {
        const {page, x, y, element, command, kernel} = params;
        const ownerFrame = await element.ownerFrame();
        const isNonMainFrame = !( page.mainFrame()==ownerFrame);
        if (isNonMainFrame) {
            const iframe_tag = await ownerFrame.frameElement();
            // 1 get selector for iframe
            const selector_iframe = await this.findSelectorFor({page, x, y, element:iframe_tag, command});
            const box = await iframe_tag.boundingBox();
            let xx = x-box.x;
            let yy = y-box.y;
            const selector_inner = await this.findSelectorFor({page:ownerFrame, x:xx, y:yy, element, command});
            if (!selector_iframe || !selector_inner) return {};
            return {
                selector: selector_inner,
                prefix: "frame1 = await ( await page.$('" +escapeSingle(selector_iframe)+ "') ).contentFrame();\n",
                prefixAlreadyUsed: '',
                root:'frame1',
            }
        }
        let selector = await this.findSelectorFor(params);
		// TBD а если иконка внутри фрейма?
		let prefixAlreadyUsed = (selector && selector.startsWith("css=[_icon*=")) ? 'await alisko.recognizeIcons();\n' : '';
        return {
            selector: selector,
            prefix: '',
            prefixAlreadyUsed: prefixAlreadyUsed,
            root:'page',
        }
    }
    async findSelectorFor({page, x, y, element, command, kernel, brokeText}) {
        let selector,s;
        // prepare for marking, get data
        let selectedKey = Math.random();
        let info = await element.evaluate( (element,{selectedKey}) => {
            element.setAttribute('alisko_id',selectedKey);
            // child text nodes
            let childTextNodes = [];
            for (let n of element.childNodes) {
                if (n.nodeType=== Node.TEXT_NODE) {
                    childTextNodes.push(n.nodeValue);
                }
            }
            return {
                tagName: element.tagName.toLowerCase(),
                alt: element.getAttribute("alt"),
                title: element.getAttribute("title"),
                type: element.getAttribute("type"),
                value: element.getAttribute("value"),
                placeholder: element.getAttribute("placeholder"),
                textContent : element.getAttribute("textContent"),
                childTextNodes: childTextNodes,
            } ;
        }, {selectedKey});

        // text
        //selector = '"' + normalizeText( await element.innerText() ) + '"';
        //if (await checkSelector(page, selectedKey, selector)) return selector;
        let possibleCssSelectors=[]
        function rememberCssSelector(selectr) {
            if (!possibleCssSelectors.includes(selectr)) {
                possibleCssSelectors.push(selectr)
            }
        }

        selector = 'text=' + normalizeText( info.textContent, brokeText ) + '';
        if (await checkSelector(page, selectedKey, selector)) return selector;
        rememberCssSelector(':text("'+escapeDouble(normalizeText( info.textContent, brokeText ))+'")')

        for (let s of info.childTextNodes) {
            selector = 'text=' + normalizeText( s, brokeText ) + '';
            if (await checkSelector(page, selectedKey, selector)) return selector;
            rememberCssSelector(':text("'+escapeDouble(normalizeText( s, brokeText ))+'")')
        }

        // text-like attributes on special attributes
        if (info.alt) {
            selector = 'css=[alt*="' + escapeDouble(normalizeText(info.alt, brokeText)) + '"]';
            if (await checkSelector(page, selectedKey, selector)) return selector;
            rememberCssSelector('[alt*="'+escapeDouble(normalizeText( s, brokeText ))+'"]')
        }

        if (info.title) {
            selector = 'css=[title*="' + escapeDouble(normalizeText(info.title, brokeText)) + '"]';
            if (await checkSelector(page, selectedKey, selector)) return selector;
            rememberCssSelector('[title*="'+escapeDouble(normalizeText( info.title, brokeText ))+'"]')
        }

        if (info.tagName=="button" && info.value) {
            selector = 'css=button[value*="' + escapeDouble(normalizeText( info.value, brokeText )) + '"]';
            if (await checkSelector(page, selectedKey, selector)) return selector;
            rememberCssSelector('button[value*="'+escapeDouble(normalizeText( info.value, brokeText ))+'"]')
        };

        const possibleInputClickableTypes = ['button','submit'];
        if (info.tagName=="input" && info.type && possibleInputClickableTypes.includes(info.type.toLowerCase()) && info.value) {
            selector = 'css=input[type="'+info.type.toLowerCase()+'"][value*="' + escapeDouble(normalizeText( info.value )) + '"]';
            if (await checkSelector(page, selectedKey, selector)) return selector;
            rememberCssSelector('input[type="'+info.type.toLowerCase()+'"][value*="' + normalizeText( info.value ) + '"]')
        };

        if (info.tagName=="input" && info.placeholder) {
            selector = 'css=input[placeholder*="'+escapeDouble(normalizeText(info.placeholder))+'"]';
            if (await checkSelector(page, selectedKey, selector)) return selector;
            rememberCssSelector('[placeholder*="'+escapeDouble(normalizeText(info.placeholder))+'"]]')
        };

        // таак, вопрос сложный, давай построим комплексные селекторы? ---------------------------------
        // найдем соседей сверху и слева для начала
        let candidatesInfo = await element.evaluate( (element, {x,y}) => {
            // child text nodes
            function getParents(elem) {
                var parents = [];
            	for ( ; elem && elem !== document; elem = elem.parentNode ) {
		            parents.push(elem);
	            }
            	return parents;
            }
            function getElData(el) {
                // расчет фактиеской дистанции?
                // let box1 = el.getBoundingClientRect();
                // расчет семантичекой дистанции по ближайшему общему родителю?
                let cascade1 = getParents(el);
                let i = 0;
                for (; cascade1[i]==cascade[i]; i++){};
                let semDistance = cascade.length - i;
                // получение селекторов элемента
                let childTextNodes = [];
                for (let n of el.childNodes) {
                    if (n.nodeType=== Node.TEXT_NODE) {
                        childTextNodes.push(n.nodeValue.trim());
                    }
                }
                return {
                    tagName: el.tagName.toLowerCase(),
                    textContent : el.getAttribute("textContent"),
                    childTextNodes: childTextNodes,
                    semDistance: semDistance,
                } ;
            }
            // найдем ширину полосы
            let box = element.getBoundingClientRect();
            let dxminus=0, dxplus=0, dyminus=0, dyplus=0;
            const stepper = 5;
            if (x>=box.left && x<=box.right && y>=box.top && y<=box.bottom) {
                //dxminus = x - box.left;
                //dxplus = box.right - x;
                //dyminus = y - box.top;
                //dyplus = box.bottom - y;
                dxplus = box.width;
                x = box.left;
                dyplus = box.height;
                y = box.top;
            } else {
                dxminus = stepper * 2;
                dxplus = stepper * 2;
                dyminus = stepper * 2;
                dyplus = stepper * 2;
            }
            // пройдем этой полосой ища элементы с текстом
            let foundElements=[];
            function piercePoint(x1,y1) {
                if (x1<=0 || y1<=0) return;
                let candidate = document.elementFromPoint(x1,y1);
                if (candidate && candidate!=element && !foundElements.includes(candidate)) {
                    foundElements.push(candidate);
                }
            }
            const maxdistance = 200;
			const mainElTagName = element.tagName.toLowerCase();
			let mainElType = element.getAttribute("type");
			if (mainElType) mainElType = mainElType.toLowerCase();
            for (let delta = 0; delta < maxdistance; delta+=stepper) {
                // сверху
                for (let x1 = x - dxminus; x1 <= x + dxplus; x1+=stepper) { // полоса по ширине
                    let y1 = y - delta;
                    piercePoint(x1,y1)
                }
                // слева
                for (let y1 = y - dyminus; y1 <= y + dyplus; y1+=stepper) { // полоса по высоте
                    let x1 = x - delta;
                    piercePoint(x1,y1);
                }
				// справа, но так делаем только для чекбоксов и радио
				if (mainElTagName=="input" && (mainElType=="checkbox" || mainElType=="radio")) {
					for (let y1 = y - dyminus; y1 <= y + dyplus; y1+=stepper) { // полоса по высоте
						let x1 = x + delta;
						piercePoint(x1,y1);
					}
				}
            }
            // преобразовать список в возвращаемый формат
            let cascade = getParents(element);
            let result = [];
            for (let el1 of foundElements) {
                result.push(getElData(el1));
            }
            return result;
        }, {x,y});
        // кандидаты окружения найдены!
        // пробуем использовать их в качестве селектора!
        rememberCssSelector(info.tagName); // просто имя тега возможно тоже финализатор TBD если это хоть сколько-то значащее имя тега!?
        function explodeElementToSelectors(elementInfo) {
            let result = [];
            if (elementInfo.textContent) {
                result.push(normalizeText(elementInfo.textContent))
            }
            for (let s of elementInfo.childTextNodes) {
                if (s && !result.includes(normalizeText(s))) {
                    result.push(normalizeText(s))
                }
            }
            return result;
        }
        // TBD re-sort by semDistance?
        for (let elinfo of candidatesInfo) {
            for (let s2 of explodeElementToSelectors(elinfo)) {
                for (let s1 of possibleCssSelectors) {
                    if (s1.includes(NONNONNONEXISTENT) || s2.includes(NONNONNONEXISTENT)) continue;
                    // lets do all variants
                    const selector1 = s1 + ":right-of( :text(\""+escapeDouble(s2)+"\") )";
                    if (await checkSelector(page, selectedKey, selector1)) return selector1;
                    //
                    const selector2 = s1 + ":below(  :text(\""+escapeDouble(s2)+"\") )";
                    if (await checkSelector(page, selectedKey, selector2)) return selector2;
                    //
                    const selector3 = s1 + ":near(  :text(\""+escapeDouble(s2)+"\") )";
                    if (await checkSelector(page, selectedKey, selector3)) return selector3;
                    //
                    const selector11 = s1 + ":right-of( :text(\""+escapeDouble(s2)+"\"):visible )";
                    if (await checkSelector(page, selectedKey, selector11)) return selector11;
                    //
                    const selector22 = s1 + ":below(  :text(\""+escapeDouble(s2)+"\"):visible )";
                    if (await checkSelector(page, selectedKey, selector22)) return selector22;
                    //
                    const selector33 = s1 + ":near(  :text(\""+escapeDouble(s2)+"\"):visible )";
                    if (await checkSelector(page, selectedKey, selector33)) return selector33;
                    //
                    const selector44 = s1 + ":left-of( :text(\""+escapeDouble(s2)+"\") )";
                    if (await checkSelector(page, selectedKey, selector44)) return selector44;
                }
            }
        }

        // just by tagname ?!
        selector = 'css='+info.tagName+'';
        if (await checkSelector(page, selectedKey, selector)) return selector;

		// iconic selector
		if (kernel && kernel.alisko) { // может не быть, т к page.fill вызываются БЕЗ долгого этапа reg=cognize
			await kernel.alisko.recognizeIcons();
			let iconNames = await element.getAttribute("_icon");
			if (iconNames) { // TBD несколько иконок?
				selector = 'css=[_icon*="'+iconNames+'"]';
				if (await checkSelector(page, selectedKey, selector)) return selector;
			}
		}

        return undefined; // we cant found this?
    }


    async predictWaiterCode(page, oldTxt, newTxt) {
        if (oldTxt!=newTxt) {
            let wordsOld = getWordSet(oldTxt);
            let wordsNew = getWordSet(newTxt);
            for (const s of Array.from(wordsNew)) {
                if (!wordsOld.has(s) && newTxt.includes(s)) {
                    let candidateSelector = 'text=' + normalizeText( s );
                    try {
                        let found = await page.$(candidateSelector);
                        if (found) {
                            let fullText = await page.innerText(candidateSelector);
                            let fullSelector = 'text=' + normalizeText( fullText );
                            let foundFull = await page.$(fullSelector);
                            if (foundFull) {
                                return "await page.waitForSelector( '" +escapeSingle(fullSelector) + "' );\n";
                            } else {
                                return "await page.waitForSelector( '" +escapeSingle(candidateSelector) + "' );\n";
                            }
                        }
                    } catch (e) {
                        console.log('@predictWaiterCode',e)
                    }
                }
            }
        }
        return '';
    }

}

async function checkSelector(page, selectedKey, candidateSelector) {
    if (candidateSelector.trim()=='') return false;
    if (candidateSelector.includes(NONNONNONEXISTENT)) return false;
    try {
        let found = await page.$(candidateSelector);
        // TBD как правильно проверить, что оно реально совпало?
        if (found) {
            let foundKey = await found.getAttribute('alisko_id');
            let ok = (foundKey==selectedKey);
            return ok;
        }
    } catch (e) {
        //
    }
    return false;
}




function getWordSet(txt) {
    if (!txt) txt='';
    let s = txt.replace(/[^a-zA-Zа-яА-Я]/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    let words = s.split(' ');
    let wordset = new Set(words);
    return wordset;
}


function makeRegexExtractor(requiredText,allText) {
    // TBD
    if (requiredText==allText) return ""; // nothing to extract
    let parts = allText.split(requiredText, 2);
    if (parts.length>1) {
        let rgx = "/" + escapeRegex(parts[0]) + "(.*)" + escapeRegex(parts[1]) + "/";
        let code = "\ns = s.match( "+rgx+" )[1];";
        return code;
    }
    return ""; /// cant make the extractor
}
function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export default Predictor;
