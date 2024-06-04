document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
      const formData = {
          username: document.getElementById('loginUsername').value,
          password: document.getElementById('loginPassword').value
      };

      const response = await fetch('http://localhost:3000/users/login', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
      });

      if (response.ok) {
          alert('Login successful');
          window.location.href = `includes/HomePage.html?username=${formData.username}`;
      } else {
          const errorData = await response.json();
          alert(`Login failed: ${errorData.error}`);
      }
  } catch (error) {
      console.error('Error logging in:', error);
      alert('Login failed. Please try again later.');
  }
});
  
  document.getElementById('getEventsBtn').addEventListener('click', async () => {
    try {
      const response = await fetch('http://localhost:3000/events/events');
      const eventData = await response.json();
      const eventsList = document.getElementById('eventsList');
      eventsList.innerHTML = ''; // Clear previous events
  
      eventData.events.forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.textContent = `${event.summary} - ${event.start.dateTime}`;
        eventsList.appendChild(eventItem);
      });
  
      // Store events data in hidden input field
      document.getElementById('eventsData').value = JSON.stringify(eventData.events);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  });
  