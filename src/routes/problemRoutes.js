var express = require('express');
var problemRouter = express.Router();
var mongodb = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var passport = require('passport');

const querystring = require('querystring');
const https = require('https');
const http = require('http');


var database = require('../controllers/database')();

var router = function () {
    problemRouter.route('/:id')
        .all(function (req, res, next) {
            if (req.params.id.length === 24) {
                database.getProblems({
                    _id: objectId(req.params.id)
                }, function (results) {
                    var flag = true;
                    if (results.length === 1) {
                        var emailClient = results[0].client;
                        var emailHandler = results[0].handler;
                        var emailFixer = results[0].fixer;

                        if (typeof (req.user) !== 'undefined') {
                            flag = req.user.email === emailClient || req.user.email === emailHandler || req.user.email === emailFixer;
                        } else {
                            flag = false;
                        }
                    } else {
                        flag = false;
                    }

                    if (flag === false) {
                        res.redirect('/');
                    } else {
                        next();
                    }
                });
            } else {
                res.redirect('/');
            }
        })
        .get(function (req, res) {
            //console.log(req.params.id);
            database.getProblems({
                _id: objectId(req.params.id)
            }, function (results) {
                //console.log(results[0]);
                var flag = true;
                if (results.length === 1) {

                    console.log('so far');

                    var emailClient = results[0].client;
                    var emailHandler = results[0].handler;
                    var emailFixer = results[0].fixer;

                    flag = req.user && (req.user.email === emailClient || req.user.email === emailHandler || req.user.email === emailFixer);

                    if (flag === true) {

                        //console.log('even further');

                        //console.log(results[0]._id);

                        database.getUpdates({
                            problemID: results[0]._id.toString()
                        }, function (updates) {
                            results[0].updates = updates;
                            results[0].user = req.user;

                            //console.log(updates);
                            //console.log(updates);

                            res.render('problemDetails', {
                                result: results[0],
                                back: '/auth/logIn'
                            });
                        });
                    }
                }
            });
        })
        .post(function (req, res) {
            console.log(req);
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
                problemID: req.params.id,
                timestamp: dformat,
                totalTime: total,
                author: req.user.email,
                authorFirstName: req.user.firstName,
                update: req.body.update
            }

            database.saveUpdate(update, function (response) {
                if (response === false) {
                    console.log('There was a problem with your update');
                } else {
                    if (req.body.backPath) {
                        console.log(req.params.id);
                        res.redirect(req.body.backPath);
                    } else {
                        res.redirect('' + req.params.id);
                    }
                }
            });
        });

    problemRouter.route('/complete/:id')
        .all(function (req, res, next) {
            if (req.params.id.length === 24) {
                database.getProblems({
                    _id: objectId(req.params.id)
                }, function (results) {
                    var flag = true;
                    if (results.length === 1) {
                        var emailClient = results[0].client;
                        var emailHandler = results[0].handler;
                        var emailFixer = results[0].fixer;

                        if (typeof (req.user) !== 'undefined') {
                            flag = req.user.email === emailClient || req.user.email === emailHandler || req.user.email === emailFixer;
                        } else {
                            flag = false;
                        }
                    } else {
                        flag = false;
                    }

                    if (flag === false) {
                        res.redirect('/');
                    } else {
                        next();
                    }
                });
            } else {
                res.redirect('/');
            }
        })
        .post(function (req, res) {
            //Stuff changed
            req.body.update = "Marked as completed by: " + req.user.type + ".";

            var userIP = req.connection.remoteAddress;

            var postData = querystring.stringify({
                req: req
            });

            var options = {
                hostname: 'solverly.io',
                port: 80,
                path: '/problem/complete/' + req.params.id,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postData.length
                }
            };

            var request = http.request(options, (response) => {
                console.log('statusCode:', response.statusCode);
                console.log('headers:', response.headers);

                response.on('data', function (data) {
                    console.log(data);
                });
            });

            request.write(postData);
            request.end();

            //End stuff changed

            if (req.user.type == 'handler') {
                database.getProblems({
                    _id: objectId(req.params.id)
                }, function (results) {
                    //console.log(results);
                    results[0].status = 'completed'
                    database.updateProblem(req.params.id, results[0], function (response) {
                        if (response === false) {
                            console.log('There was a problem updating your issue');
                        } else {
                            res.redirect('/auth/profileHandler2');
                        }
                    });
                });
            } else if (req.user.type == 'fixer') {
                database.getProblems({
                    _id: objectId(req.params.id)
                }, function (results) {
                    //console.log(results);
                    results[0].requestCompletedFixer = true;
                    database.updateProblem(req.params.id, results[0], function (response) {
                        if (response === false) {
                            console.log('There was a problem updating your issue');
                        } else {
                            res.redirect('/auth/profileFixer2');
                        }
                    });
                });
            }
        });

    problemRouter.route('/rating/:id')
        .all(function (req, res, next) {
            if (req.params.id.length === 24) {
                database.getProblems({
                    _id: objectId(req.params.id)
                }, function (results) {
                    var flag = true;
                    if (results.length === 1) {
                        var emailClient = results[0].client;

                        if (typeof (req.user) !== 'undefined') {
                            flag = req.user.email === emailClient;
                        } else {
                            flag = false;
                        }
                    } else {
                        flag = false;
                    }

                    if (flag === false) {
                        res.redirect('/');
                    } else {
                        next();
                    }
                });
            } else {
                res.redirect('/');
            }
        })
        .post(function (req, res) {
            database.getProblems({
                _id: objectId(req.params.id)
            }, function (results) {
                results[0].rating = req.body.rating;
                database.updateProblem(req.params.id, results[0]);

                res.redirect('/auth/client');
            });
        });

    return problemRouter;
};

module.exports = router;
