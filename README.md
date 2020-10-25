# imicros-mails
[![Build Status](https://travis-ci.org/al66/imicros-mails.svg?branch=master)](https://travis-ci.org/al66/imicros-mails)
[![Coverage Status](https://coveralls.io/repos/github/al66/imicros-mails/badge.svg?branch=master)](https://coveralls.io/github/al66/imicros-mails?branch=master)
[![Development Status](https://img.shields.io/badge/status-experimental-orange)](https://img.shields.io/badge/status-experimental-orange)

[Moleculer](https://github.com/moleculerjs/moleculer)  service for sending mails via smtp

Requires additional running services: [imicros-minio](https://github.com/al66/imicros-minio) and [imicros-keys](https://github.com/al66/imicros-keys)

## Installation
```
$ npm install imicros-mails --save
```

# Usage
## Setup service
```js
"use strict";

const { Mails } = require("imicros-mails");
const { AclMixin } = require("imicros-acl");
const { MinioMixin, SecretsMixin } = require("imicros-minio");

module.exports = {
    name: "mails",
    mixins: [Mails, MinioMixin({ service: "minio" }), AclMixin, SecretsMixin({ service: "keys" })],
                           
	/**
	 * Service settings
	 */
    settings: {},
	
	/**
	 * Service dependencies
	 */
    dependencies: ["minio","keys"],

    /**
	 * Service created lifecycle event handler
	 */
    created() {},

	/**
	 * Service started lifecycle event handler
	 */
    started() {},

	/**
	 * Service stopped lifecycle event handler
	 */
    stopped() {}
};
```
## Usage service
- smtp { account, settings } => account  
- verify { account } => { test, err}
- send { account, message } => result

### Verify connection
```js
let params = {
    account: {
        smtp: {                       // connection settings: refer to nodemailer
            host: "mail.myhost.com",
            port: "465",
            secure: true,
            requireTLS: true
        },
        auth: {
            user: "user@myhost.com",
            pass: {
                _encrypt: {
                    value: account.pass
                }
            }
        }
    }
};
await broker.call("mails.verify", params, opts).then(res => {
    console.log(res.account); // "test"
});
```
### Save connection
```js
let params = {
    account: "test",
    settings: {
        // connection settings: refer to nodemailer documentation
        smtp: {
            host: "mail.myhost.com",
            port: "465",
            secure: true,
            requireTLS: true
        },
        auth: {
            user: "user@myhost.com",
            pass: {
                _encrypt: {
                    value: account.pass
                }
            }
        }
    }
};
await broker.call("mails.smtp", params, opts).then(res => {
    console.log(res.account); // "test"
});
```
### Send mail
```js
const fs = require("fs");
let params = {
    account: "test",
    // message object: refer to nodemailer documentation
    message: {
        // Comma separated list of recipients
        to: "Max Mustermann <max.mustermann@gmail.com>",

        // Subject of the message
        subject: "Nodemailer is unicode friendly ✔",

        // plaintext body
        text: "Hello to myself!",

        // HTML body
        html:
            "<p><b>Hello</b> to myself <img src=\"cid:note@example.com\"/></p>" +
            "<p>Here's the imicros logo for you as an embedded attachment:<br/><img src=\"cid:imicros@example.com\"/></p>",

        // An array of attachments
        attachments: [
            // String attachment
            {
                filename: "notes.txt",
                content: "Some notes about this e-mail",
                contentType: "text/plain" // optional, would be detected from the filename
            },

            // Binary Buffer attachment
            {
                filename: "image.png",
                content: Buffer.from(
                    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAABlBMVEUAAAD/" +
                        "//+l2Z/dAAAAM0lEQVR4nGP4/5/h/1+G/58ZDrAz3D/McH8yw83NDDeNGe4U" +
                        "g9C9zwz3gVLMDA/A6P9/AFGGFyjOXZtQAAAAAElFTkSuQmCC",
                    "base64"
                ),

                cid: "note@example.com" // should be as unique as possible
            },

            // File Stream attachment
            {
                filename: "logo imicros ✔.png",
                content: fs.createReadStream("assets/imicros.png"),
                cid: "imicros@example.com" // should be as unique as possible
            }
        ]                    
    }
};
let res = await broker.call("mails.send", params, opts);
console.log(res);
/*
{ accepted: [ 'max.mustermann@gmail.com' ],
  rejected: [],
  envelopeTime: 60,
  messageTime: 355,
  messageSize: 17051,
  response:
   '250 Accepted [STATUS=new MSGID=XSGpENwpOWUvmNbGXSGpEdEoY2VsWvv3AAAAAS1yzYsg0f4g5G02QvJAu0A]',
  envelope:
   { from: 'no-reply@pangalink.net',
     to: [ 'max.mustermann@gmail.com' ] },
  messageId: '<3736bdd6-b2ef-dca6-e5b2-db379dc161d0@pangalink.net>' }
*/
```
## ToDo's
