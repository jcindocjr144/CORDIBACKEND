export default function getUser(req, res, next) {
  try {
    if (!req.headers.user) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const user = JSON.parse(req.headers.user);

    if (!user.id || !user.role) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(400).json({ success: false, message: "Invalid user header" });
  }
}
