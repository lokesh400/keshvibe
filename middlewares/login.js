module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        return res.redirect("/user/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.RedirectUrl = req.session.redirectUrl;
    }
    next();
};

module.exports.ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to continue.');
    res.redirect('/user/login');
};

module.exports.isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === "admin") {
        return next();
    }
    req.flash('error_msg', 'Access denied: Admins only.');
    res.redirect('/admin');
};
