document.addEventListener('DOMContentLoaded', function() {
    showTab('search');
    document.getElementById('search-input').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    document.querySelector('.search-bar button').addEventListener('click', performSearch);
});

let currentPage = 1; // Start with page 1
let totalPages = 0;  // Total pages will be calculated later
let currentLetter = ''; // Track the current letter

// Show different tabs
function showTab(tabName) {
    document.getElementById('search-tab').style.display = tabName === 'search' ? 'block' : 'none';
    document.getElementById('browse-tab').style.display = tabName === 'browse' ? 'block' : 'none';
    document.getElementById('panel-tab').style.display = tabName === 'panel' ? 'block' : 'none'; // Show panel tab

    if (tabName === 'browse') {
        populateAlphabetGrid();
    } else if (tabName === 'panel') {
        populatePanelGrid(); // Populate panel grid
    }
}

// Perform search on compounds
async function performSearch() {
    try {
        const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
        console.log("Searching for:", searchTerm);

        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ searchTerm })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const searchResults = await response.json();
        console.log("Raw search results:", JSON.stringify(searchResults, null, 2));
        console.log("Number of compounds found:", searchResults.length);

        // Check if methodDetails are present
        const hasMethodDetails = searchResults.some(compound => compound.methodDetails && compound.methodDetails.length > 0);
        console.log("Method details present:", hasMethodDetails);

        displaySearchResults(searchResults);
    } catch (error) {
        console.error("Error performing search:", error);
        handleSearchError(error);
    }
}



// Populate the alphabet grid for browsing compounds
async function populateAlphabetGrid() {
    const alphabetGrid = document.getElementById('alphabet-grid');
    const alphabet = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    alphabetGrid.innerHTML = alphabet.split('').map(letter => `
        <div class="alphabet-item" onclick="viewCompounds('${letter}'); showTab('browse');">
            <span class="alphabet-letter">${letter}</span>
            <span class="view-compounds">VIEW COMPOUNDS</span>
        </div>
    `).join('');
}

// View compounds by the selected letter
async function viewCompounds(letter) {
    console.log(`Starting viewCompounds for letter: ${letter}`);
    try {
        if (typeof letter !== 'string' || letter.length !== 1) {
            throw new Error(`Invalid letter input: ${letter}`);
        }

        showLoadingIcon(true);
        console.log('Loading icon displayed');

        currentLetter = letter;
        console.log(`Current letter set to: ${currentLetter}`);

        console.log('Fetching compounds...');
        const compounds = await fetchCompounds(letter);

        console.log(`Fetched ${compounds.length} compounds:`, compounds.slice(0, 5));

        if (!Array.isArray(compounds)) {
            throw new Error(`Expected array of compounds, but got: ${typeof compounds}`);
        }

        console.log('Displaying compounds...');
        displayCompounds(compounds, 1, 'letter');

        const popup = document.getElementById('compound-popup');
        if (popup) {
            popup.style.display = 'block';
            console.log('Compound popup displayed');
        } else {
            console.warn('compound-popup element not found');
        }

        console.log('Switching to browse tab...');
        showTab('browse');

        console.log('viewCompounds completed successfully');
    } catch (error) {
        console.error("Error in viewCompounds:", error);
        console.log('Current state:', {
            currentLetter,
            isLoadingIconVisible: document.getElementById('loading-overlay').style.display !== 'none',
            compoundPopupExists: !!document.getElementById('compound-popup')
        });
        alert(`An error occurred while loading compounds: ${error.message}. Please check the console for more details and try again later.`);
    } finally {
        showLoadingIcon(false);
        console.log('Loading icon hidden');
    }
}


