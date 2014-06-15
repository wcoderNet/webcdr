var express = require('express');
var compress = require('compression');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var morgan = require('morgan');

var Bookshelf = require('bookshelf');
Bookshelf.db = Bookshelf.initialize({
  client: 'mysql',
  connection: {
    host: 'localhost',
    user: 'root',
    password: '123321',
    database: 'asteriskcdrdb'
  }
});

var _ = require('lodash');
var testUsers = [{
  id: 1,
  username: 'admin',
  password: 'admin'
}, {
  id: 2,
  username: 'test',
  password: 'test'
}];

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  process.nextTick(function () {
    var user = _.find(testUsers, {id: id});
    done(null, user);
  });
});

passport.use(new LocalStrategy(
  function (username, password, done) {
    var user = _.find(testUsers, {username: username, password: password});
    if (user) {
      done(null, user);
    } else {
      done(null, false, { message: "Wrong username or password" });
    }
  }
));

var app = express();
app.use(morgan('dev'));
app.use(compress());
app.use(bodyParser());
app.use(cookieParser());
app.use(session({
  secret: '123hjhfds7&&&kjfh&&&788'
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function (req, res) {
  res.sendfile('./public/login.html');
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
  res.sendfile('./public/index.html');
});

app.use(express.static(__dirname + '/public'));

app.listen(process.env.PORT || 9030);

function ensureAuthenticated (req, res, next) {
  if (!req.isAuthenticated()) {
    res.redirect('/login');
  }
  next();
}
