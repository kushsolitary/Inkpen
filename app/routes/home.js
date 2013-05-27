// dashboard controller
exports.show = function(req, res) {
  var data = {};
  res.render('home', {data: data, username: (req.session.username) ? req.session.username : false});
};

exports.logout = function(req, res) {
  req.session.destroy();

  res.redirect('/');
};