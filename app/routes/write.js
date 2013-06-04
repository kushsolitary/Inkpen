var generateId = function() {
  return 'xxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

var escapeQuotes = function(str) {
  return str.replace(/'/g, "").replace(/"/g, '');
}

var escapeHTML = function(str) {
  return str.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&');
}

var Converter = require("../../public/assets/js/Markdown.Converter").Converter;
var converter = new Converter();

// View controller
exports.view = function(req, res) {
  var data = {};
  data.key = escapeQuotes(req.params.key);

  var username = (req.session.username) ? req.session.username : 'guest'
    , profile_image = (req.session.profile_image) ? req.session.profile_image : 'guest'
    , fullname = (req.session.fullname) ? req.session.fullname : 'guest'
    , token = (req.session.access_token) ? (req.session.access_token) : 'undefined';

  db = createConnection();
  db.execute("SELECT content, created_by, user_type FROM writes WHERE slug = ?", [data.key]).on('end', function(r) {
    if(r.result.rows.length > 0 ) {
      console.log(r.result.rows);

      data.content = unescape(r.result.rows[0][0]);
      data.content = converter.makeHtml(data.content);

      data.created_by = r.result.rows[0][1];
      try {
        data.user_type = r.result.rows[0][2];
      } catch(e) {}


      if(data.created_by !== 'guest') {
        db = createConnection();

        db.execute("SELECT profile_image, fullname FROM users WHERE username = ? AND type = ?", [data.created_by, data.user_type]).on('end', function(r) {
          data.profile_image = r.result.rows[0][0];
          data.fullname = r.result.rows[0][1];

          res.render('view', {
            data: data, 
            username: username,
            profile_image: profile_image,
            fullname: fullname,
            token: token
          });
        });
      }

      else {
        res.render('view', {
          data: data, 
          username: username,
          profile_image: profile_image,
          fullname: fullname,
          token: token
        });
      }
    }
    else
      res.redirect('/');
  });

  db.close();
};

// Edit controller
exports.edit = function(req, res) {
  var key = req.params.key;
  var data = {};

  db = createConnection();
  db.execute("SELECT content FROM writes WHERE slug = ?", [key]).on('end', function(r) {
    data.key = key;

    if(r.result.rows.length > 0) {
      data.content = unescape(r.result.rows[0]);

      var username = (req.session.username) ? req.session.username : 'guest'
        , profile_image = (req.session.profile_image) ? req.session.profile_image : 'guest'
        , fullname = (req.session.fullname) ? req.session.fullname : 'guest'
        , token = (req.session.access_token) ? (req.session.access_token) : 'undefined';

      // console.log(username);

      db = createConnection();
      db.execute("SELECT slug, summary, created_at FROM writes WHERE created_by = ? AND user_type = ? ORDER BY created_at DESC", 
        [username, req.session.authType]
      ).on('end', function(r) {
        r.result.rows.forEach(function(r, i) {
          // console.log(moment(r[2]).fromNow(true));
          r[2] = moment(r[2]).fromNow(true);
        });

        var writes = r.result.rows;

        res.render('home', {
          data: data, 
          username: username,
          profile_image: profile_image,
          fullname: fullname,
          token: token,
          writes: writes
        });
      });
    }
    else 
      res.redirect('/');
  });

  db.close();
};

// Save controller
exports.save = function(req, res) {
  var content = escapeQuotes(escapeHTML(req.body.content))
    , summary = escapeQuotes(req.body.summary)
    , created_at = new Date().toMysqlFormat()
    , created_by = (req.session.username) ? req.session.username : 'guest'
    , authType = (req.session.authType) ? req.session.authType : 'twitter'
    , key;

  db = createConnection();

  function regenerate() {
    key = generateId();

    db.execute("SELECT * FROM writes WHERE slug = ?", [key]).on('end', function(r) {
      var key_exists = (r.result.rows.length == 0) ? false : true;
      // console.log(key_exists);

      if(key_exists)
        regenerate();

      else {
        db = createConnection();
        db.execute("INSERT INTO writes (slug, content, created_by, created_at, summary, user_type) VALUES (?, ?, ?, ?, ?, ?)",
          [key, content, created_by, created_at, summary, authType]
        )
        .on('end', function(r) {
          res.json({
            key: key, 
            status: 'success', 
            msg: 'Saved successfuly. Redirecting...'
          });  
        });

        db.close();
      }
    });
  }

  regenerate();
};

// Save as gist controller
/*
exports.saveAsGist = function(req, res) {
  var url = req.body.url
    , created_at = new Date().toMysqlFormat()
    , created_by = (req.session.username) ? req.session.username : 'guest';

    db = createConnection();
    db.execute("INSERT INTO gists (url, created_at, created_by) VALUES (?, ?, ?)",
      [url, created_at, created_by]
    )
    .on('end', function(r) {

    });
};
*/

// Update controller
exports.update = function(req, res) {
  var key = req.body.key;
  var content = escapeQuotes(escapeHTML(req.body.content))
    , summary = escapeQuotes(req.body.summary)
    , modified_at = new Date().toMysqlFormat()
    , curr_user =  (req.session.username) ? req.session.username : 'guest'
    , authType = (req.session.authType) ? req.session.authType : 'twitter'
    , created_by;

  db = createConnection();
  db.execute("SELECT created_by FROM writes WHERE slug = ?", [key]).on('end', function(r) {
    if(r.result.rows.length > 0) {
      created_by = r.result.rows[0];

      db = createConnection();

      // If the writeup is of logged in user and is not a guest, then update it.
      if(created_by == curr_user && curr_user != "guest") {
        //console.log("Same Users");

        db.execute("UPDATE writes SET content = ?, modified_at = ?, summary = ? WHERE slug = ?",
          [content, modified_at, summary, key]
        )
        .on('end', function(r) {
          res.json({
            status: 'success', 
            msg: "Updated successfuly."
          });
        });
      }

      // If different users, create a new writeup.
      else {
        //console.log("Different Users");
        key = generateId();

        db = createConnection();
        db.execute("INSERT INTO writes (slug, content, created_by, created_at, summary, user_type) VALUES (?, ?, ?, ?, ?, ?)",
          [key, content, created_by, modified_at, summary, authType]
        )
        .on('end', function(r) {
          res.json({
            key: key, 
            status: 'success', 
            msg: 'Forked successfuly. Redirecting...'
          });  
        });
      }
    }

    // If the writeup doesn't exists, send error.
    else {
      res.json({
        status: 'failure',
        msg: 'This writeup doesn\'t exists. Refresh the page or try again.'
      });
    }
  });

  db.close();
};

// Delete controller
exports.remove = function(req, res) {
  var key = req.body.key
    , created_by
    , curr_user =  (req.session.username) ? req.session.username : 'guest';

  // console.log(curr_user);

  if(curr_user != 'guest') {
    db = createConnection();
    db.execute("SELECT * FROM writes WHERE created_by = ? AND slug = ? AND user_type = ?",
      [curr_user, key, req.session.authType]
    )
    .on('end', function(r) {
      // console.log(r.result.rows);

      if(r.result.rows.length > 0) {
        db = createConnection();
        db.execute("DELETE FROM writes WHERE slug = ?", [key]).on('end', function(r) {
          // console.log(r.result.rows);
          res.json({
            status: 'success',
            msg: 'Deleted successfuly. Redirecting...'
          });
        })
      }
      else
        res.json({
          status: 'failure',
          msg: 'You do not have permission to delete someone else\'s write-ups.'
        });
    });
  }
  else
    res.json({
      status: 'failure',
      msg: 'Please sign in if you want to delete your write-ups.'
    });
};