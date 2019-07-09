"use strict";

const Imap = require("imap");
const inspect = require("util").inspect;
const fs = require("fs");

const imap = new Imap({
    user: "jfw4fhyvpsc56dps@ethereal.email",
    password: "Kudza9tx9qHAYZx1VW",
    host: "imap.ethereal.email",
    port: 993,
    tls: true
});
 
function openInbox(cb) {
    imap.openBox("INBOX", true, cb);
}
 
imap.once("ready", function() {
    openInbox(function(err, box) {
        imap.search([ "ALL", ["SINCE", "2019-07-06"] ], function(err, results) {
            if (err) throw err;
            let f = imap.fetch(results, { bodies: "" });
            f.on("message", function(msg, seqno) {
                console.log("Message #%d", seqno);
                let prefix = "(#" + seqno + ") ";
                msg.on("body", function(stream, info) {
                    console.log(prefix + "Body");
                    stream.pipe(fs.createWriteStream("dev/msg-" + seqno + "-body.txt"));
                });
                msg.once("attributes", function(attrs) {
                    console.log(prefix + "Attributes: %s", inspect(attrs, false, 8));
                });
                msg.once("end", function() {
                    console.log(prefix + "Finished");
                });
            });
            f.once("error", function(err) {
                console.log("Fetch error: " + err);
            });
            f.once("end", function() {
                console.log("Done fetching all messages!");
                imap.end();
            });
        });
    });
});
 
imap.once("error", function(err) {
    console.log(err);
});
 
imap.once("end", function() {
    console.log("Connection ended");
});
 
imap.connect();