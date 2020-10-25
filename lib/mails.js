/**
 * @license MIT, imicros.de (c) 2019 Andreas Leinen
 */
"use strict";

const _ = require("lodash");
const nodemailer = require("nodemailer");

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
            acl: "before",
            params: {
                account: { type: "string" },
                settings: { type: "object" }
            },			
            async handler(ctx) {
                let name = ctx.params.account;
                let account = {};
                try {
                    // account = await this.get({ctx: ctx, key: name });
                    account = await this.getObject({ctx: ctx, objectName: name });
                } catch (err) {
                    this.logger.debug("Account not yet existing", { acount: name });
                }
                if (!account) account = {};
                
                let settings = await this.encrypt({ ctx: ctx, object: ctx.params.settings });
				
                this.logger.debug("Received settings", { settings: ctx.params.settings });
                this.logger.debug("Encrypted settings", { settings: settings });
                _.set(account,"smtp",_.get(settings,"smtp",{}));
                _.set(account,"auth",_.get(settings,"auth",{}));
                
                this.logger.debug("Account data", { objectName: name, value: account });
                // await this.set({ctx: ctx, key: name, value: account});
                await this.putObject({ctx: ctx, objectName: name, value: account});
                return { account: name };
            }
        },
        
        /**
         * verify smtp settings
         * 
         * @actions
         * @param {String} account
         *  
         * @returns {Object} { test, err }
         */
        verify: {
            acl: "before",
            params: {
                account: [{ type: "string" },{ type: "object" }]
            },
            async handler(ctx) {
                let account;
                
                if (typeof ctx.params.account === "string") {
                    let name = ctx.params.account;
                    try {
                      //account = await this.get({ctx: ctx, key: name });
                        account = await this.getObject({ctx: ctx, objectName: name });
                        account = await this.decrypt({ ctx: ctx, object: account });
                    } catch (err) {
                        this.logger.debug("Account is not existing", { acount: name });
                        throw new Error(`Account ${name} is not existing`);
                    }
                } else {
                    account = ctx.params.account;
                    account = await this.decrypt({ ctx: ctx, object: account });
                }
                
                let result = {
                    test: false,
                    err: null 
                };
                if (account.smtp ) {
                    let transporter = this.createTransport(account);
                    try {
                        result.test = await transporter.verify();  
                    } catch (err) {
                        err.stack = "";
                        result.err = err;
                    }
                    this.logger.debug("Verify smtp", { result });
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
            acl: "before",
            params: {
                account: { type: "string" },
                message: { type: "object" }
            },
            async handler(ctx) {
                let name = ctx.params.account;
                let account;
                
                try {
                    //account = await this.get({ctx: ctx, key: name });
                    account = await this.getObject({ctx: ctx, objectName: name });
                    account = await this.decrypt({ ctx: ctx, object: account });
                } catch (err) {
                    this.logger.debug("Account is not existing", { acount: name });
                    throw new Error(`Account ${name} is not existing`);
                }
                let transporter = this.createTransport(account);
                
                let message = ctx.params.message;
                // disable file access
                message.disableFileAccess = true; 
                
                try {
                    let info = await transporter.sendMail(message);
                    this.logger.debug("Message successfully sent", { info: info });
                    return info;
                } catch (err) {
                    return { err: { message: err.message } };
                }
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