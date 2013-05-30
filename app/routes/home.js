// dashboard controller
exports.show = function(req, res) {
  var data = {}
    , username = (req.session.username) ? req.session.username : 'guest'
    , profile_image = (req.session.profile_image) ? req.session.profile_image : 'guest'
    , fullname = (req.session.fullname) ? req.session.fullname : 'guest';

  var writes = [];

  // Get the writes created by the current user
  db = createConnection();
  db.query("SELECT slug, summary FROM writes WHERE created_by = '" + escape(username) + "'").on('end', function(r) {
    writes = r.result.rows;

    res.render('home', {
      data: data, 
      username : username, 
      profile_image: profile_image, 
      fullname: fullname,
      writes: writes
    });
  });
};

exports.logout = function(req, res) {
  req.session.destroy();

  res.redirect('/');
};