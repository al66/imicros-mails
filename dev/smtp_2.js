"use strict";

const nodemailer = require("nodemailer");

async function main() {

    // Create a SMTP transporter object
    let transporter = nodemailer.createTransport(
        {
            host: "mail.imicros.de",
            port: 25, 
            secureConnection: true,
            auth: {
                user: "pxxxxxpx",
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

    // Message object
    let message = {
        // Comma separated list of recipients
        to: "Max mustermann <max.mustermann@foreigndomain.de>",

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
                //path: __dirname + "/assets/nyan.gif",
                path: "assets/imicros.png",
                cid: "nyan@example.com" // should be as unique as possible
            }
        ]
    };

    await transporter.sendMail(message);

    console.log("Message sent successfully!");

    // only needed when using pooled connections
    transporter.close();
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});