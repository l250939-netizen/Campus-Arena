module.exports = function requireVerifiedUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Please log in to continue.",
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      message: "Please verify your university email before creating or joining sessions.",
    });
  }

  next();
};
