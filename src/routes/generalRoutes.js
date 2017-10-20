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

    return authRouter;
};

module.exports = router;
