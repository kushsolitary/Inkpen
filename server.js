var express = require('express')
  , app = express()
  , RedisStore = require('connect-redis')(express);

// Assets Path
app.use(express.static(__dirname + '/public/assets'));
app.set('views', __dirname + '/app/views');
app.set('view engine', 'jade');

app.locals.pretty = true;

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.logger('dev'));
app.use(express.favicon(__dirname + '/public/favicon.png'));

// Redis
var redis = require("redis").createClient();

app.use(
  express.session({
      secret: "lolzima"
    , store: new RedisStore({client: redis})
  })
);

// Error handling
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

// Launch Main App
app.listen(80, function(port) {
  // console.log("Server started on localhost: 8080");
});


// -----
// Database
// -----

var mysql = require("mysql-native");
createConnection = function() {
  var db = mysql.createTCPClient();
  db.set('auto_prepare', true)
    .set('row_as_hash', false)
    .auth('inkpen', 'root', '');

  return db;
}

// Create tables
var db = createConnection();
db.execute("CREATE TABLE IF NOT EXISTS users (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, username VARCHAR(20), fullname VARCHAR(50), profile_image VARCHAR(100), is_pro VARCHAR(10), created_at DATETIME)");
db.execute("CREATE TABLE IF NOT EXISTS writes (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(50), content TEXT, summary VARCHAR(40), created_by VARCHAR(20), is_private VARCHAR(10), created_at DATETIME, modified_at DATETIME)");
db.close();


// -----
// Helpers
// -----
function twoDigits(d) {
  if(0 <= d && d < 10) return "0" + d.toString();
  if(-10 < d && d < 0) return "-0" + (-1*d).toString();
  return d.toString();
}

Date.prototype.toMysqlFormat = function() {
  return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};


// =====
// Routes
// =====

var homeC = require('./app/routes/home.js');
var writeC = require('./app/routes/write.js');
var oAuthC = require('./app/routes/oauth.js');

app.get('/logout', homeC.logout);
app.get('/', homeC.show);

app.get('/view/:key', writeC.view);
app.get('/edit/:key', writeC.edit);
app.post('/write/save', writeC.save);
app.post('/write/update', writeC.update);
app.post('/write/delete', writeC.remove);

// Tmp Favicon Fallback
app.get('/favicon.ico', function(req, res) {
  
});


// -----
// Twitter oAuth
// -----
app.get('/auth/twitter', oAuthC.twitter);
app.get('/auth/twitter/callback', oAuthC.twitCallback);
