let freeSpacesData = [];
let isFreeSpacesVisible = false;
let freeSpacesCalculated = false;
let currentSuggestionIndex = 0;
const suggestionsPerBatch = 5;
let allSuggestions = [];

// Fetches free spaces data
async function getFreeSpaces() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    if (!username) {
      console.error('Username not found in URL query parameter.');
      return;
    }

    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'block';
    }

    const response = await fetch('http://localhost:3000/events/calculate-free-time', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });

    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }

    const data = await response.json();

    if (response.ok) {
      console.log('Free spaces calculated successfully.');
      freeSpacesData = data.freeTime; // Store the data for later use
      document.getElementById('toggleFreeSpaces').style.display = 'inline'; // Show the toggle button
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
  freeSpacesCalculated = true;
}

// Displays free spaces
function displayFreeSpaces(freeSpaces) {
  const freeSpacesContainer = document.getElementById('free-spaces-container');
  freeSpacesContainer.innerHTML = '';

  if (freeSpaces.length === 0) {
    freeSpacesContainer.textContent = 'No free spaces available.';
  } else {
    const freeSpacesList = document.createElement('ul');
    freeSpaces.forEach(freeSpace => {
      const listItem = document.createElement('li');
      listItem.textContent = `${freeSpace.start} - ${freeSpace.end}`;
      freeSpacesList.appendChild(listItem);
    });
    freeSpacesContainer.appendChild(freeSpacesList);
  }
}

// Toggles the visibility of free spaces
function toggleFreeSpacesDisplay() {
  const freeSpacesContainer = document.getElementById('free-spaces-container');
  const toggleButton = document.getElementById('toggleFreeSpaces');

  isFreeSpacesVisible = !isFreeSpacesVisible;

  if (isFreeSpacesVisible) {
    displayFreeSpaces(freeSpacesData);
    freeSpacesContainer.style.display = 'block';
    toggleButton.textContent = 'Hide Free Spaces';
  } else {
    freeSpacesContainer.style.display = 'none';
    toggleButton.textContent = 'Show Free Spaces';
  }
}

document.getElementById('toggleFreeSpaces').addEventListener('click', toggleFreeSpacesDisplay);

const createOrJoinGroupBtn = document.getElementById('createOrJoinGroup');
const getActivitySuggestionsBtn = document.getElementById('getActivitySuggestions');

// Event listener for creating or joining a group
createOrJoinGroupBtn.addEventListener('click', () => {
  const confirmed = confirm('Do you want to create or join a group?');
  if (confirmed) {
    window.location.href = 'groups.html';
  }
});

// Event listener for getting activity suggestions
getActivitySuggestionsBtn.addEventListener('click', () => {
  if (!freeSpacesCalculated) {
    alert('Please calculate your free spaces first before getting activity suggestions.');
  } else {
    const currentUsername = getUserUsername();
    getActivitySuggestions(currentUsername);
  }
});

// Fetches activity suggestions from the server
async function fetchActivitySuggestions(username) {
  try {
    const response = await fetch('http://localhost:3000/users/Suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch activity suggestions');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching activity suggestions:', error);
    throw error;
  }
}

// Gets activity suggestions
function getActivitySuggestions(username) {
  fetchActivitySuggestions(username)
    .then(response => {
      const { suggestions } = response;
      allSuggestions = suggestions;
      currentSuggestionIndex = 0;
      updateSuggestions();
    })
    .catch(error => {
      console.error('Error getting activity suggestions:', error);
    });
}

// Updates the displayed suggestions
function updateSuggestions() {
  const suggestionsContainer = document.getElementById('suggestionsContainer');
  suggestionsContainer.innerHTML = '';

  const suggestionsToShow = allSuggestions.slice(0, currentSuggestionIndex + suggestionsPerBatch);
  suggestionsToShow.forEach((suggestion) => {
    const suggestionElement = document.createElement('div');
    suggestionElement.classList.add('suggestion-item');
    suggestionElement.innerHTML = `
      <p>${suggestion.suggestion}, Start: ${suggestion.start}, End: ${suggestion.end}</p>
      <button class="add-event-button">Add Event</button>
    `;
    suggestionElement.querySelector('.add-event-button').addEventListener('click', () => {
      addEvent(suggestion);
    });
    suggestionsContainer.appendChild(suggestionElement);
  });

  if (currentSuggestionIndex + suggestionsPerBatch < allSuggestions.length) {
    const displayMoreButton = document.createElement('button');
    displayMoreButton.textContent = 'Display More';
    displayMoreButton.addEventListener('click', () => {
      currentSuggestionIndex += suggestionsPerBatch;
      updateSuggestions();
    });
    suggestionsContainer.appendChild(displayMoreButton);
  }

  if (currentSuggestionIndex > 0) {
    const displayLessButton = document.createElement('button');
    displayLessButton.textContent = 'Display Less';
    displayLessButton.addEventListener('click', () => {
      currentSuggestionIndex = Math.max(0, currentSuggestionIndex - suggestionsPerBatch);
      updateSuggestions();
    });
    suggestionsContainer.appendChild(displayLessButton);
  }
}

// Adds an event to the user's calendar
async function addEvent(suggestion) {
  const username = getUserUsername();
  try {
    if (
      typeof suggestion.start !== 'string' ||
      typeof suggestion.end !== 'string' ||
      !suggestion.end.trim()
    ) {
      throw new Error('Invalid start or end time');
    }

    const response = await fetch('http://localhost:3000/users/AddEvent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        event: suggestion
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to add event');
    }
    const result = await response.json();
    alert(`Event added: ${suggestion.suggestion}, Start: ${suggestion.start}, End: ${suggestion.end}`);
  } catch (error) {
    console.error('Error adding event:', error);
    alert('Failed to add event');
  }
}

// Gets the current user's username from the URL
function getUserUsername() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('username');
}
