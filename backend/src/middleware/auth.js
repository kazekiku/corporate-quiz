const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, fullName: user.full_name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

module.exports = { verifyToken, generateToken };