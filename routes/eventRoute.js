const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { authorize, listEvents } = require('./googleApiUtils');
const moment = require('moment-timezone');

const USERS_DATA_PATH = path.join(__dirname, '../jsonFiles/users.json');
// Array to store events
const eventsArray = [];

router.get('/events', async (req, res) => {
  try {
    const auth = await authorize();
    const fetchedEvents = await listEvents(auth);

    // Get the current date and time in the Israel/Jerusalem time zone
    const israelTimezone = 'Asia/Jerusalem';
    const currentDate = moment().tz(israelTimezone);
    const startOfNextWeek = currentDate.clone().startOf('isoWeek').add(1, 'week').startOf('day');
    const endOfNextWeek = startOfNextWeek.clone().endOf('isoWeek').endOf('day');

    // Filter out events that occur within the next week
    const eventsNextWeek = fetchedEvents.filter(event => {
      const eventStartTime = moment(event.start.dateTime).tz(israelTimezone);
      const eventEndTime = moment(event.end.dateTime).tz(israelTimezone);
      return (
        (eventStartTime.isBetween(startOfNextWeek, endOfNextWeek, null, '[]') ||
          eventEndTime.isBetween(startOfNextWeek, endOfNextWeek, null, '[]')) &&
        eventEndTime.isAfter(currentDate)
      );
    });

    res.json(eventsNextWeek);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Error fetching events', details: err.message });
  }
});


router.post('/calculate-free-time', async (req, res) => {
  try {
    const { username } = req.body;

    // Read the JSON data from the file
    let userData = await fs.readFile(USERS_DATA_PATH, 'utf8');
    let usersData = JSON.parse(userData);

    // Find the user with the provided username
    const userIndex = usersData.findIndex(user => user.username === username);
    if (userIndex === -1) {
      return res.status(404).json({ error: `User with username '${username}' not found` });
    }

    // Flatten the events array
    const allEvents = usersData[userIndex].events.flat();

    // Get the current date and time in the Israel/Jerusalem time zone
    const israelTimezone = 'Asia/Jerusalem';
    const currentDateTime = moment().tz(israelTimezone);

    // Filter out events that start from the current date and time and have not ended
    const futureEvents = allEvents.filter(event => {
      const eventStartDateTime = moment(event.start.dateTime).tz(israelTimezone);
      const eventEndDateTime = moment(event.end.dateTime).tz(israelTimezone);
      return eventStartDateTime.isSameOrAfter(currentDateTime) && eventEndDateTime.isAfter(currentDateTime);
    }).sort((a, b) => moment(a.start.dateTime).tz(israelTimezone) - moment(b.start.dateTime).tz(israelTimezone));

    // Calculate free time between future events for each day
    const freeTime = [];
    let currentDayStart = currentDateTime.clone();
    let currentDayEnd = currentDayStart.clone().hours(21);
    let previousEventEnd = currentDateTime;

    const oneWeekAhead = currentDateTime.clone().add(7, 'days');

    while (currentDayStart.isBefore(oneWeekAhead)) {
      const dayEvents = futureEvents.filter(event => {
        const eventStart = moment(event.start.dateTime).tz(israelTimezone);
        return eventStart.isBetween(currentDayStart, currentDayEnd, null, '[)');
      });

      let hasEvents = dayEvents.length > 0;

      if (!hasEvents) {
        // If there are no events for the day, add the entire working day as a free time slot
        freeTime.push({
          start: currentDayStart.format('YYYY-MM-DDTHH:mm:ss'),
          end: currentDayEnd.format('YYYY-MM-DDTHH:mm:ss'),
          duration: currentDayEnd.diff(currentDayStart, 'minutes')
        });
      } else {
        for (const event of dayEvents) {
          const currentEventStart = moment(event.start.dateTime).tz(israelTimezone);
          const currentEventEnd = moment(event.end.dateTime).tz(israelTimezone);
          if (moment(event.start = Date))

          if (previousEventEnd.isBefore(currentEventStart)) {
            freeTime.push({
              start: previousEventEnd.format('YYYY-MM-DDTHH:mm:ss'),
              end: currentEventStart.format('YYYY-MM-DDTHH:mm:ss'),
              duration: currentEventStart.diff(previousEventEnd, 'minutes')
            });
          }

          previousEventEnd = currentEventEnd.isBefore(currentDayEnd) ? currentEventEnd : currentDayEnd;
        }

        if (previousEventEnd.isBefore(currentDayEnd)) {
          freeTime.push({
            start: previousEventEnd.format('YYYY-MM-DDTHH:mm:ss'),
            end: currentDayEnd.format('YYYY-MM-DDTHH:mm:ss'),
            duration: currentDayEnd.diff(previousEventEnd, 'minutes')
          });
        }
      }

      currentDayStart.add(1, 'day').startOf('day').hours(7);
      currentDayEnd = currentDayStart.clone().hours(21);
      previousEventEnd = currentDayStart;
    }

    // Update user's freeTime property
    usersData[userIndex].freeTime = freeTime;

    // Write updated user data back to the file
    await fs.writeFile(USERS_DATA_PATH, JSON.stringify(usersData, null, 2));

    res.json({ freeTime });
  } catch (error) {
    console.error('Error reading or parsing users data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = router;