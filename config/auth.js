module.exports = {
	ensureAuthenticated: function(req, res, next) {
		if(req.isAuthenticated()) {
			return next();
		}

		req.flash('error_msg', 'অনুগ্রহ করে লগইন করুন');
		res.redirect('/users/login');
	}
}