// Fetch compounds by the starting letter
async function fetchCompounds(letter) {
    console.log(`Fetching compounds for letter: ${letter}`);
    try {
        const response = await fetch('/api/compounds-by-letter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ letter })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const compounds = await response.json();
        console.log(`Received ${compounds.length} compounds from server`);
        console.log('Sample compound:', compounds[0]);
        return compounds;
    } catch (error) {
        console.error('Error in fetchCompounds:', error);
        throw error;
    }
}


// Display the search results
function displaySearchResults(results) {
    console.log("Displaying search results. Total results:", results.length);

    const searchResultsContainer = document.getElementById('search-results');
    searchResultsContainer.innerHTML = '';

    if (results.length === 0) {
        searchResultsContainer.innerHTML = '<p>No results found.</p>';
        return;
    }

    results.forEach((compound, index) => {
        console.log(`Processing compound ${index + 1}:`, compound.name);
        console.log("Methods:", compound.methods);

        const compoundDiv = document.createElement('div');
        compoundDiv.className = 'compound-item';
        compoundDiv.innerHTML = `
            <div class="compound-header">
                <span class="compound-name">${compound.name}</span>
                <span class="compound-cas">CAS#: ${compound.cas || 'N/A'}</span>
                <span class="panel">Panel: ${Array.isArray(compound.panel) ? compound.panel.join(', ') : compound.panel || 'N/A'}</span>
                <select class="method-select" onchange="selectMethod(this, ${JSON.stringify(compound).replace(/"/g, '&quot;')})">
                    <option value="">Select Method</option>
                    ${compound.methods && compound.methods.length > 0 ? compound.methods.map(method => 
                        `<option value="${method}">${method}</option>`
                    ).join('') : '<option disabled>No Methods Available</option>'}
                </select>
                <button class="close-button" onclick="closeCompoundDetails(this)" style="display:none;">Close</button>
            </div>
            <div class="compound-details" style="display:none;">
                <table>
                    <tr>
                        <th>Method</th>
                        <th>Details</th>
                        <th>Media Option</th>
                        <th>Instrument</th>
                        <th>Flow Rate (LPM)</th>
                        <th>Sampling Criteria</th>
                        <th>Reporting Limit</th>
                    </tr>
                    <tr class="method-details"></tr>
                </table>
            </div>
        `;
        searchResultsContainer.appendChild(compoundDiv);
    });

    console.log("Finished displaying search results");
}

// Select a method and display its details
function selectMethod(select, compound) {
    console.log('selectMethod called with:', { select, compound });
    try {
        const methodId = select.value;
        console.log('Selected method ID:', methodId);

        const compoundItem = select.closest('.compound-item');
        if (!compoundItem) {
            throw new Error('Could not find parent compound-item');
        }

        const methodDetails = compoundItem.querySelector('.method-details');
        const compoundDetails = compoundItem.querySelector('.compound-details');
        const closeButton = compoundItem.querySelector('.close-button');

        if (!methodDetails || !compoundDetails || !closeButton) {
            throw new Error('Required elements not found in compound-item');
        }

        if (methodId) {
            console.log('Fetching method details for ID:', methodId);
            fetchMethodDetails(methodId)
                .then(selectedMethod => {
                    console.log('Fetched method details:', selectedMethod);
                    if (!selectedMethod) {
                        throw new Error('No method details returned for ID: ' + methodId);
                    }
                    methodDetails.innerHTML = getMethodDetails(selectedMethod, compound);
                    compoundDetails.style.display = 'block';
                    closeButton.style.display = 'inline-block';
                })
                .catch(error => {
                    console.error('Error fetching method details:', error);
                    methodDetails.innerHTML = '<td colspan="7">Failed to load method details. Please try again.</td>';
                    compoundDetails.style.display = 'block';
                });
        } else {
            compoundDetails.style.display = 'none';
            closeButton.style.display = 'none';
        }
    } catch (error) {
        console.error('Error in selectMethod:', error);
        console.log('Select element:', select);
        console.log('Compound data:', compound);
        alert('An error occurred while selecting the method. Please check the console for more details.');
    }
}

function getMethodDetails(method, compound) {
    console.log('Generating method details HTML for:', { method, compound });
    try {
        return `
            <td>${method.method || 'N/A'}</td>
            <td>
                <button class="details-button" onclick="createMethodDetailsPopup('${method.id}', '${method.method}', ${JSON.stringify(compound).replace(/"/g, '&quot;')})">DETAILS</button>
            </td>
            <td>${method.mediaOption || 'N/A'}</td>
            <td>${method.analyticalTechnique || 'N/A'}</td>
            <td>${method.flowRate || 'N/A'}</td>
            <td>${method.samplingCriteria || 'N/A'}</td>
            <td>${method.reportingLimit || 'N/A'}</td>
        `;
    } catch (error) {
        console.error('Error generating method details HTML:', error);
        return '<td colspan="7">Error displaying method details</td>';
    }
}
// Close the details of a compound
function closeCompoundDetails(button) {
    const compoundItem = button.closest('.compound-item');
    const compoundDetails = compoundItem.querySelector('.compound-details');
    const methodSelect = compoundItem.querySelector('.method-select');
    const closeButton = compoundItem.querySelector('.close-button');

    compoundDetails.style.display = 'none';
    methodSelect.value = '';
    closeButton.style.display = 'none';
}

// Populate the panel grid with compounds
async function populatePanelGrid() {
    try {
        const panelGrid = document.getElementById('panel-grid');

        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ searchTerm: '' }) // Empty search term to get all compounds
        });

        const querySnapshot = await response.json();

        const panelMap = new Map();

        querySnapshot.forEach(compoundData => {
            const panels = compoundData.panel || [];
            panels.forEach(panel => {
                if (panel) {
                    if (!panelMap.has(panel)) {
                        panelMap.set(panel, []);
                    }
                    panelMap.get(panel).push(compoundData);
                }
            });
        });

        panelGrid.innerHTML = Array.from(panelMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([panel, compounds]) => `
            <div class="panel-item" onclick="viewCompoundsByPanel('${panel}')">
                <span class="panel-name">${panel}</span>
                <span class="view-compounds">VIEW COMPOUNDS</span>
            </div>
          `).join('');
    } catch (error) {
        console.error("Error populating panel grid:", error);
        alert("An error occurred while loading panels. Please try again later.");
    }
}

