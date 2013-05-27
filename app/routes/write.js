// dashboard controller
exports.view = function(req, res) {
  var key = req.params.key;
  var data = {};
  db = createConnection();

  db.query("SELECT content FROM writes WHERE slug = '" + key + "'").on('end', function(r) {
    data.key = key;
    data.content = unescape(r.result.rows[0]);
    res.render('view', {data: data});
  });

  db.close();
};

exports.edit = function(req, res) {
  var key = req.params.key;
  var data = {};
  db = createConnection();

  db.query("SELECT content FROM writes WHERE slug = '" + key + "'").on('end', function(r) {
    data.key = key;
    data.content = unescape(r.result.rows[0]);
    res.render('home', {
      data: data, 
      username: (req.session.username) ? req.session.username : false,
      profile_image: (req.session.profile_image) ? req.session.profile_image : false,
      fullname: (req.session.fullname) ? req.session.fullname : false
    });
  });

  db.close();
};

exports.save = function(req, res) {
  var content = escape(req.body.content).replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
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
        var sql = "INSERT INTO writes (slug, content, created_by, created_at) VALUES ('" + key + "', '" + content + "', '" + created_by + "', '" + created_at + "')";

        db.query(sql).on('end', function(r) {
          res.json({key: key});  
        });

        db.close();
      }
    });
  }

  regenerate();
}

exports.update = function(req, res) {
  var key = req.body.key;
  var content = escape(req.body.content).replace('$lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
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
}