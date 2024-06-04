const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const GROUPS_DATA_PATH = path.join(__dirname, '../jsonFiles/groups.json');
const USERS_DATA_PATH = path.join(__dirname, '../jsonFiles/users.json');

let groups = []; // Initialize groups array

// Load groups data asynchronously when server starts
fs.readFile(GROUPS_DATA_PATH)
    .then(data => {
        if (data.length > 0) {
            groups = JSON.parse(data); // Parse JSON data
            console.log('Groups data loaded:', groups); // Debugging line
        }
    })
    .catch(err => {
        console.error('Error reading groups.json:', err);
    });

// Route to create a group
router.post('/groups', async (req, res) => {
    const { groupName } = req.body;

    if (!groupName) {
        return res.status(400).json({ error: 'Group name is required' });
    }

    try {
        const groupExistsIndex = groups.findIndex(group => group.name === groupName);
        if (groupExistsIndex !== -1) {
            return res.status(400).json({ error: 'Group name already taken, please try another name' });
        }

        groups.push({ name: groupName, users: [] });
        await saveGroupsToFile(groups); // Added await here
        res.status(201).json({ message: 'Group created successfully' });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// Route to add a user to a group
router.post('/groups/:groupName/users', async (req, res) => { // Added async here
    const { groupName } = req.params;
    const { username } = req.body;
    const group = groups.find(group => group.name === groupName);

    if (!group) {
        return res.status(404).json({ error: 'Group not found' });
    }

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    group.users.push(username);
    await saveGroupsToFile(groups); // Added await here
    res.status(201).json({ message: 'User added to group successfully' });
});

// Function to save groups data to groups.json
async function saveGroupsToFile(groups) {
    try {
        await fs.writeFile(GROUPS_DATA_PATH, JSON.stringify(groups, null, 2));
        console.log('Groups data saved to groups.json');
    } catch (error) {
        console.error('Error saving groups data to groups.json:', error);
        throw error;
    }
}

// Route to fetch schedules of group members
router.get('/groups/:groupName/schedules', async (req, res) => {
    const { groupName } = req.params;
    const group = groups.find(group => group.name === groupName);

    if (!group) {
        return res.status(404).json({ error: 'Group not found' });
    }

    try {
        const userData = await fs.readFile(USERS_DATA_PATH, 'utf8');
        const users = JSON.parse(userData);
        const groupMembersSchedules = group.users.map(username => {
            const user = users.find(user => user.username === username);
            return user ? { username: user.username, freeTime: user.freeTime } : null;
        }).filter(schedule => schedule !== null); // Remove null values

        console.log('Group members schedules:', groupMembersSchedules); // Debugging line
        res.json(groupMembersSchedules);
    } catch (error) {
        console.error('Error fetching group members schedules:', error);
        res.status(500).json({ error: 'Failed to fetch group members schedules' });
    }
});

module.exports = router;
