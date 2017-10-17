var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var session = require('express-session');

var app = express();

var port = process.env.PORT || 8000;

var authRouter = require('./src/routes/authRoutes')();
var problemRouter = require('./src/routes/problemRoutes')();

var mail = require('./src/controllers/mail');

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

app.get('/', function (req, res) {
    if (req.user && req.user.type === 'client') {
        res.redirect('/auth/client');
    } else if (req.user && req.user.type === 'handler') {
        res.redirect('/auth/profileHandler2');
    } else if (req.user && req.user.type === 'fixer') {
        res.redirect('/auth/profileFixer2');
    } else if (req.user && req.user.type === 'admin') {
        res.redirect('/auth/profileAdmin');
    } else {
        res.render('index2');
    }
});

app.listen(port, function (err) {
    console.log('Running server on port: ' + port)
});

mail();
