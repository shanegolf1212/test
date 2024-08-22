// Show/Hide Loading Spinner
function showLoadingSpinner() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoadingSpinner() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// Fetch notes from the backend and display them
async function fetchNotes() {
    try {
        console.log('Fetching notes...');
        showLoadingSpinner();

        const response = await fetch('/api/notes', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch notes: ${response.statusText}`);
        }

        const notes = await response.json();
        console.log('Notes fetched:', notes);

        const notesList = document.getElementById('notesList');
        notesList.innerHTML = ''; // Clear previous notes

        notes.forEach((note) => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';
            noteElement.innerHTML = `
                <h3>${note.compound}</h3>
                <p>Status: <span class="status-label">${note.status || 'undefined'}</span></p>
                <button class="view-button" onclick="viewNoteDetails('${note.id}')">View Details</button>
            `;
            notesList.appendChild(noteElement);
        });

        hideLoadingSpinner();
    } catch (error) {
        console.error('Error fetching notes:', error);
        alert('Error fetching notes. Please try again.');
        hideLoadingSpinner();
    }
}

window.viewNoteDetails = async function(noteId) {
    try {
        const response = await fetch(`/api/notes/${noteId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch note details: ${response.statusText}`);
        }

        const note = await response.json();
        const noteDetails = document.getElementById('noteDetails');
        noteDetails.innerHTML = `
            <h3>${note.compound}</h3>
            <p>Error or Notes: ${note.notes || 'N/A'}</p>
            <p>CAS: ${note.cas || 'N/A'}</p>
            <p>Method: ${note.method || 'N/A'}</p>
            <p>Additional Analyte: ${note.methodDetails.additionalAnalyte || 'N/A'}</p>
            <p>AIHA Accredited: ${note.methodDetails.aihaAccredited || 'N/A'}</p>
            <p>ALS SOP: ${note.methodDetails.alsSOP || 'N/A'}</p>
            <p>ALS Storage Policy: ${note.methodDetails.alsStoragePolicy || 'N/A'}</p>
            <p>Analytical Technique: ${note.methodDetails.analyticalTechnique || 'N/A'}</p>
            <p>Combo: ${note.methodDetails.combo || 'N/A'}</p>
            <p>Flow Rate: ${note.methodDetails.flowRate || 'N/A'}</p>
            <p>Notes: ${note.methodDetails.notes || 'N/A'}</p>
            <p>Panel: ${note.methodDetails.panel || 'N/A'}</p>
            <p>Pricing Notes: ${note.methodDetails.pricingNotes || 'N/A'}</p>
            <p>Reporting Limit: ${note.methodDetails.reportingLimit || 'N/A'}</p>
            <p>Sample Media Option: ${note.methodDetails.sampleMediaOption || 'N/A'}</p>
            <p>Sampling Criteria: ${note.methodDetails.samplingCriteria || 'N/A'}</p>
            <p>Shipping: ${note.methodDetails.shipping || 'N/A'}</p>
            <p>Single Analyte: ${note.methodDetails.singleAnalyte || 'N/A'}</p>
            <p>Stability: ${note.methodDetails.stability || 'N/A'}</p>
            <p>Standard TAT: ${note.methodDetails.standardTAT || 'N/A'}</p>
            <p>Three Sample Minimum: ${note.methodDetails.threeSampleMinimum || 'N/A'}</p>
            <form id="updateNoteForm">
              <div class="form-group">
                <label for="correctiveActions">Corrective Actions:</label>
                <input type="text" id="correctiveActions" value="${note.correctiveActions || ''}">
              </div>
              <div class="form-group">
                <label for="assignedTo">Assigned To:</label>
                <input type="text" id="assignedTo" value="${note.assignedTo || ''}">
              </div>
              <div class="form-group">
                <label for="status">Status:</label>
                <select id="status">
                  <option value="open" ${note.status === 'open' ? 'selected' : ''}>Open</option>
                  <option value="inProgress" ${note.status === 'inProgress' ? 'selected' : ''}>In Progress</option>
                  <option value="closed" ${note.status === 'closed' ? 'selected' : ''}>Closed</option>
                </select>
              </div>
              <button type="submit" class="update-button">Update Note</button>
            </form>
        `;

        document.getElementById('updateNoteForm').onsubmit = (event) => {
            event.preventDefault();
            updateNote(noteId);
        };
    } catch (error) {
        console.error('Error fetching note details:', error);
        alert('Error fetching note details. Please try again.');
    }
};

async function updateNote(noteId) {
    try {
        const correctiveActions = document.getElementById('correctiveActions').value;
        const assignedTo = document.getElementById('assignedTo').value;
        const status = document.getElementById('status').value;

        const response = await fetch(`/api/notes/${noteId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                correctiveActions,
                assignedTo,
                status
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update note: ${response.statusText}`);
        }

        fetchNotes(); // Refresh notes list
        document.getElementById('noteDetails').innerHTML = ''; // Clear details view
    } catch (error) {
        console.error('Error updating note:', error);
        alert('Error updating note. Please try again.');
    }
}

// Function to filter notes based on status
window.filterNotes = function(status) {
    const allTabs = document.querySelectorAll('.tablink');
    allTabs.forEach((tab) => tab.classList.remove('active'));

    event.target.classList.add('active');

    const notes = document.querySelectorAll('.note-item');
    notes.forEach((note) => {
        const statusLabel = note.querySelector('.status-label').innerText.toLowerCase();

        if (statusLabel === status.toLowerCase()) {
            note.style.display = 'block';
        } else {
            note.style.display = 'none';
        }
    });
};

// Call fetchNotes on page load
document.addEventListener('DOMContentLoaded', fetchNotes);