// View compounds by panel
async function viewCompoundsByPanel(panel) {
    try {
        showLoadingIcon(true); // Show loading icon
        const compounds = await fetchCompoundsByPanel(panel);
        displayCompounds(compounds, 1, 'panel', panel);
        document.getElementById('compound-popup').style.display = 'block';
    } catch (error) {
        console.error("Error viewing compounds by panel:", error);
        alert("An error occurred while loading compounds. Please try again later.");
    } finally {
        showLoadingIcon(false); // Hide loading icon
    }
}


// Fetch compounds by panel
// Enhanced fetchCompoundsByPanel function
async function fetchCompoundsByPanel(panel) {
  console.log(`Fetching compounds for panel: ${panel}`);
  try {
    const response = await fetch('/api/compounds-by-panel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ panel })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Received ${data.length} compounds from server`);
    return data;
  } catch (error) {
    console.error('Error in fetchCompoundsByPanel:', error);
    throw error; // Re-throw to be caught in viewCompoundsByPanel
  }
}


// Fetch method details for a set of method IDs
async function fetchMethodDetails(methodId) {
    console.log('Fetching method details for ID:', methodId);
    try {
        const response = await fetch('/api/method-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ methodIds: [methodId] })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received method details:', data);

        // Check if data is an array and has at least one element
        if (Array.isArray(data) && data.length > 0) {
            return data[0];
        } else {
            console.error('Unexpected data format:', data);
            throw new Error('Invalid data format received from server');
        }
    } catch (error) {
        console.error('Error fetching method details:', error);
        throw error;
    }
}
// Display compound results based on selected letter or panel
    // Enhanced displayCompounds function
function displayCompounds(compounds, page, viewingType = 'letter', currentPanel = null) {
    console.log(`Displaying compounds. Page: ${page}, Type: ${viewingType}, Panel: ${currentPanel}`);
    console.log(`Total compounds: ${compounds.length}`);
    console.log('First compound:', compounds[0]);

    const compoundsPerPage = 10;
    const startIndex = (page - 1) * compoundsPerPage;
    const endIndex = startIndex + compoundsPerPage;

    currentPage = page;
    totalPages = Math.ceil(compounds.length / compoundsPerPage);

    const compoundList = document.getElementById('compound-list');
    if (!compoundList) {
        console.error('compound-list element not found');
        return;
    }
    compoundList.innerHTML = '';

    if (compounds.length === 0) {
        compoundList.innerHTML = '<p>No compounds found.</p>';
        return;
    }

    const headerTitle = viewingType === 'panel' && currentPanel
        ? `Viewing Panel: ${currentPanel}`
        : `Viewing Compounds Starting with ${currentLetter}`;

    const headerHTML = `
        <div class="compounds-header" style="position: relative;">
            <h2>${headerTitle}</h2>
            ${currentPanel ? `<img src="images/picicon1.png" alt="View Panel Image" onclick="showPanelImage('${currentPanel}')" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; width: 24px; height: 24px;">` : ''}
        </div>
    `;

    compoundList.innerHTML += headerHTML;

    compounds.slice(startIndex, endIndex).forEach((compound, index) => {
        console.log(`Processing compound ${index}:`, compound);
        if (!compound || typeof compound !== 'object') {
            console.error(`Invalid compound data at index ${index}:`, compound);
            return;
        }

        const compoundDiv = document.createElement('div');
        compoundDiv.className = 'compound-item';
        compoundDiv.innerHTML = `
            <div class="compound-header">
                <span class="compound-name">${compound.name || 'N/A'}</span>
                <span class="compound-cas">CAS#: ${compound.cas || 'N/A'}</span>
                <span class="panel">Panel: ${Array.isArray(compound.panel) ? compound.panel.join(', ') : (compound.panel || 'N/A')}</span>
                <select class="method-select" onchange="selectMethod(this, ${JSON.stringify(compound).replace(/"/g, '&quot;')})">
                    <option value="">Select Method</option>
                    ${Array.isArray(compound.methods) ? compound.methods.map(method => 
                        `<option value="${method}">${method || 'N/A'}</option>`
                    ).join('') : '<option disabled>No Methods Available</option>'}
                </select>
                <button class="close-button" onclick="closeCompoundDetails(this)" style="display:none;">Close</button>
            </div>
            <div class="compound-details" style="display:none;">
                <table>
                    <tr>
                        <th>Method</th>
                        <th>Details</th>
                        <th>Media Option</th>
                        <th>Instrument</th>
                        <th>Flow Rate (LPM)</th>
                        <th>Sampling Criteria</th>
                        <th>Reporting Limit</th>
                    </tr>
                    <tr class="method-details"></tr>
                </table>
            </div>
        `;
        compoundList.appendChild(compoundDiv);
    });

    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.innerHTML = `
            <button onclick="changePage('previous')" ${currentPage === 1 ? 'disabled' : ''}>« Previous</button>
            <span>Page ${currentPage} of ${totalPages}</span>
            <button onclick="changePage('next')" ${currentPage === totalPages ? 'disabled' : ''}>Next »</button>
        `;
    } else {
        console.warn('Pagination element not found');
    }

    console.log('Finished displaying compounds');
}

// Change the page for compound results
async function changePage(direction) {
    showLoadingIcon(true); // Show loading icon
    const compounds = await fetchCompounds(currentLetter);

    if (direction === 'next' && currentPage < totalPages) {
        currentPage++;
    } else if (direction === 'previous' && currentPage > 1) {
        currentPage--;
    }

    displayCompounds(compounds, currentPage);
    showLoadingIcon(false); // Hide loading icon
}

// Close the compound popup
function closePopup() {
    document.getElementById('compound-popup').style.display = 'none';
}

// Handle errors during the search process
function handleSearchError(error) {
    let errorMessage = "An error occurred while searching. ";

    if (error.code === 'unavailable') {
        errorMessage += "The service is currently unavailable. Please try again later.";
    } else if (error.code === 'resource-exhausted') {
        errorMessage += "We're experiencing high traffic. Please try again later.";
    } else if (error.message.includes('Failed to fetch')) {
        errorMessage += "There was a problem connecting to the server. Please check your internet connection and try again.";
    } else {
        errorMessage += "Please try again later.";
    }

    alert(errorMessage);
}

// Save notes for a compound
async function saveNotes(compoundName, compoundCAS, methodName) {
    const notesText = document.getElementById('notesTextarea').value.trim();

    const methodDetails = {
        combo: document.querySelector('.method-details-grid .detail-item:nth-child(1) .detail-value')?.innerText || 'N/A',
        // Add other details as needed
    };

    if (notesText) {
        try {
            const response = await fetch('/api/save-notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    compoundName,
                    compoundCAS,
                    methodName,
                    notesText,
                    methodDetails
                })
            });

            const result = await response.json();

            if (result.success) {
                alert(result.message);
                closeNotesPopup();
            } else {
                alert("Failed to save notes. Please try again.");
            }
        } catch (error) {
            console.error("Error saving notes:", error);
            alert("An error occurred while saving notes. Please try again.");
        }
    } else {
        alert("Please enter some notes before saving.");
    }
}

// Open notes popup for a compound and method
function openNotesPopup(compoundName, compoundCAS, methodName) {
    const notesPopupHTML = `
        <div class="popup-overlay" id="notesPopup" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
            <div class="popup-content" style="background-color: white; padding: 20px; border-radius: 5px; max-width: 600px; width: 100%; box-shadow: 0 0 15px rgba(0,0,0,0.2); position: absolute;">
                <h2>Enter Notes for ${compoundName} - ${methodName}</h2>
                <textarea id="notesTextarea" rows="5" style="width: 100%;"></textarea>
                <button onclick="saveNotes('${compoundName}', '${compoundCAS}', '${methodName}')" style="margin-top: 20px;">Save Notes</button>
                <button onclick="closeNotesPopup()" style="margin-top: 20px; margin-left: 10px;">Close</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', notesPopupHTML);
}

