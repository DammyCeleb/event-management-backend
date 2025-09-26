const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const user = new User({ name, email, password, role: role || 'attendee' });
    await user.save();
    
    res.json({ 
      message: 'Registration successful',
      user: { id: user._id, name, email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ 
      message: 'Login successful',
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, organization: user.organization }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, phone, organization, password } = req.body;
    const updateData = { name, email, phone, organization };
    
    if (password) {
      updateData.password = password;
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ _id: user._id, name: user.name, email: user.email, phone: user.phone, organization: user.organization });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;