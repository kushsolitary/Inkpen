
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

// Redis
var redis = require("redis").createClient();

app.use(
  express.session({
      secret: "lolzima"
    , store: new RedisStore({client: redis})
  })
);

// Launch Main App
var port = process.env.PORT || 8080;
app.listen(port);


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
db.query("CREATE TABLE IF NOT EXISTS users (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, username VARCHAR(20), fullname VARCHAR(50), profile_image VARCHAR(100), is_pro VARCHAR(10), created_at DATETIME)");
db.query("CREATE TABLE IF NOT EXISTS writes (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(50), content TEXT, created_by VARCHAR(20), is_private VARCHAR(10), created_at DATETIME)");
db.close();


// -----
// Helpers
// -----

generateId = function() {
  return 'xxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

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

app.get('/logout', homeC.logout);
app.get('/', homeC.show);

app.get('/view/:key', writeC.view);
app.get('/edit/:key', writeC.edit);
app.post('/write/save', writeC.save);
app.post('/write/update', writeC.update);

// Tmp Favicon Fallback
app.get('/favicon.ico', function(req, res) {
  
});


// -----
// Twitter oAuth
// -----

var OAuth = require('oauth').OAuth;
var oauth;


app.get('/auth/twitter', function(req, res) {
  var host = req.headers.host;
  oauth = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    "3H9mJB3pfIgrnu4v6WKWg",
    "CkGwsgEkZSYxkhGSPue1augSGlArxl97fa5D7LxcYTU",
    "1.0a",
    "http://" + host + "/auth/twitter/callback",
    "HMAC-SHA1"
  );

  oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
    if (error) {
      console.log(error, config.twitter_consumer_secret);
      res.send("Authentication Failed!");
    }
    else {
      req.session.oauth = {
        token: oauth_token,
        token_secret: oauth_token_secret
      };
      // console.log(req.session.oauth);
      res.redirect('https://twitter.com/oauth/authenticate?oauth_token='+oauth_token)
    }
  });

});

app.get('/auth/twitter/callback', function(req, res, next) {

  if (req.session.oauth) {
    req.session.oauth.verifier = req.query.oauth_verifier;
    var oauth_data = req.session.oauth;

    oauth.getOAuthAccessToken(
      oauth_data.token,
      oauth_data.token_secret,
      oauth_data.verifier,
      function(error, oauth_access_token, oauth_access_token_secret, results) {

        if (error) {
          console.log(error);
          res.send("Authentication Failure!");
        }
        else {
          req.session.oauth.access_token = oauth_access_token;
          req.session.oauth.access_token_secret = oauth_access_token_secret;
          req.session.username = results.screen_name;
          console.log(results, req.session.oauth);

          // Save in DB
          db = createConnection();

          db.query("SELECT id FROM users WHERE username = '" + req.session.username + "'").on('end', function(r) {
            var exists = (r.result.rows.length == 0) ? false : true;

            if(exists)
              res.redirect('/');
            else {
              oauth.get( 
                "https://api.twitter.com/1.1/users/show.json?screen_name=" + req.session.username,
                req.session.oauth.access_token, 
                req.session.oauth.access_token_secret,
                function(error, data) {
                  console.log("https://api.twitter.com/1.1/users/show.json?screen_name=" + req.session.username,req.session.oauth.access_token,req.session.oauth.access_token_secret);
                  data = JSON.parse(data);
                  req.session.profile_image = data.profile_image_url.replace("_normal", "");
                  req.session.fullname = data.name;

                  db = createConnection();
                  db.query("INSERT INTO users (username, created_at, is_pro, fullname, profile_image) VALUES ('"+ req.session.username +"', '"+new Date().toMysqlFormat()+"', 'no', '"+req.session.fullname+"', '"+req.session.profile_image+"')").on('end', function(r) {
                    // console.log(r.result);
                    res.redirect('/');
                  })
                }
              );
            } 
          });

        }

        return;
      }
    );
  }
  else {
    res.redirect('/'); // Redirect to login page
  }

});