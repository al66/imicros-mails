/**
 * @license MIT, imicros.de (c) 2019 Andreas Leinen
 */
"use strict";

const _ = require("lodash");
const nodemailer = require("nodemailer");
const Imap = require("imap");

/** Actions */
// action smtp { account, settings } => boolean
// action verify { account} => boolean
// action remove { account} => boolean
// action send { account, message } => boolean

module.exports = {
    name: "mails",
    
    /**
     * Service settings
     */
    settings: {},

    /**
     * Service metadata
     */
    metadata: {},

    /**
     * Service dependencies
     */
    //dependencies: [],	

    /**
     * Actions
     */
    actions: {

        /**
         * save smtp settings
         * 
         * @actions
         * @param {String} account
         * @param {Object} settings
         * 
         * @returns {Object} account
         */
        smtp: {
            params: {
                account: { type: "string" },
                settings: { type: "object" }
            },			
            async handler(ctx) {
                if (!await this.isAuthorized({ ctx: ctx, ressource: { account: ctx.params.account }, action: "smtp" })) throw new Error("not authorized");
                
                let name = ctx.params.account;
                let account = {};
                try {
                    account = await this.get({ctx: ctx, key: name });
                } catch (err) {
                    this.logger.debug("Account not yet existing", { acount: name });
                }
                if (!account) account = {};
                
                this.logger.debug("Received settings", { settings: ctx.params.settings });
                _.set(account,"smtp",_.get(ctx.params.settings,"smtp",{}));
                _.set(account,"auth",_.get(ctx.params.settings,"auth",{}));
                
                await this.set({ctx: ctx, key: name, value: account});
                this.logger.debug("Account data", { account: account });
                return { account: name };
            }
        },
        
        /**
         * verify smtp settings
         * 
         * @actions
         * @param {String} account
         * 
         * @returns {Boolean} result
         */
        verify: {
            params: {
                account: { type: "string" },
                smtp: { type: "boolean", optional: true },
                imap: { type: "boolean", optional: true }
            },
            async handler(ctx) {
                if (!await this.isAuthorized({ ctx: ctx, ressource: { account: ctx.params.account }, action: "verify" })) throw new Error("not authorized");

                let name = ctx.params.account;
                let account;
                
                try {
                    account = await this.get({ctx: ctx, key: name });
                } catch (err) {
                    this.logger.debug("Account is not existing", { acount: name });
                    throw new Error(`Account ${name} is not existing`);
                }
                
                let result = true;
                if (_.get(ctx.params,"smtp",true) && account.smtp ) {
                    let transporter = this.createTransport(account);
                    result = await transporter.verify();
                    this.logger.debug("Verify smtp", { result: result });
                }
                if (_.get(ctx.params,"imap",true) && account.imap ) {
                    let imapCheck = false;
                    this.logger.debug("Verify imap", { result: imapCheck });
                    result = result && imapCheck;
                }
                return result;
            }
        },
        
        /**
         * send mail via smtp account
         * 
         * @actions
         * @param {String} account
         * @param {Object} message
         * 
         * @returns {Object} info
         */
        send: {
            params: {
                account: { type: "string" },
                message: { type: "object" }
            },
            async handler(ctx) {
                if (!await this.isAuthorized({ ctx: ctx, ressource: { account: ctx.params.account }, action: "send" })) throw new Error("not authorized");

                let name = ctx.params.account;
                let account;
                
                try {
                    account = await this.get({ctx: ctx, key: name });
                } catch (err) {
                    this.logger.debug("Account is not existing", { acount: name });
                    throw new Error(`Account ${name} is not existing`);
                }
                let transporter = this.createTransport(account);
                
                let message = ctx.params.message;
                // disable file access
                message.disableFileAccess = true; 
                
                
                let info = await transporter.sendMail(message);
                this.logger.debug("Message successfully sent", { info: info });
                return info;
            }
        },
        
        /**
         * save imap settings
         * 
         * @actions
         * @param {String} account
         * @param {Object} settings
         * 
         * @returns {Object} account
         */
        imap: {
            params: {
                account: { type: "string" },
                settings: { type: "object" }
            },			
            async handler(ctx) {
                if (!await this.isAuthorized({ ctx: ctx, ressource: { account: ctx.params.account }, action: "imap" })) throw new Error("not authorized");
                
                let name = ctx.params.account;
                let account = {};
                try {
                    account = await this.get({ctx: ctx, key: name });
                } catch (err) {
                    this.logger.debug("Account not yet existing", { acount: name });
                }
                if (!account) account = {};
                
                this.logger.debug("Received settings", { settings: ctx.params.settings });
                _.set(account,"imap",_.get(ctx.params.settings,"imap",{}));
                _.set(account,"auth",_.get(ctx.params.settings,"auth",{}));
                
                await this.set({ctx: ctx, key: name, value: account});
                this.logger.debug("Account data", { account: account });
                return { account: name };
            }
        },
        
        fetch: {
            params: {
                account: { type: "string" },
                seq: { type: "number", optional: true },
                uid: { type: "string", optional: true }
            },
            async handler(ctx) {
                if (!await this.isAuthorized({ ctx: ctx, ressource: { account: ctx.params.account }, action: "send" })) throw new Error("not authorized");

                let name = ctx.params.account;
                let account;
                
                try {
                    account = await this.get({ctx: ctx, key: name });
                } catch (err) {
                    this.logger.debug("Account is not existing", { acount: name });
                    throw new Error(`Account ${name} is not existing`);
                }
                
                let imap = new Imap(this.createImapConfiguration(account));
                let messages = [];
                
                return new Promise((resolve, reject) => {

                    let fetch = (err, box) => {
                        if (err) reject(err);
                        this.logger.debug("Fetch mail via imap connection", { box: box });
                            
                        let f = imap.fetch([1], { bodies: "" });
                        f.on("message", function(msg, seqno) {
                            let message = {
                                seq: seqno
                            };
                            
                            console.log("Message #%d", seqno);
                            let prefix = "(#" + seqno + ") ";
                            msg.on("body", function(stream, info) {
                                console.log(prefix + "Body");
                                //stream.pipe(fs.createWriteStream("dev/msg-" + seqno + "-body.txt"));
                            });
                            msg.once("attributes", function(attrs) {
                                //console.log(prefix + "Attributes: %s", inspect(attrs, false, 8));
                                message.attrs = attrs;
                            });
                            msg.once("end", function() {
                                console.log(prefix + "Finished");
                                messages.push(message);
                            });
                        });
                        f.once("error", function(err) {
                            console.log("Fetch error: " + err);
                            reject(err);
                        });
                        f.once("end", function() {
                            console.log("Done fetching all messages!");
                            imap.end();
                            resolve(messages);
                        });
                    };
                    
                    imap.once("ready", () => {
                        this.logger.debug("imap connection ready - open inbox");
                        imap.openBox("INBOX", true, fetch); 
                    }); 
                    
                    imap.once("error", function(err) {
                        this.logger.debug("Error imap connection", { err: err });
                        reject(err);
                    });

                    imap.once("end", function() {
                        this.logger.debug("imap connection ended");
                        resolve(messages);
                    });                    
                    
                    this.logger.debug("connect to imap");
                    imap.connect();
                });
            }
        }

    },

    /**
     * Events
     */
    events: {},

    /**
     * Methods
     */
    methods: {
        
        createTransport(account) {
            return nodemailer.createTransport(
                {
                    host: account.smtp.host,
                    port: account.smtp.port, 
                    secureConnection: account.smtp.secure,
                    auth: {
                        user: account.auth.user,
                        pass: account.auth.pass
                    },
                    tls: {
                    // do not fail on invalid certs
                    //rejectUnauthorized: false,
                    // set ssl version
                    //ciphers:"SSLv3"
                    }
                });
        },
        
        createImapConfiguration(account) {
            return {
                host: account.imap.host,
                port: account.imap.port,
                tls: account.imap.tls,
                user: account.auth.user,
                password: account.auth.pass
            };
        }
        
    },

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