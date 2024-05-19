/*
This code is part of Alisko web testing framework
Project page: https://github.com/vlesu/alisko 
Copyright (c): Arsenii Kurin asen.kurin@gmail.com
License: MPL-2.0
*/


// const got = require('got');
const axios = require('axios');

class MailCatcherApi {
    constructor(alisko) {
        this._alisko = alisko;
        this._url = "http://mail.h.tsdev.work"; 
    }
    connect(url) {
        this._alisko._logExecution('mailcatcher.connect (remember url only)', url);
        if (url.endsWith("/")) {
            url = url.slice(0, -1);
        }
        this._url = url;
    }

    async getMessages() {
        this._alisko._logExecution('mailcatcher.getMessages', "");
        // const response = await got(this._url + '/messages', { json: true });
        const response = await axios.get(this._url + '/messages');
        return response.data;
    }
    async getMessageHtml(id) {
        this._alisko._logExecution('mailcatcher.getMessageHtml', id);
        const response = await axios.get(this._url + '/messages/'+id+".html");
        return response.data;
    }

    /* options possible:
        to: search messages by recipient email
        subject: search messages by substrubg contained in subject
        regex: match required data
    */
    async grab(options) {
        this._alisko._logExecution('mailcatcher.grab', options);
        let messages = await this.getMessages();
        for (let message of messages) {
            if (options.to) {
                let found = false;
                for (let r of message.recipients) {
                    if (r.includes(options.to)) found = true;
                }
                if (!found) continue; // we require to have TO, but not found, so next message
            }
            if (options.subject) {
                if (!message.subject.includes(options.subject)) continue;
                // we require to have TO, but not found, so next message
            }
            // ok all test done, so get source and take regex
            let htm = await this.getMessageHtml(message.id);
            if (options.regex) {
                let re1 = new RegExp(options.regex);
                let result = re1.exec(htm); 
                return result;
            }  else {
                return htm;
            }
        }
        return undefined;
    }
}

export default MailCatcherApi;