// Close the notes popup
function closeNotesPopup() {
    const popup = document.getElementById('notesPopup');
    if (popup) {
        popup.remove();
    }
}

// Create a popup with method details
async function createMethodDetailsPopup(methodId, methodName, compound) {
    try {
        const response = await fetch('/api/method-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ methodIds: [methodId] })
        });

        const methodDetails = await response.json();
        const methodDetail = methodDetails[0];

        const detailsToShow = [
            { label: "Reporting Limit", value: methodDetails.reportingLimit || 'N/A' },
            { label: "Instrument", value: methodDetails.analyticalTechnique || 'N/A' },
            { label: "Sample Media Option", value: methodDetails.mediaOption || 'N/A' },
            { label: "Single Analyte", value: methodDetails.singleAnalyte || 'N/A' },
            { label: "Panel Cost", value: methodDetails.panelCost || 'N/A' },
            { label: "Additional Analyte", value: methodDetails.additionalAnalyte || 'N/A' },
            { label: "Standard TAT", value: methodDetails.standardTAT || 'N/A' },
            { label: "Sampling (liters per minute)", value: methodDetails.flowRate || 'N/A' },
            { label: "Sampling Criteria", value: methodDetails.samplingCriteria || 'N/A' },
            { label: "Three Sample Minimum", value: methodDetails.threeSampleMinimum || 'N/A' },
            { label: "Shipping", value: methodDetails.shipping || 'N/A' },
            { label: "Stability", value: methodDetails.stability || 'N/A' },
            // Add other details as needed
        ];
        const safeDetailsToShow = JSON.stringify(detailsToShow).replace(/"/g, '&quot;');

        const popupHTML = `
            <div class="popup-overlay" id="methodDetailsPopup">
                <div class="popup-content">
                    <div class="popup-header">
                        <h2>${methodName || 'N/A'}</h2>
                        <button class="notes-button" onclick="openNotesPopup('${compound.name}', '${compound.cas}', '${methodName}')">Notes</button>
                        <img src="images/export-icon.png" alt="Export" onclick="copyToClipboard('${methodName}', ${safeDetailsToShow})" style="cursor: pointer; width: 24px; height: 24px;">
                    </div>
                    <div class="compound-info">
                        <strong>Compound:</strong> ${compound.name || 'N/A'}
                        <strong>CAS#:</strong> ${compound.cas || 'N/A'}
                        <strong>Panel:</strong> ${compound.panel || 'N/A'}
                    </div>
                    <div class="method-details-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div class="detail-item">
                            <div class="detail-label">Reporting Limit</div>
                            <div class="detail-value">${methodDetail.reportingLimit || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Instrument</div>
                            <div class="detail-value">${methodDetails.analyticalTechnique || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Sample Media Option</div>
                            <div class="detail-value">${methodDetail.mediaOption || 'N/A'}</div>
                        </div>

                        <div class="detail-item">
                            <div class="detail-label">Single Analyte</div>
                            <div class="detail-value">${methodDetail.singleAnalyte || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Panel Cost</div>
                            <div class="detail-value">${methodDetail.panelCost || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Additional Analyte</div>
                            <div class="detail-value">${methodDetail.additionalAnalyte || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Standard TAT</div>
                            <div class="detail-value">${methodDetail.standardTAT || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Sampling (liters per minute)</div>
                            <div class="detail-value">${methodDetail.flowRate || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Sampling Criteria</div>
                            <div class="detail-value">${methodDetail.samplingCriteria || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Three Sample Minimum</div>
                            <div class="detail-value">${methodDetail.threeSampleMinimum || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Shipping</div>
                            <div class="detail-value">${methodDetail.shipping || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Stability</div>
                            <div class="detail-value">${methodDetail.stability || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">ALS Storage Policy</div>
                            <div class="detail-value">${methodDetail.alsStoragePolicy || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">ALS SOP</div>
                            <div class="detail-value">${methodDetail.alsSOP || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Pricing Notes</div>
                            <div class="detail-value">${methodDetail.pricingNotes || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Notes</div>
                            <div class="detail-value">${methodDetail.notes || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">AIHA Accred.</div>
                            <div class="detail-value">${methodDetail.aihaAccredited || 'N/A'}</div>
                        </div>
                    </div>
                    <button onclick="closeMethodDetailsPopup()" class="close-button" style="margin-top: 20px;">Close</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHTML);

    } catch (error) {
        console.error("Error creating method details popup:", error);
        alert("An error occurred while fetching method details. Please try again later.");
    }
}

// Close the method details popup
function closeMethodDetailsPopup() {
    const popup = document.getElementById('methodDetailsPopup');
    if (popup) {
        popup.remove();
    }
}

// Copy method details to clipboard
function copyToClipboard(methodName) {
    // Initialize the content with the method name
    let content = `${methodName}\n\n`;

    // Select all the detail items in the popup
    const detailItems = document.querySelectorAll('.detail-item');

    // List of labels to exclude
    const excludeLabels = ["ALS Storage Policy", "ALS SOP", "Pricing Notes", "Notes", "AIHA Accred."];

    // Loop through each detail item and add its label and value to the content
    detailItems.forEach(item => {
        const label = item.querySelector('.detail-label').innerText.trim();
        const value = item.querySelector('.detail-value').innerText.trim();

        // Filter out items with value 'N/A' or labels that are in the exclude list
        if (value !== 'N/A' && !excludeLabels.includes(label)) {
            content += `${label}: ${value}\n`;
        }
    });

    console.log('Final content to copy:', content);

    // Use modern clipboard API if available
    if (navigator.clipboard) {
        navigator.clipboard.writeText(content)
            .then(() => {
                alert('Filtered popup details copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy text:', err);
                alert('Failed to copy text. Please try again.');
            });
    } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);

        textarea.select();
        document.execCommand('copy');

        document.body.removeChild(textarea);
        alert('Filtered popup details copied to clipboard!');
    }
}






// Show or hide the loading icon
function showLoadingIcon(isLoading) {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = isLoading ? 'flex' : 'none';
}

// Show an image for a panel
function showPanelImage(panelName) {
    console.log("Panel clicked:", panelName);

    // Remove colons from the panel name
    const sanitizedPanelName = panelName.replace(/:/g, '');

    // Create an overlay for the image
    const overlay = document.createElement('div');
    overlay.id = 'image-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';
    overlay.onclick = function() { document.body.removeChild(overlay); };  // Close the overlay on click

    // Create an image element
    const image = document.createElement('img');
    image.src = `images/${sanitizedPanelName}.png`; // Make sure the image path is correct
    image.alt = `${sanitizedPanelName} Image`;
    image.style.maxWidth = '80%';
    image.style.maxHeight = '80%';
    image.style.border = '2px solid white';
    image.style.boxShadow = '0px 0px 15px rgba(255, 255, 255, 0.8)';

    // Add the image to the overlay
    overlay.appendChild(image);

    // Add the overlay to the body
    document.body.appendChild(overlay);
}

// Make functions available globally
window.showTab = showTab;
window.performSearch = performSearch;
window.selectMethod = selectMethod;
window.closeCompoundDetails = closeCompoundDetails;
window.viewCompounds = viewCompounds;
window.changePage = changePage;
window.closePopup = closePopup;
window.createMethodDetailsPopup = createMethodDetailsPopup;
window.closeMethodDetailsPopup = closeMethodDetailsPopup;
window.openNotesPopup = openNotesPopup;
window.closeNotesPopup = closeNotesPopup;
window.saveNotes = saveNotes;
window.viewCompoundsByPanel = viewCompoundsByPanel;
window.copyToClipboard = copyToClipboard;
window.showPanelImage = showPanelImage;
