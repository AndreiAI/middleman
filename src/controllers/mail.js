const MailListener = require("mail-listener2");
var objectId = require('mongodb').ObjectID;
const nodemailer = require("nodemailer");

var mailListener = new MailListener({
    username: "problem@solverly.io",
    password: "NhL2R9%q",
    host: "imap.gmail.com",
    port: 993, // imap port 
    tls: true,
    connTimeout: 10000, // Default by node-imap 
    authTimeout: 5000, // Default by node-imap, 
    debug: null, // Or your custom function with only one incoming argument. Default: null 
    tlsOptions: {
        rejectUnauthorized: false
    },
    mailbox: "INBOX", // mailbox to monitor
    markSeen: true, // all fetched email willbe marked as seen and not fetched next time 
    fetchUnreadOnStart: false, // use it only if you want to get all unread email on lib start. Default is `false`, 
    mailParserOptions: {
        streamAttachments: false
    }, // options to be passed to mailParser lib. 
    attachments: false, // download attachments as they are encountered to the project directory 
});

var database = require('../controllers/database')();

var google_separator = new RegExp('(On .*> wrote:)');
var separator = '~~~~~~~~~~~~~~~~~~~~~~~~Reply above~~~~~~~~~~~~~~~~~~~~~~~~';

// start listening
var mail = function () {

    mailListener.start();

    mailListener.on("server:connected", function () {
        console.log("IMAP: Connected");
    });

    mailListener.on("server:disconnected", function () {
        console.log("IMAP: Disconnected");
        mailListener.stop();

        setTimeout(mailListener.start(), 3000);
        //mailListener.start(); //if disconnected, start again
    });

    mailListener.on("error", function (err) {
        console.log("Error:", err);
    });

    //Sending emails

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: 'problem@solverly.io',
            pass: 'NhL2R9%q'
        }
    });

    //actually reading and sending

    mailListener.on("mail", function (mail, seqno, attributes) {
        // do something with mail object including attachments 
        console.log("Email received:", mail.date, mail.from[0].address, mail.subject);

        let mailOptions = {
            from: '"SOLVERLY" <problem@solverly.io>' // sender address
        };

        mail.text = mail.text.split(separator)[0].split(google_separator)[0];

        if (mail.subject.includes('PROBLEM') == false) {
            database.getUsers({
                email: mail.from[0].address.toLowerCase()
            }, function (results) {
                if (results.length == 0) {
                    database.saveUser({
                        email: mail.from[0].address.toLowerCase(),
                        password: 'pass',
                        firstName: mail.from[0].name.split(' ')[0],
                        secondName: mail.from[0].name.split(' ')[1],
                        type: 'client',
                        confirmed: true
                    }, function (response) {
                        if (response === false) {
                            console.log('We could not sign up: ' + mail.from[0].address);
                        } else {
                            console.log('Signed up: ' + mail.from[0].address);
                        }
                    });

                    console.log(mail.from);

                    mailOptions.subject = 'Welcome to Solverly!';
                    mailOptions.to = mail.from[0].address;
                    mailOptions.text = 'We got your problem and we are working on solving it. You should receive an email soon regarding your problem.\n\nHere are you credentials:\n\nemail: ' + mail.from[0].address + '\npassword: ' + 'pass' + '\n\n';

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            return console.log(error);
                        }
                        console.log('Message sent: %s', info.messageId);
                        console.log(mailOptions.subject);
                    });
                }

                database.getHandlers(function (resultsHandlers) {
                    database.getProblems({}, function (resultsProblems) {
                        database.getEmailProblems({}, function (resultsEmailProblems) {
                            var emailProblem = {
                                client: mail.from[0].address,
                                clientFirstName: mail.from[0].name.split(' ')[0],
                                subject: mail.subject,
                                body: mail.text,
                                handler: resultsHandlers[(resultsProblems.length + resultsEmailProblems.length) % resultsHandlers.length].email,
                                handlerFirstName: resultsHandlers[(resultsProblems.length + resultsEmailProblems.length) % resultsHandlers.length].firstName,
                            }

                            database.saveEmailProblem(emailProblem, function (result) {
                                mailOptions.to = mail.from[0].address;
                                mailOptions.subject = 'PROBLEM' + result._id;
                                mailOptions.text = separator + "\n\n";
                                mailOptions.text += 'Your problem has been received and has been assigned to ' + emailProblem.handlerFirstName + '. He will be giving you feedback along the way. \n\nMeanwhile, you can log in at https://solverly.io\n\nTo use the commands, write the keywords:\n#chat : get all past updates\n#update : Sends an email to the handler and the fixer, asking for an update\n\nTo write a new message in the chat, you can just reply to this email\n\n';

                                transporter.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                        return console.log(error);
                                    }
                                    console.log('Message sent: %s', info);
                                    console.log(mailOptions.subject);
                                });
                            });
                        });
                    });
                });
            });
        } else if (mail.subject !== undefined && mail.subject.includes('PROBLEM') && mail.subject.split('PROBLEM')[1].length === 24) {

            Number.prototype.padLeft = function (base, chr) {
                var len = (String(base || 10).length - String(this).length) + 1;
                return len > 0 ? new Array(len).join(chr || '0') + this : this;
            }

            var total = Date.now();

            var d = new Date,
                dformat = [(d.getMonth() + 1).padLeft(),
               d.getDate().padLeft(),
               d.getFullYear()].join('/') + ' ' + [d.getHours().padLeft(),
               d.getMinutes().padLeft(),
               d.getSeconds().padLeft()].join(':');

            var update = {
                problemID: mail.subject.split('PROBLEM')[1],
                timestamp: dformat,
                totalTime: total,
                author: mail.from[0].address,
                authorFirstName: mail.from[0].name.split(' ')[0],
                update: mail.text
            }

            database.saveUpdate(update, function (response) {
                if (response === false) {
                    console.log('There was a problem with your update');
                } else {
                    console.log('Update saved: ' + update.update);
                }
            });

            if (mail.text !== undefined && mail.text.includes('#chat')) {
                database.getUpdates({
                    problemID: mail.subject.split('PROBLEM')[1]
                }, function (updatesResults) {
                    mailOptions.to = mail.from[0].address;
                    mailOptions.subject = 'PROBLEM' + mail.subject.split('PROBLEM')[1];
                    mailOptions.text = 'Updates:\n\n';

                    updatesResults.sort(function (a, b) {
                        return b.totalTime - a.totalTime;
                    });

                    updatesResults.forEach(function (update) {
                        mailOptions.text += '' + update.timestamp + ' - ' + update.authorFirstName + ' : ' + update.update + '\n';
                    });

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            return console.log(error);
                        }
                        console.log('Message sent: %s', info);
                        console.log(mailOptions.subject);
                    });
                });
            }

            if (mail.text !== undefined && mail.text.includes('#update')) {
                database.getProblems({
                    _id: objectId(mail.subject.split('PROBLEM')[1])
                }, function (problemsResults) {
                    console.log(problemsResults[0]);
                    mailOptions.to = problemsResults[0].fixer + "; " + problemsResults[0].handler;
                    mailOptions.subject = 'PROBLEM' + mail.subject.split('PROBLEM')[1];
                    mailOptions.text = 'The client has requested an update on the problem:\n\n ' + problemsResults[0].summary + '\n\n';

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            return console.log(error);
                        }
                        console.log('Message sent: %s', info);
                        console.log(mailOptions.subject);
                    });
                });
            }

            if (mail.text !== undefined && mail.text.includes('#solved')) {
                database.getProblems({
                    _id: objectId(mail.subject.split('PROBLEM')[1])
                }, function (results) {
                    //console.log(results);
                    //Need to check if by fixer or handler or user
                    results[0].status = 'completed';
                    database.updateProblem(mail.subject.split('PROBLEM')[1], results[0], function (response) {
                        if (response === false) {
                            console.log('There was a problem updating your issue');
                        } else {
                            console.log('Problem completed: ' + mail.subject.split('PROBLEM')[1]);
                        }
                    });
                });
            }

            if (mail.text !== undefined && mail.text.includes('#rating')) {
                database.getProblems({
                    _id: objectId(mail.subject.split('PROBLEM')[1])
                }, function (results) {
                    //console.log(results);
                    //Need to check if by fixer or handler or user

                    if (typeof mail.text.split('#rating')[1][1] != 'undefined' && '1' <= mail.text.split('#rating')[1][1] && mail.text.split('#rating')[1][1] <= '5') {
                        results[0].rating = mail.text.split('#rating')[1][1];
                        database.updateProblem(mail.subject.split('PROBLEM')[1], results[0], function (response) {
                            if (response === false) {
                                console.log('There was a problem updating your issue');
                            } else {
                                console.log('Problem rating: ' + mail.subject.split('PROBLEM')[1]);
                            }
                        });
                    }
                });
            }

            if (mail.text !== undefined && mail.text.includes('#reopen')) {
                database.getProblems({
                    _id: objectId(mail.subject.split('PROBLEM')[1])
                }, function (results) {
                    //console.log(results);
                    //Need to check if by fixer or handler or user

                    results[0].status = 'onGoing';
                    database.updateProblem(mail.subject.split('PROBLEM')[1], results[0], function (response) {
                        if (response === false) {
                            console.log('There was a problem updating your issue');
                        } else {
                            console.log('Problem reopened: ' + mail.subject.split('PROBLEM')[1]);
                        }
                    });
                });
            }
        }
    });
};

module.exports = mail;
