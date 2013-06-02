// dashboard controller
exports.show = function(req, res) {
  var data = {}
    , username = (req.session.username) ? req.session.username : 'guest'
    , profile_image = (req.session.profile_image) ? req.session.profile_image : 'guest'
    , fullname = (req.session.fullname) ? req.session.fullname : 'guest'
    , token = (req.session.access_token) ? (req.session.access_token) : 'undefined';

  var writes = [];

  // Get the writes created by the current user
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
};

exports.logout = function(req, res) {
  req.session.destroy();

  res.redirect('/');
};