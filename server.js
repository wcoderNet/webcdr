var express = require('express');
var compress = require('compression');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var LeveldbStore = require('connect-leveldb')(session);

var config = require('./config');

var _ = require('lodash');
var users = require('./users');

var passport = require('passport');
passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  users.query('where', 'id', '=', id)
    .fetch()
    .then(function (col) {
      done(null, col.at(0).toJSON());
    })
    .catch(function (err) {
      done(err);
    });
});
passport.use(require('./auth'));

var app = express();
app.use(morgan('dev'));
app.use(compress());
app.use(bodyParser());
app.use(cookieParser());
app.use(session({
  store: new LeveldbStore({
    dbLocation: config.session.database
  }),
  secret: config.session.key
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function (req, res) {
  res.sendfile(__dirname + '/public/login.html');
});
app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);
app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

app.use('/api', ensureAuthenticated);
app.use('/api', require('./api'));

app.get('/', ensureAuthenticated);
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/profile', ensureAuthenticated);
app.get('/profile', function (req, res) {
  res.send(_.omit(req.user, 'password'));
});

app.use('/admin', ensureAdmin);
app.use('/admin', require('./admin'));

app.use(express.static(__dirname + '/public'));

app.listen(process.env.PORT || 9030);

function ensureAuthenticated (req, res, next) {
  if (!req.isAuthenticated()) {
    res.redirect('/login');
  }
  next();
}

function ensureAdmin (req, res, next) {
  ensureAuthenticated(req, res, function () {
    if (!req.user.admin) {
      res.json({error: 'access denied'});
    } else {
      next();
    }
  });
}
