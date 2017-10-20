/*
TODO: Care on user.updateProblem
*/

var express = require('express');
var authRouter = express.Router();
var mongodb = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
const nodemailer = require("nodemailer");
var passport = require('passport');

const querystring = require('querystring');
const https = require('https');

var database = require('../controllers/database')();

const recaptchaSecretKey = "6Lf51jQUAAAAAJEGkUwj6Mad5Deh21TO_P6vsI87";
const recaptchaURL = "https://www.google.com/recaptcha/api/siteverify";

var mail = require('../controllers/mail');

let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: 'problem@solverly.io',
        pass: 'NhL2R9%q'
    }
});

let mailOptions = {
    from: '"SOLVERLY" <problem@solverly.io>', // sender address
};

var router = function () {
    authRouter.route('/signUp')
        .post(function (req, res) {
            //~~~~~~~~~~~~~~~~Check for spambots~~~~~~~~~~~~~~~~~~~~~~~~
            var userIP = req.connection.remoteAddress;

            var postData = querystring.stringify({
                'secret': recaptchaSecretKey,
                'response': req.body['g-recaptcha-response'],
                'remoteip': userIP
            });

            var options = {
                hostname: 'google.com',
                port: 443,
                path: '/recaptcha/api/siteverify',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postData.length
                }
            };

            var request = https.request(options, (response) => {
                console.log('statusCode:', response.statusCode);
                console.log('headers:', response.headers);

                response.on('data', (data) => {
                    data = JSON.parse(data);

                    console.log(data);

                    if (data.success) {
                        var user = {
                            firstName: req.body.firstName,
                            lastName: req.body.lastName,
                            email: req.body.email.toLowerCase(),
                            password: req.body.password,
                            type: 'client'
                        }

                        database.saveUser(user, function (response) {
                            if (response === true) {
                                req.login(req.body, function () {
                                    res.redirect(307, '/auth/logIn');
                                });
                            } else {
                                res.redirect('/');
                            }
                        });
                    } else {
                        //req.logout();
                        res.redirect('/');
                    }
                });
            });

            request.write(postData);
            request.end();

            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        });

    authRouter.route('/signUpHandler')
        .post(function (req, res) {
            var user = {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email.toLowerCase(),
                password: req.body.password,
                type: 'handler'
            }

            database.saveUser(user, function (response) {
                if (response === true) {
                    res.redirect('/auth/profileAdmin');
                } else {
                    res.redirect('/auth/profileAdmin');
                }
            });
        });

    authRouter.route('/logIn')
        .post(passport.authenticate('local', {
            failureRedirect: '/auth/logInFailed'
        }), function (req, res) {
            if (req.user.type === 'client') {
                res.redirect('client');
            } else if (req.user.type === 'handler') {
                res.redirect('profileHandler2');
            } else if (req.user.type === 'fixer') {
                res.redirect('profileFixer2');
            } else if (req.user.type === 'admin') {
                res.redirect('profileAdmin');
            }
        });

    authRouter.route('/logInFailed')
        .get(function (req, res) {
            console.log('stuff');
            res.render('logInFailed');
        });

    authRouter.route('/logOut')
        .post(function (req, res) {
            req.logout();
            res.redirect('/');
        });

    authRouter.route('/passReset') //Add the link and actually change the password
        .get(function (req, res) {
            res.render('passReset');
        })
        .post(function (req, res) {
            console.log(req.body.email);
            database.getUsers({
                email: req.body.email.toLowerCase()
            }, function (results) {
                console.log(results);
                if (results.length == 1) {
                    mailOptions.to = req.body.email;
                    mailOptions.subject = 'Password reset request'; // Subject line
                    mailOptions.text = 'Hi,\n\nWe have received a request to change your password. Please click on the following link to complete the request:\n\nhttps://solverly.us-east-2.elasticbeanstalk.com/auth/passReset/' + results[0]._id + '\n\n You should receive an email containing the new password.'; // plain text body

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            return console.log(error);
                        }
                        console.log('Message sent: %s', info);
                        console.log(mailOptions.subject);
                    });

                    results[0].requestResetPass = true;
                    results[0].updatePassword = false;

                    database.updateUser(results[0], function (response) {
                        if (response === true) {
                            res.render('passReset', {
                                response: true
                            });
                        } else {
                            console.log('Something went wrong updating user:', results[0]);
                        }
                    });
                } else {
                    res.render('passReset', {
                        error: 'Email not found'
                    });
                }
            });
        });

    authRouter.route('/passReset/:id')
        .get(function (req, res) {
            if (req.params.id.length === 24) {
                database.getUsers({
                    _id: objectId(req.params.id)
                }, function (results) {
                    console.log("Results:", results);
                    if (results.length == 1 && results[0].requestResetPass && results[0].requestResetPass === true) {
                        results[0].requestResetPass == false;

                        var newPass = '';
                        //48 -> 122
                        for (var i = 0; i < 12; i++) {
                            newPass += String.fromCharCode(Math.floor(Math.random() * 74 + 48));
                        }

                        console.log('New password:', newPass);

                        results[0].password = newPass;
                        results[0].updatePassword = true;

                        database.updateUser(results[0], function (response) {
                            if (response === true) {
                                console.log("Response: ", response);
                                mailOptions.to = results[0].email;
                                mailOptions.subject = 'Password reset complete'; // Subject line
                                mailOptions.text = 'Hi,\n\nYour password has been successfully reseted.\n\n New password: ' + newPass + '\n\n'; // plain text body
                                transporter.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                        return console.log(error);
                                    }
                                    console.log('Message sent: %s', info);
                                    console.log(mailOptions.subject);
                                });
                            } else {
                                console.log('Something went wrong updating the user:', results[0]);
                            }
                        });
                    }

                    res.redirect('/');
                });
            } else {
                res.redirect('/');
            }
        });

    authRouter.route('/logProblem')
        .all(function (req, res, next) {
            if (!(req.user && (req.user.type === 'client' || req.user.type === 'client'))) {
                res.redirect('/');
            } else {
                next();
            }
        })
        .get(function (req, res) {
            console.log('smth');
            res.render('logProblem');
        })
        .post(function (req, res) {
            //~~~~~~~~~~~~~~~~Check for spambots~~~~~~~~~~~~~~~~~~~~~~~~
            var userIP = req.connection.remoteAddress;

            var postData = querystring.stringify({
                'secret': recaptchaSecretKey,
                'response': req.body['g-recaptcha-response'],
                'remoteip': userIP
            });

            var options = {
                hostname: 'google.com',
                port: 443,
                path: '/recaptcha/api/siteverify',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postData.length
                }
            };

            var request = https.request(options, (response) => {
                console.log('statusCode:', response.statusCode);
                console.log('headers:', response.headers);

                response.on('data', (data) => {
                    data = JSON.parse(data);

                    if (data.success) {
                        database.getHandlers(function (resultsHandlers) {
                            database.getProblems({}, function (resultsProblems) {
                                var d = Date.now();
                                var problem = {
                                    totalTime: d,
                                    client: req.user.email,
                                    clientFirstName: req.user.firstName,
                                    summary: req.body.summary,
                                    description: req.body.description,
                                    address: {
                                        adressLine1: req.body.addressLine1,
                                        adressLine2: req.body.addressLine2,
                                        city: req.body.city,
                                        state: req.body.state,
                                        zip: req.body.zip,
                                        country: req.body.country
                                    },
                                    phone: req.body.phone,
                                    handler: resultsHandlers[resultsProblems.length % resultsHandlers.length].email,
                                    handlerFirstName: resultsHandlers[resultsProblems.length % resultsHandlers.length].firstName,
                                    status: 'pending'
                                }

                                database.saveProblem(problem, function (response) {
                                    if (response === true) {
                                        res.redirect('client');
                                    } else {
                                        console.log(response);
                                    }
                                });
                            });
                        });
                    } else {
                        req.logout();
                        res.redirect('/');
                    }
                });
            });

            request.write(postData);
            request.end();

            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        });

    authRouter.route('/email/logProblem')
        .post(function (req, res) {
            var d = Date.now();
            var problem = {
                _id: objectId(req.body.id),
                totalTime: d,
                client: req.body.clientEmail,
                clientFirstName: req.body.clientFirstName,
                summary: req.body.summary,
                description: req.body.description,
                address: {
                    adressLine1: req.body.addressLine1,
                    adressLine2: req.body.addressLine2,
                    city: req.body.city,
                    state: req.body.state,
                    zip: req.body.zip,
                    country: req.body.country
                },
                phone: req.body.phone,
                handler: req.user.email,
                handlerFirstName: req.user.firstName,
                status: 'onGoing',
                type: req.body.type,
                fixer: req.body.fixer,
                deadline: req.body.deadline,
                priority: req.body.priority
            }

            database.saveProblem(problem, function (saveProblemResponse) {
                if (saveProblemResponse === true) {
                    database.deleteEmailProblems({
                        _id: objectId(req.body.id)
                    }, function (deleteEmailProblemResponse) {
                        if (deleteEmailProblemResponse === true) {
                            res.redirect('/auth/profileHandler2');
                        } else {
                            console.log(deleteEmailProblemResponse);
                        }
                    })
                } else {
                    console.log(saveProblemResponse);
                }
            });
        });

    authRouter.route('/client')
        .all(function (req, res, next) {
            if (!(req.user && req.user.type === 'client')) {
                res.redirect('/');
            } else {
                next();
            }
        })
        .get(function (req, res) {
            database.getProblems({
                client: req.user.email
            }, function (problems) {
                var updates = {};

                if (problems.length > 0) {
                    problems.forEach(function (problem) {
                        database.getUpdates({
                            problemID: problem._id.toString()
                        }, function (updatesResults) {
                            updates[problem._id] = updatesResults;

                            if (Object.keys(updates).length == problems.length) {

                                res.render('client', {
                                    user: req.user,
                                    problems: problems,
                                    updates: updates
                                });
                            }
                        });
                    });
                } else {
                    res.render('client', {
                        user: req.user,
                        problems: problems,
                        updates: updates
                    });
                }
            });
        });

    authRouter.route('/profileSettings')
        .all(function (req, res, next) {
            if (!(req.user && req.user.type === 'client')) {
                res.redirect('/');
            } else {
                next();
            }
        })
        .get(function (req, res) {
            console.log(req.user);
            res.render('profileSettings', {
                user: req.user
            });
        })
        .post(function (req, res) {
            database.getUsers({
                email: req.user.email,
                password: req.body.password
            }, function (results) {
                if (results.length == 1) {
                    console.log(req.body.newPassword, req.body.confirmNewPassword);
                    if (typeof req.body.newPassword == 'undefined') {
                        var user = req.user;
                        user.firstName = req.body.firstName;
                        user.lastName = req.body.lastName;

                        console.log('no new password');
                        results[0].updatePassword = false;

                        database.updateUser(user, function (response) {
                            if (response === true) {
                                res.redirect('/auth/client');
                            } else {
                                console.log('There has been a problem updating this user', user);
                            }
                        });
                    } else if (req.body.newPassword === req.body.confirmNewPassword) {
                        var user = req.user;
                        user.firstName = req.body.firstName;
                        user.lastName = req.body.lastName;
                        user.password = req.body.newPassword;

                        console.log('new pass', user.password);
                        results[0].updatePassword = true;

                        database.updateUser(user, function (response) {
                            if (response === true) {
                                res.redirect('/auth/client');
                            } else {
                                console.log('There has been a problem updating this user', user);
                            }
                        });
                    } else {
                        res.render('profileSettings', {
                            user: req.user,
                            error: 'Passwords do not match!'
                        });
                    }
                } else {
                    res.render('profileSettings', {
                        user: req.user,
                        error: 'Wrong password!'
                    });
                }
            });
        });

    authRouter.route('/completed')
        .all(function (req, res, next) {
            if (!(req.user)) {
                res.redirect('/');
            } else {
                next();
            }
        })
        .get(function (req, res) {
            var filter = {
                status: 'completed'
            }

            switch (req.user.type) {
                case 'client':
                    filter.client = req.user.email;
                    break;
                case 'handler':
                    filter.handler = req.user.email;
                    break;
                case 'fixer':
                    filter.fixer = req.user.email;
                    break;
            }

            database.getProblems(filter, function (problems) {
                var updates = {};

                if (problems.length > 0) {
                    problems.forEach(function (problem) {
                        database.getUpdates({
                            problemID: problem._id.toString()
                        }, function (updatesResults) {
                            updates[problem._id] = updatesResults;

                            if (Object.keys(updates).length == problems.length) {

                                res.render('completed', {
                                    user: req.user,
                                    problems: problems,
                                    updates: updates,
                                    back: '/auth/logIn'
                                });
                            }
                        });
                    });
                } else {
                    res.render('completed', {
                        user: req.user,
                        problems: problems,
                        updates: updates,
                        back: '/auth/logIn'
                    });
                }
            });
        });

    authRouter.route('/profileHandler2')
        .all(function (req, res, next) {
            if (!(req.user && req.user.type === 'handler')) {
                res.redirect('/');
            } else {
                next();
            }
        })
        .get(function (req, res) {
            database.getProblems({
                handler: req.user.email,
                status: {
                    '$ne': 'completed'
                }
            }, function (problems) {
                var updates = {};

                if (problems.length > 0) {
                    problems.forEach(function (problem) {
                        database.getUpdates({
                            problemID: problem._id.toString()
                        }, function (updatesResults) {
                            updates[problem._id] = updatesResults;

                            if (Object.keys(updates).length == problems.length) {
                                //Get emailProblems
                                database.getEmailProblems({
                                    handler: req.user.email
                                }, function (emailProblems) {
                                    res.render('profileHandler2', {
                                        problems: problems,
                                        emailProblems: emailProblems,
                                        updates: updates
                                    });
                                });
                            }
                        });
                    });
                } else {
                    database.getEmailProblems({
                        handler: req.user.email
                    }, function (emailProblems) {
                        res.render('profileHandler2', {
                            problems: problems,
                            emailProblems: emailProblems,
                            updates: updates
                        });
                    });
                }
            });
        })
        .post(function (req, res) {
            //how to update this one
            //console.log(req.body);
            req.body.status = 'onGoing';
            database.updateProblem(req.body.id, req.body, function (response) {
                if (response === false) {
                    console.log('There was a problem updating');
                } else {
                    res.redirect('profileHandler2');
                }
            });
        });

    authRouter.route('/profileFixer2')
        .all(function (req, res, next) {
            if (!(req.user && req.user.type === 'fixer')) {
                res.redirect('/');
            } else {
                next();
            }
        })
        .get(function (req, res) {
            database.getProblems({
                fixer: req.user.email,
                status: {
                    '$ne': 'completed'
                }
            }, function (problems) {
                var updates = {};

                if (problems.length > 0) {
                    problems.forEach(function (problem) {
                        database.getUpdates({
                            problemID: problem._id.toString()
                        }, function (updatesResults) {
                            updates[problem._id] = updatesResults;

                            if (Object.keys(updates).length == problems.length) {

                                res.render('profileFixer2', {
                                    problems: problems,
                                    updates: updates
                                });
                            }
                        });
                    });
                } else {
                    res.render('profileFixer2', {
                        problems: problems,
                        updates: updates
                    });
                }
            });
        })

    authRouter.route('/profileAdmin')
        .all(function (req, res, next) {
            if (!(req.user && req.user.type === 'admin')) {
                res.redirect('/');
            }
            next();
        })
        .get(function (req, res) {
            database.getHandlers(function (results) {
                //console.log(results);

                res.render('profileAdmin', {
                    results: results
                });
            });
        });

    return authRouter;
};

module.exports = router;
