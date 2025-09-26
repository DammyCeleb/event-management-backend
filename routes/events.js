const express = require('express');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const router = express.Router();

// Get all active events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ status: 'active' }).populate('organizerId', 'name email');
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new event
router.post('/', async (req, res) => {
  try {
    const { title, description, date, time, location, capacity, category, organizerId } = req.body;
    
    const event = new Event({
      title,
      description,
      date,
      time,
      location,
      capacity,
      category,
      organizerId
    });
    
    await event.save();
    res.json({ message: 'Event created successfully', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get events by organizer
router.get('/organizer/:organizerId', async (req, res) => {
  try {
    const events = await Event.find({ organizerId: req.params.organizerId });
    
    // Update attendee counts for each event
    for (let event of events) {
      const attendeeCount = await Registration.countDocuments({ eventId: event._id });
      if (event.attendeeCount !== attendeeCount) {
        await Event.findByIdAndUpdate(event._id, { attendeeCount });
        event.attendeeCount = attendeeCount;
      }
    }
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register for event
router.post('/:eventId/register', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const existingRegistration = await Registration.findOne({ eventId, userId });
    if (existingRegistration) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }
    
    const registration = new Registration({ eventId, userId, registrationDate: new Date() });
    await registration.save();
    
    // Update attendee count
    const attendeeCount = await Registration.countDocuments({ eventId });
    await Event.findByIdAndUpdate(eventId, { attendeeCount });
    
    res.json({ message: 'Successfully registered for event' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendees for an event
router.get('/:eventId/attendees', async (req, res) => {
  try {
    const registrations = await Registration.find({ eventId: req.params.eventId })
      .populate({
        path: 'userId',
        select: 'name email phone',
        model: 'User'
      });
    
    const attendees = registrations
      .filter(reg => reg.userId) // Filter out registrations with missing users
      .map(reg => ({
        _id: reg._id,
        name: reg.userId.name || 'Unknown User',
        email: reg.userId.email || 'No Email',
        phone: reg.userId.phone || 'N/A',
        registrationDate: reg.registrationDate
      }));
    
    res.json(attendees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get events user is registered for
router.get('/registered/:userId', async (req, res) => {
  try {
    const registrations = await Registration.find({ userId: req.params.userId })
      .populate('eventId');
    const events = registrations.map(reg => reg.eventId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register for event (new endpoint)
router.post('/register', async (req, res) => {
  try {
    const { eventId, userId } = req.body;
    
    const existingRegistration = await Registration.findOne({ eventId, userId });
    if (existingRegistration) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }
    
    const registration = new Registration({
      eventId,
      userId,
      registrationDate: new Date()
    });
    
    await registration.save();
    
    // Update attendee count
    const attendeeCount = await Registration.countDocuments({ eventId });
    await Event.findByIdAndUpdate(eventId, { attendeeCount });
    
    res.status(201).json({ message: 'Successfully registered for event', registration });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's registrations
router.get('/my-registrations/:userId', async (req, res) => {
  try {
    const registrations = await Registration.find({ userId: req.params.userId })
      .populate('eventId')
      .sort({ registrationDate: -1 });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel registration
router.delete('/cancel-registration/:id', async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const eventId = registration.eventId;
    await Registration.findByIdAndDelete(req.params.id);
    
    // Update attendee count
    const attendeeCount = await Registration.countDocuments({ eventId });
    await Event.findByIdAndUpdate(eventId, { attendeeCount });
    
    res.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel event
router.put('/:eventId/cancel', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      { status: 'canceled' },
      { new: true }
    );
    res.json({ message: 'Event canceled', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;