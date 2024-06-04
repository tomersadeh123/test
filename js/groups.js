document.getElementById('createGroupForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const groupName = document.getElementById('groupName').value;
    fetch('http://localhost:3000/groups/groups', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ groupName })
    })
    .then(response => {
        if (response.ok) {
            alert('Group created successfully');
            document.getElementById('createGroupForm').reset();
        } else {
            alert('Failed to create group');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to create group');
    });
});

document.getElementById('addUserForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const groupName = document.getElementById('groupNameAddUser').value;
    const username = document.getElementById('username').value;
    fetch(`http://localhost:3000/groups/groups/${groupName}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
    })
    .then(response => {
        if (response.ok) {
            alert('User added to group successfully');
            document.getElementById('addUserForm').reset();
        } else {
            alert('Failed to add user to group');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to add user to group');
    });
});
$(function(){
    // Init the image gallery
    var $gallery = $(".tm-gallery").isotope({
      itemSelector: ".tm-gallery-item",
      layoutMode: "fitRows"
    });

    // Layout Isotope after each image loads
    $gallery.imagesLoaded().progress(function() {
      $gallery.isotope("layout");
    });

    $(".filters-button-group").on("click", "a", function(e) {
        e.preventDefault();
      var filterValue = $(this).attr("data-filter");
      $gallery.isotope({ filter: filterValue });
      $('.filters-button-group a').removeClass('active');
      $(this).addClass('active');
  });

    // Magnific Pop up
    $('.tm-gallery').magnificPopup({
        delegate: 'a',
        type: 'image',
        gallery: { enabled: true }
  });
});

document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculateBtn');
    const resultContainer = document.getElementById('resultContainer');

    calculateBtn.addEventListener('click', async function() {
        const groupNameInput = document.getElementById('groupNameCommonSlots');
        const groupName = groupNameInput.value.trim();

        if (!groupName) {
            resultContainer.textContent = 'Please enter a group name.';
            return;
        }

        try {
            // Send an AJAX request to the server to fetch group members' schedules
            const response = await fetch(`http://localhost:3000/groups/groups/${groupName}/schedules`);

            if (response.ok) {
                const schedules = await response.json();

                // Find the common free time slots
                const commonSlots = findCommonFreeSlots(schedules);

                // Update the resultContainer with the common free time slots
                resultContainer.innerHTML = '';
                if (commonSlots.length === 0) {
                    resultContainer.textContent = 'No common free time slots found.';
                } else {
                    const slotList = document.createElement('ul');
                    commonSlots.forEach(slot => {
                        const slotItem = document.createElement('li');
                        slotItem.textContent = `${slot.start} - ${slot.end}`;
                        slotList.appendChild(slotItem);
                    });
                    resultContainer.appendChild(slotList);
                }
            } else {
                resultContainer.textContent = `Error: ${response.status} ${response.statusText}`;
            }
        } catch (error) {
            console.error('Error:', error);
            resultContainer.textContent = 'An error occurred while fetching group schedules.';
        }
    });
});

function findCommonFreeSlots(schedules) {
    if (!schedules || schedules.length === 0) return [];

    // Constants for the free time range in minutes (7 AM to 9 PM, GMT+3 time)
    const START_MINUTES = 7 * 60;
    const END_MINUTES = 21 * 60;

    // Convert date strings to minutes from the start of the day in GMT+3 time
    const convertToMinutes = dateStr => {
        const dt = new Date(dateStr);
        const utcHours = dt.getUTCHours();
        const utcMinutes = dt.getUTCMinutes();
        const gmt3Hours = utcHours + 3; // Add 3 hours for GMT+3
        const gmt3Minutes = utcMinutes;
        return gmt3Hours * 60 + gmt3Minutes;
    };

    // Convert minutes from the start of the day to ISO date string in GMT+3 time
    const convertToDateTime = (dayOffset, minutes) => {
        const dt = new Date(Date.UTC(2024, 5, 2 + dayOffset, 0, 0)); // 2024, 5 (June), 2 (starting from June 2)
        const gmt3Hours = Math.floor(minutes / 60);
        const gmt3Minutes = minutes % 60;
        dt.setUTCHours(gmt3Hours, gmt3Minutes);
        return dt.toISOString().slice(0, 16);
    };

    // Filter and normalize free time slots to be within the specified range
    const normalizeSlots = freeTime => freeTime.map(slot => {
        let start = convertToMinutes(slot.start);
        let end = convertToMinutes(slot.end);

        // Adjust to fit within the specified time range
        start = Math.max(start, START_MINUTES);
        end = Math.min(end, END_MINUTES);

        // Ignore slots that don't fit within the range
        return (start < end) ? { start, end, dayOffset: new Date(slot.start).getUTCDate() - 2 } : null;
    }).filter(slot => slot);

    // Convert all free time slots to intervals in minutes
    const intervals = schedules.map(user => normalizeSlots(user.freeTime));

    // Initialize the common slots with the first user's free time
    let commonSlots = intervals[0];

    // Intersect with each user's free time slots
    for (let i = 1; i < intervals.length; i++) {
        const newCommonSlots = [];
        for (const commonSlot of commonSlots) {
            for (const slot of intervals[i]) {
                if (commonSlot.dayOffset === slot.dayOffset) {
                    const start = Math.max(commonSlot.start, slot.start);
                    const end = Math.min(commonSlot.end, slot.end);
                    if (start < end) {
                        newCommonSlots.push({ start, end, dayOffset: commonSlot.dayOffset });
                    }
                }
            }
        }
        commonSlots = newCommonSlots;
    }

    // Convert back to ISO string format
    return commonSlots.map(slot => ({
        start: convertToDateTime(slot.dayOffset, slot.start),
        end: convertToDateTime(slot.dayOffset, slot.end)
    }));
}
