var OAuth = require('oauth').OAuth
  , oauth
  , config = require('../../config');

// Github oAuth controller
exports.github = function(req, res) {
  var host = req.headers.host
    , url = "https://github.com/login/oauth/authorize/?client_id=" + config.github_client_id + "&scope=gist,repo";

  res.redirect(url);

};

exports.gitCallback = function(req, res, next) {
  var code = req.query.code
    , data = {
        "client_id": config.github_client_id,
        "client_secret": config.github_client_secret,
      }
    , qs = require('querystring')
    , request = require('request');

    req.session.oauth = {};

  // Get the access token with the code
  request.post(
    "https://github.com/login/oauth/access_token?client_id=" + data.client_id + "&client_secret="+data.client_secret+"&code="+code ,
    function(e, r, body) {
      if (e) {
        console.log(e);
        res.send("Authentication Failure!");
      }
      else{
        var body = qs.parse(body);

        req.session.access_token = body.access_token;
        var url = "https://api.github.com/user?access_token=" + req.session.access_token;

        // Get user data
        request({
            method: 'GET', 
            uri: url,
            headers: {
              'user-agent': "Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; Acoo Browser 1.98.744; .NET CLR 3.5.30729)"
            }
          },
          function (error, response, body) {
            var url = "https://api.github.com/user/repos?access_token=" + req.session.access_token;
            request({
                method: 'GET', 
                uri: url,
                headers: {
                  'user-agent': "Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; Acoo Browser 1.98.744; .NET CLR 3.5.30729)"
                }
              },
              function (er, re, bo) {
                var data = JSON.parse(bo);

                data.forEach(function(d, i) {
                  
                });
              }
            );

            // Let's save the data
            body = JSON.parse(body);
            req.session.profile_image = body.avatar_url;
            req.session.username = body.login;
            req.session.fullname = body.name;
            req.session.authType = 'github';

            // Put things in db
            db = createConnection();
            db.execute("SELECT id FROM users WHERE username = ? AND type = ?", [req.session.username, "github"]).on('end', function(r) {
              var exists = (r.result.rows.length == 0) ? false : true;

              if(exists) {
                db = createConnection();

                // Update full name and profile image
                db.execute("UPDATE users SET fullname = ?, profile_image = ? WHERE username = ? AND type = ?", 
                  [req.session.fullname, req.session.profile_image, req.session.username, 'github']
                ).on('end', function(r) {
                  // And get the user data from DB
                  db.execute("SELECT profile_image, fullname FROM users WHERE username = ? AND type = ?", 
                    [req.session.username, "github"]
                  ).on('end', function(r) {
                    req.session.profile_image = r.result.rows[0][0];
                    req.session.fullname = r.result.rows[0][1];

                    res.redirect('/');
                  });
                });
              }

              // Else create a new user and redirect to home page
              else {
                db = createConnection();
                db.execute("INSERT INTO users (username, created_at, is_pro, fullname, profile_image, type) VALUES (?, ?, ?, ?, ?, ?)", 
                  [req.session.username, new Date().toMysqlFormat(), "no", req.session.fullname, req.session.profile_image, 'github']
                ).on('end', function(r) {
                  res.redirect('/');
                });
              }
            });
          }
        );

      }
    }
  );
};

// Twitter oAuth controller
exports.twitter = function(req, res) {
  var host = req.headers.host;
  oauth = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    config.twitter_client_id,
    config.twitter_client_secret,
    "1.0a",
    "http://" + host + "/auth/twitter/callback",
    "HMAC-SHA1"
  );

  oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
    if (error) {
      // console.log(error, config.twitter_consumer_secret);
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
}

exports.twitCallback = function(req, res, next) {
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
          req.session.authType = 'twitter';
          // console.log(results, req.session.oauth);

          // Save in DB
          db = createConnection();

          db.execute("SELECT id FROM users WHERE username = ? AND type = ?", [req.session.username, 'twitter']).on('end', function(r) {
            var exists = (r.result.rows.length == 0) ? false : true;

            oauth.get( 
              "https://api.twitter.com/1.1/users/show.json?screen_name=" + req.session.username,
              req.session.oauth.access_token, 
              req.session.oauth.access_token_secret,
              function(error, data) {

                data = JSON.parse(data);
                req.session.profile_image = data.profile_image_url.replace("_normal", "");
                req.session.fullname = data.name;

                // If the user already exists in the DB
                if(exists) {
                  db = createConnection();

                  // Update full name and profile image
                  db.execute("UPDATE users SET fullname = ?, profile_image = ? WHERE username = ? AND type = ?", 
                    [req.session.fullname, req.session.profile_image, req.session.username, "twitter"]
                  ).on('end', function(r) {
                    // And get the user data from DB
                    db.execute("SELECT profile_image, fullname FROM users WHERE username = ? AND type = ?", 
                      [req.session.username, "twitter"]
                    ).on('end', function(r) {
                      req.session.profile_image = r.result.rows[0][0];
                      req.session.fullname = r.result.rows[0][1];

                      res.redirect('/');
                    });
                  });
                }

                // Else create a new user and redirect to home page
                else {
                  db = createConnection();
                  db.execute("INSERT INTO users (username, created_at, is_pro, fullname, profile_image, type) VALUES (?, ?, ?, ?, ?, ?)", 
                    [req.session.username, new Date().toMysqlFormat(), "no", req.session.fullname, req.session.profile_image, "twitter"]
                  ).on('end', function(r) {
                    res.redirect('/');
                  });
                }
              }
            );
          });
        }

        return;
      }
    );
  }
  else {
    res.redirect('/'); // Redirect to login page
  }


}