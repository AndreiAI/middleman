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

var endSeq = 'End of mail.';

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
            from: '"SOLVERLY" <problem@solverly.io>', // sender address
            to: mail.from[0].address, // list of receivers
            subject: '', // Subject line
            text: '', // plain text body
        };

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
                    mailOptions.text = 'We got your problem and we are working on solving it.\n\nHere are you credentials:\n\nemail: ' + mail.from[0].address + '\npassword: ' + 'pass' + '\n\n';
                    /*
                                        transporter.sendMail(mailOptions, (error, info) => {
                                            if (error) {
                                                return console.log(error);
                                            }
                                            console.log('Message sent: %s', info.messageId);
                                            console.log(mailOptions.subject);
                                        });*/
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
                                mailOptions.subject = 'PROBLEM' + result._id;
                                mailOptions.text += 'Your problem has been received and has been assigned to ' + emailProblem.handlerFirstName + '. He will be giving you feedback along the way. \n\nMeanwhile, you can log in at example.com\n\nTo use the commands, write the keyword as the first word in your message, on the first line (the keyword needs to be unique on the first line), when replying to this email:\nCHAT : write a new update. Write your update without pressing ENTER\nGET-CHAT : get all past updates\n\n' + endSeq;

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
        } else if (mail.subject.includes('PROBLEM') && mail.subject.split('PROBLEM')[1].length === 24) {
            //to be deleted
            /*
            mailOptions.subject = 'PROBLEM' + mail.subject.split('PROBLEM')[1];
            mailOptions.text = 'You have just replied to one of our messages.';

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: %s', info);
                console.log(mailOptions.subject);
            });*/

            if (mail.text.split('\n')[0] == 'CHAT') {

                var updateText = mail.text.split('CHAT')[1].split('\n')[1];

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
                    update: updateText
                }

                database.saveUpdate(update, function (response) {
                    if (response === false) {
                        console.log('There was a problem with your update');
                    } else {
                        console.log('Update saved: ' + update.update);
                    }
                });
            } else if (mail.text.split('\n')[0] == 'GET-CHAT') {
                database.getUpdates({
                    problemID: mail.subject.split('PROBLEM')[1]
                }, function (updatesResults) {
                    mailOptions.subject = 'PROBLEM' + mail.subject.split('PROBLEM')[1];
                    mailOptions.text = 'Updates:\n\n';
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
            } else if (mail.text.split('\n')[0] == 'COMPLETED') {
                database.getProblems({
                    _id: objectId(mail.subject.split('PROBLEM')[1])
                }, function (results) {
                    //console.log(results);
                    results[0].status = 'completed'
                    database.updateProblem(mail.subject.split('PROBLEM')[1], results[0], function (response) {
                        if (response === false) {
                            console.log('There was a problem updating your issue');
                        } else {
                            console.log('Problem completed: ' + mail.subject.split('PROBLEM')[1]);
                        }
                    });
                });
            }
        }
    });
};

module.exports = mail;
