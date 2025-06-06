export function requireAuth(req, res, next) {
  if (req.session?.userEmail) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
}