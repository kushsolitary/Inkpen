// dashboard controller
exports.show = function(req, res) {
  var data = {};
  res.render('home', {
    data: data, 
    username: (req.session.username) ? req.session.username : false,
    profile_image: (req.session.profile_image) ? req.session.profile_image : false,
    fullname: (req.session.fullname) ? req.session.fullname : false
  });
};

exports.logout = function(req, res) {
  req.session.destroy();

  res.redirect('/');
};