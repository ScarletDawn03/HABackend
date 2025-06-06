export const getHrEmailController = async (req, res) => {
  try {
    const userEmail = req.session?.userEmail;
    if (!userEmail) {
      return res.json({
        success: false,
        error: 'Unauthorized'
      });
    }
    res.json({
      success: true,
      email: userEmail
    });
  } catch (error) {
    console.error('Get hr email error:', error.message);
    res.status(500).json({ error: 'Failed to get hr email' });
  }
};