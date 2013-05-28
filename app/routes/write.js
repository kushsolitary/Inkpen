var Converter = require("../../public/assets/js/Markdown.Converter").Converter;
var converter = new Converter();

// View controller
exports.view = function(req, res) {
  var key = req.params.key.replace(/'/g, "").replace(/"/g, '');
  var data = {};
  data.curr_user = req.session.username;

  db = createConnection();

  db.query("SELECT content, created_by FROM writes WHERE slug = '" + key + "'").on('end', function(r) {
    if(r.result.rows.length > 0 ) {
      data.content = unescape(r.result.rows[0][0]);
      data.content = converter.makeHtml(data.content);

      data.created_by = r.result.rows[0][1];

      if(data.created_by !== 'guest') {
        db = createConnection();

        db.query("SELECT profile_image, fullname FROM users WHERE username = '" + data.created_by + "'").on('end', function(r) {
          data.profile_image = r.result.rows[0][0];
          data.fullname = r.result.rows[0][1];

          res.render('view', {data: data});
        });
      }

      else {
        res.render('view', {data: data});
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

  db.query("SELECT content FROM writes WHERE slug = '" + key + "'").on('end', function(r) {
    data.key = key;

    if(r.result.rows.length > 0) {
      data.content = unescape(r.result.rows[0]);
      var username = (req.session.username) ? req.session.username : false
        , profile_image = (req.session.profile_image) ? req.session.profile_image : false
        , fullname = (req.session.fullname) ? req.session.fullname : false;
      db = createConnection();

      db.query("SELECT slug, summary FROM writes WHERE created_by = '" + escape(username) + "'").on('end', function(r) {
        var writes = r.result.rows;

        res.render('home', {
          data: data, 
          username: username,
          profile_image: profile_image,
          fullname: fullname,
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
  var content = escape(req.body.content[0]).replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    , summary = req.body.content[1].replace(/'/g, "//'")
    , created_at = new Date().toMysqlFormat()
    , created_by = (req.session.username) ? req.session.username : 'guest'
    , key;

  db = createConnection();

  function regenerate() {
    key = generateId();

    db.query("SELECT * FROM writes WHERE slug = '" + key + "'").on('end', function(r) {
      var key_exists = (r.result.rows.length == 0) ? false : true;
      // console.log(key_exists);

      if(key_exists)
        regenerate();

      else {
        db = createConnection();
        var sql = "INSERT INTO writes (slug, content, created_by, created_at, summary) VALUES ('" + key + "', '" + content + "', '" + created_by + "', '" + created_at + "', '" + summary + "')";

        db.query(sql).on('end', function(r) {
          res.json({key: key});  
        });

        db.close();
      }
    });
  }

  regenerate();
}

// Update controller
exports.update = function(req, res) {
  var key = req.body.key;
  var content = escape(req.body.content[0]).replace('$lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    , summary = req.body.content[1].replace(/'/g, "//'")
    , modified_at = new Date().toMysqlFormat()
    , curr_user =  (req.session.username) ? req.session.username : 'guest'
    , created_by;
  //console.log(created_by);
  db = createConnection();

  db.query("SELECT created_by FROM writes WHERE slug = '" + key + "'").on('end', function(r) {
    created_by = r.result.rows[0];

    db = createConnection();

    if(created_by == curr_user && curr_user != "guest") {
      //console.log("Same Users");

      db.query("UPDATE writes SET content = '" + content + "', modified_at = '"+modified_at+"', summary = '"+summary+"' WHERE slug = '" + key + "'").on('end', function(r) {
        res.json({status: 'success'});
      });
    }

    else {
      //console.log("Different Users");
      key = generateId();

      var sql = "INSERT INTO writes (slug, content, created_by, created_at, summary) VALUES ('" + key + "', '" + content + "', '" + curr_user + "', '" + modified_at + "', '" +summary+"')";
      //console.log(sql);

      db.query(sql).on('end', function(r) {
        //console.log(r.result);
        res.json({key: key});  
      });
    }
  });

  db.close();
}

// Delete controller
exports.remove = function(req, res) {
  var key = req.body.key
    , created_by
    , curr_user =  (req.session.username) ? req.session.username : 'guest';

  if(curr_user != 'guest') {
    db = createConnection();
    db.query("SELECT * FROM writes WHERE created_by = '"+curr_user+"' AND slug = '" + key + "'").on('end', function(r) {
      // console.log(r.result.rows);

      if(r.result.rows.length > 0) {
        db = createConnection();
        db.query("DELETE FROM writes WHERE slug = '"+key+"'").on('end', function(r) {
          if(r.result.rows > 0)
            res.json({status: 'success'});
          else
            res.json({status: 'failure'});
        })
      }
      else
        res.json({status: 'failure'});
    });
  }
  else
    res.json({status: 'failure'});
}