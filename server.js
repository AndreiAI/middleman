const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');

const https = require('https');
const fs = require('fs');

//For SSL certificate
const options = {
    cert: fs.readFileSync('./sslcert/fullchain.pem'),
    key: fs.readFileSync('./sslcert/privkey.pem')
};

const authRouter = require('./src/routes/authRoutes')();
const problemRouter = require('./src/routes/problemRoutes')();

const mail = require('./src/controllers/mail');

var app = express();

var port = process.env.PORT || 8000;

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({
    secret: 'middleman'
}));

require('./src/config/passport')(app);

app.set('views', './src/views');
app.set('view engine', 'ejs');
app.use('/auth', authRouter);
app.use('/problem', problemRouter);

app.get('http://solverly.io', function (req, res) {
    if (req.user && req.user.type === 'client') {
        res.redirect('https://solverly.io/auth/client');
    } else if (req.user && req.user.type === 'handler') {
        res.redirect('https://solverly.io/auth/profileHandler2');
    } else if (req.user && req.user.type === 'fixer') {
        res.redirect('https://solverly.io/auth/profileFixer2');
    } else if (req.user && req.user.type === 'admin') {
        res.redirect('https://solverly.io/auth/profileAdmin');
    } else {
        res.redirect('https://solverly.io/');
    }
});

app.get('/', function (req, res) {
    if (req.user && req.user.type === 'client') {
        res.redirect('https://solverly.io/auth/client');
    } else if (req.user && req.user.type === 'handler') {
        res.redirect('https://solverly.io/auth/profileHandler2');
    } else if (req.user && req.user.type === 'fixer') {
        res.redirect('https://solverly.io/auth/profileFixer2');
    } else if (req.user && req.user.type === 'admin') {
        res.redirect('https://solverly.io/auth/profileAdmin');
    } else {
        res.render('index2');
    }
})

app.listen(port, function (err) {
    console.log('Running server on port: ' + port)
});

https.createServer(options, app).listen(8443);

mail();
