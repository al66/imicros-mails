"use strict";

const { ServiceBroker } = require("moleculer");
const { Mails } = require("../index");
const { AclMixin } = require("imicros-acl");
const nodemailer = require("nodemailer");
const fs = require("fs");

const timestamp = Date.now();

// mock imicros-store mixin
const Store = (options) => { return {
    methods: {
        async set ({ ctx = null, key = null, value = null } = {}) {
            if ( !ctx || !key ) return false;
            
            let internal = Buffer.from(ctx.meta.acl.ownerIdr + "~" + key).toString("base64");
            
            this.store[internal] = value;
            return true;
        },
        async get ({ ctx = null, key }) {
            if ( !ctx || !key ) throw new Error("missing parameter");

            let internal = Buffer.from(ctx.meta.acl.ownerIdr + "~" + key).toString("base64");
            
            return this.store[internal];            
        },   
        async del ({ ctx = null, key }) {
            if ( !ctx || !key ) throw new Error("missing parameter");
            
            let internal = Buffer.from(ctx.meta.acl.ownerIdr + "~" + key).toString("base64");
            
            delete this.store[internal];
            
            return true;            
        }   
    },
    created () {
        this.store = options.store;
    }
};};

describe("Test mails service", () => {

    let broker, service, account;
    beforeAll(async () => {
        account = await nodemailer.createTestAccount();
    });
    
    afterAll(() => {
    });
    
    describe("Test create service", () => {

        it("it should start the broker", async () => {
            broker = new ServiceBroker({
                logger: console,
                logLevel: "debug" // "info" //"debug"
            });
            service = await broker.createService(Mails, Object.assign({ 
                name: "mails",
                mixins: [Store({ store: {} }), AclMixin]
            }));
            await broker.start();
            expect(service).toBeDefined();
        });

    });
    
    describe("Test send mail via smtp", () => {

        let opts;
        
        beforeEach(() => {
            opts = { 
                meta: { 
                    acl: {
                        accessToken: "this is the access token",
                        ownerId: `g1-${timestamp}`,
                        unrestricted: true
                    }, 
                    user: { 
                        id: `1-${timestamp}` , 
                        email: `1-${timestamp}@host.com` }, 
                    access: [`1-${timestamp}`, `2-${timestamp}`] 
                } 
            };
        });        
        
        it("it should save smtp settings", async () => {
            let params = {
                account: "test",
                settings: {
                    smtp: {
                        host: account.smtp.host,
                        port: account.smtp.port,
                        secure: account.smtp.secure
                    },
                    auth: {
                        user: account.user,
                        pass: account.pass
                    }
                }
            };
            return broker.call("mails.smtp", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.account).toBeDefined();
            });
                
        });
        
        it("it should verify the account", async () => {
            let params = {
                account: "test"
            };
            return broker.call("mails.verify", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toEqual(true);
            });
                
        });

        it("it should send email as-is", async () => {
            let params = {
                account: "test",
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
            return broker.call("mails.send", params, opts).then(res => {
                expect(res).toBeDefined();
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
                expect(res.messageId).toBeDefined();
                expect(res.accepted).toEqual([ "max.mustermann@gmail.com" ]);
            });
                
        });

        it("it should save imap settings", async () => {
            let params = {
                account: "test",
                settings: {
                    imap: {
                        host: account.imap.host,
                        port: account.imap.port,
                        tls: true
                    },
                    auth: {
                        user: account.user,
                        pass: account.pass
                    }
                }
            };
            return broker.call("mails.imap", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.account).toBeDefined();
            });
                
        });
        
        it("it should fetch sent email via imap", async () => {
            let params = {
                account: "test",
                seq: 1
            };
            return broker.call("mails.fetch", params, opts).then(res => {
                expect(res).toBeDefined();
                console.log(res);
            });
                
        });
        
        
    });
        
    describe("Test stop broker", () => {
        it("should stop the broker", async () => {
            expect.assertions(1);
            await broker.stop();
            expect(broker).toBeDefined();
        });
    });    
    
});