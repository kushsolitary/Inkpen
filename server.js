
var express = require('express')
  // Main App
  , app = express()
  , RedisStore = require('connect-redis')(express);

// Assets Path
app.use(express.static(__dirname + '/public/assets'));
app.set('views', __dirname + '/app/views');
app.set('view engine', 'jade');
// Let jade not print everything in a single line
app.locals.pretty = true;


// Parse POST Data
app.use(express.bodyParser());
// Parse Cookie Data
app.use(express.cookieParser());
// Logger
app.use(express.logger('dev'));


// Redis

var redis = require("redis").createClient();
// Setting Up Redis Backed Sessions

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
function createConnection() {
  var db = mysql.createTCPClient();
  db.set('auto_prepare', true)
    .set('row_as_hash', false)
    .auth('inkpen', 'root', '');

  return db;
}

// Create tables
var db = createConnection();
db.query("CREATE TABLE IF NOT EXISTS users (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, username VARCHAR(20), is_pro VARCHAR(10), created_at DATETIME)");
db.query("CREATE TABLE IF NOT EXISTS writes (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(50), content LONGTEXT, created_by VARCHAR(20), is_private VARCHAR(10), created_at DATETIME)");
db.close();


// -----
// Helpers
// -----

var generateId = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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

// -----
// Globals
// -----


// =====
// Routes
// =====

app.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

// -----
// General
// -----

app.get('/', function(req, res) {
  var data = {};

  res.render('home', {data: data, username: (req.session.username) ? req.session.username : false});

  // console.log(req.session);
  // console.log(redis);
});

// Tmp Favicon Fallback
app.get('/favicon.ico', function(req, res) {
  
});

// -----
// Writeup
// -----

// Get Writeup

app.get('/view/:key', function(req, res) {
  var key = req.params.key;
  var data = {};
  db = createConnection();

  db.query("SELECT content FROM writes WHERE slug = '" + key + "'").on('end', function(r) {
    data.key = key;
    data.content = unescape(r.result.rows[0]);
    res.render('home', {data: data, username: (req.session.username) ? req.session.username : false});

    //console.log(r.result.rows[0]);
  });


  db.close();

});

// Save Writeup

app.post('/write/save', function(req, res) {
  var key = generateId();
  var content = escape(req.body.content)
    , created_at = new Date().toMysqlFormat()
    , created_by = (req.session.username) ? req.session.username : 'guest';

  db = createConnection();

  var sql = "INSERT INTO writes (slug, content, created_by, created_at) VALUES ('" + key + "', '" + content + "', '" + created_by + "', '" + created_at + "')";
  //console.log(sql);

  db.query(sql).on('end', function(r) {
    //console.log(r.result);
    res.json({key: key});  
  });

  db.close();


});

// Update Writeup

app.post('/write/update', function(req, res) {
  var key = req.body.key;
  var content = escape(req.body.content)
    , modified_at = new Date().toMysqlFormat()
    , curr_user =  (req.session.username) ? req.session.username : 'guest'
    , created_by;
  //console.log(created_by);
  db = createConnection();

  db.query("SELECT created_by FROM writes WHERE slug = '" + key + "'").on('end', function(r) {
    created_by = r.result.rows[0];

    db = createConnection();

    if(created_by == curr_user) {
      //console.log("Same Users");

      db.query("UPDATE writes SET content = '" + content + "' WHERE slug = '" + key + "'").on('end', function(r) {
        res.json({status: 'success'});
      });
    }

    else {
      //console.log("Different Users");
      key = generateId();
      content = escape(req.body.content);

      var sql = "INSERT INTO writes (slug, content, created_by, created_at) VALUES ('" + key + "', '" + content + "', '" + curr_user + "', '" + modified_at + "')";
      //console.log(sql);

      db.query(sql).on('end', function(r) {
        //console.log(r.result);
        res.json({key: key});  
      });
    }
  });


  db.close();
  
});

// -----
// Twitter oAuth
// -----

var OAuth = require('oauth').OAuth
  , oauth = new OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      "3H9mJB3pfIgrnu4v6WKWg",
      "CkGwsgEkZSYxkhGSPue1augSGlArxl97fa5D7LxcYTU",
      "1.1A",
      "http://localhost:8080/auth/twitter/callback",
      "HMAC-SHA1"
    );

app.get('/auth/twitter', function(req, res) {

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
          // console.log(results, req.session.oauth);

          // Save in DB
          db = createConnection();

          db.query("SELECT id FROM users WHERE username = '" + req.session.username + "'").on('end', function(r) {
            var exists = (r.result.rows.length == 0) ? false : true;

            if(exists)
              res.redirect('/');
            else {
              // Create a user
              db = createConnection();
              db.query("INSERT INTO users (username, created_at, is_pro) VALUES ('"+ req.session.username +"', '"+new Date().toMysqlFormat()+"', 'no')").on('end', function(r) {
                console.log(r.result);
                res.redirect('/');
              })
            }
          });

          // res.redirect('/');
        }

        return;
      }
    );
  }
  else {
    res.redirect('/login'); // Redirect to login page
  }

});

// -----
// User Profile
// -----