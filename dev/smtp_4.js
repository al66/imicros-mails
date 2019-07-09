"use strict";

const nodemailer = require("nodemailer");

async function main() {

    // Create a SMTP transporter object
    let transporter = nodemailer.createTransport(
        {
            host: "smtp.office365.com",
            port: 25, 
            secureConnection: true,
            auth: {
                user: "max.mustermann@mydomain.de",
                pass: "mypass"
            },
            tls: {
                // do not fail on invalid certs
                //rejectUnauthorized: false,
                // set ssl version
                //ciphers:"SSLv3"
            },
            logger: true,
            debug: true// include SMTP traffic in the logs
        }
    );

    let result = await transporter.verify();
    console.log(result);
    
    console.log("Successfully verified!");

    // only needed when using pooled connections
    transporter.close();
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});