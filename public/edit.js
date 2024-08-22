// edit.js

let compoundsData = []; // Global array to store compounds data
let methodsData = []; // Global array to store methods data
let panelsData = []; // Global array to store panels data

console.log('edit.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired');
    try {
        console.log('Checking authentication...');
        const response = await fetch('/api/auth-check', {
            method: 'GET',
            credentials: 'include'
        });

        console.log('Auth check response:', response);

        if (!response.ok) {
            throw new Error('Authentication check failed');
        }

        const data = await response.json();
        console.log('Auth check data:', data);

        if (!data.authenticated || data.user.role !== 'admin') {
            console.log('User is not authenticated or not an admin');
            alert('You do not have permission to access this page.');
            window.location.href = 'index.html';
            return;
        }

        console.log('User is authenticated and is an admin');
        initializeEditPage();
    } catch (error) {
        console.error('Error during authentication check:', error);
        alert('An error occurred. Please try again.');
        window.location.href = 'index.html';
    }
});
async function confirmDelete(type) {
    console.log(`Confirming delete for ${type}`);
    let docId;
    let endpoint;

    if (type === 'compound') {
        docId = document.getElementById('select-compound').value;
        endpoint = '/api/compounds';
    } else if (type === 'method') {
        docId = document.getElementById('select-method').value;
        endpoint = '/api/methods';
    } else if (type === 'panel') {
        docId = document.getElementById('select-panel').value;
        endpoint = '/api/panels';
    }

    if (!docId) {
        alert(`Please select a ${type} to delete.`);
        return;
    }

    const confirmed = confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
        const response = await fetch(`${endpoint}/${docId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete ${type}`);
        }

        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
        if (type === 'compound') {
            loadCompounds();
        } else if (type === 'method') {
            loadMethods();
        } else if (type === 'panel') {
            loadPanels();
        }
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        alert(`Error deleting ${type}. Please try again.`);
    }
}

// Make the function globally accessible
window.confirmDelete = confirmDelete;

function initializeEditPage() {
    console.log('Initializing edit page');
    loadCompounds();
    loadMethods();
    loadPanels();

    console.log('Initializing Select2');
    $('select').select2({
        width: '100%'
    });

    console.log('Setting up default tab');
    document.getElementById("Compounds").style.display = "block";
    document.querySelector('.tablink').classList.add('active');

    console.log('Adding event listeners to tab buttons');
    document.querySelectorAll('.tablink').forEach(button => {
        button.addEventListener('click', (event) => openTab(event, event.target.textContent));
    });

    console.log('Adding event listeners to forms');
    document.getElementById('compound-form').addEventListener('submit', handleCompoundSubmit);
    document.getElementById('method-form').addEventListener('submit', handleMethodSubmit);
    document.getElementById('panel-form').addEventListener('submit', handlePanelSubmit);
}

async function loadCompounds() {
    console.log('Loading compounds...');
    try {
        const response = await fetch('/api/compounds', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch compounds');
        compoundsData = await response.json(); // Store data in global variable
        console.log('Compounds data:', compoundsData);

        const selectCompound = document.getElementById('select-compound');
        selectCompound.innerHTML = '<option value="">--Select Compound--</option>';
        compoundsData.forEach((compound) => {
            const option = document.createElement('option');
            option.value = compound.id;
            option.text = compound.name;
            selectCompound.appendChild(option);
        });

        console.log('Compounds loaded successfully');
    } catch (error) {
        console.error('Error loading compounds:', error);
    }
}

async function loadMethods() {
    console.log('Loading methods...');
    try {
        const response = await fetch('/api/methods', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch methods');
        methodsData = await response.json(); // Store data in global variable
        console.log('Methods data:', methodsData);

        const methodsSelect = document.getElementById('methods');
        const selectMethod = document.getElementById('select-method');
        methodsSelect.innerHTML = '';
        selectMethod.innerHTML = '<option value="">--Select Method--</option>';
        methodsData.forEach((method) => {
            const option = document.createElement('option');
            option.value = method.id;
            option.text = `${method.method} - ${method.mediaOption}`;
            methodsSelect.appendChild(option);
            selectMethod.appendChild(option.cloneNode(true));
        });

        console.log('Methods loaded successfully');
    } catch (error) {
        console.error('Error loading methods:', error);
    }
}

async function loadPanels() {
    console.log('Loading panels...');
    try {
        const response = await fetch('/api/panels', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch panels');
        panelsData = await response.json(); // Store data in global variable
        console.log('Panels data:', panelsData);

        const panelSelect = document.getElementById('panel');
        const methodPanelSelect = document.getElementById('method-panel');
        const selectPanel = document.getElementById('select-panel');
        const associatedPanelsSelect = document.getElementById('associated-panels');

        [panelSelect, methodPanelSelect, selectPanel, associatedPanelsSelect].forEach(select => {
            select.innerHTML = '<option value="">--Select Panel--</option>';
        });

        panelsData.forEach((panel) => {
            const option = document.createElement('option');
            option.value = panel.id;
            option.text = panel.name;
            panelSelect.appendChild(option);
            methodPanelSelect.appendChild(option.cloneNode(true));
            selectPanel.appendChild(option.cloneNode(true));
            associatedPanelsSelect.appendChild(option.cloneNode(true));
        });

        console.log('Panels loaded successfully');
    } catch (error) {
        console.error('Error loading panels:', error);
    }
}

function openTab(evt, tabName) {
    console.log(`Opening tab: ${tabName}`);
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    const tablinks = document.getElementsByClassName("tablink");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");
}


async function handleCompoundSubmit(e) {
    e.preventDefault();
    console.log('Handling compound submit');
    const compoundId = document.getElementById('select-compound').value;
    const compoundData = {
        name: document.getElementById('compound-name').value,
        cas: document.getElementById('cas-number').value,
        panel: Array.from(document.getElementById('panel').selectedOptions).map(option => option.value),
        methods: Array.from(document.getElementById('methods').selectedOptions).map(option => option.value)
    };

    try {
        const url = compoundId ? `/api/compounds/${compoundId}` : '/api/compounds';
        const method = compoundId ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(compoundData),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to save compound');
        }

        alert(compoundId ? 'Compound updated successfully!' : 'Compound added successfully!');
        loadCompounds(); // Reload compounds list after saving
    } catch (error) {
        console.error('Error saving compound:', error);
        alert('Error saving compound. Please try again.');
    }
}

async function handleMethodSubmit(e) {
    e.preventDefault();
    console.log('Handling method submit');
    const methodId = document.getElementById('select-method').value;
    const methodData = {
        method: document.getElementById('method').value,
        reportingLimit: document.getElementById('reporting-limit').value,
        analyticalTechnique: document.getElementById('analytical-technique').value,
        mediaOption: document.getElementById('media-option').value,
        singleAnalyte: document.getElementById('single-analyte').value,
        additionalAnalyte: document.getElementById('additional-analyte').value,
        panelCost: document.getElementById('panel-cost').value,
        standardTAT: document.getElementById('standard-tat').value,
        flowRate: document.getElementById('flow-rate').value,
        samplingCriteria: document.getElementById('sampling-criteria').value,
        shipping: document.getElementById('shipping').value,
        stability: document.getElementById('stability').value,
        alsStoragePolicy: document.getElementById('als-storage-policy').value,
        pricingNotes: document.getElementById('pricing-notes').value,
        notes: document.getElementById('notes').value,
        aihaAccredited: document.getElementById('aiha-accredited').value,
        threeSampleMinimum: document.getElementById('three-sample-minimum').value,
        panel: Array.from(document.getElementById('method-panel').selectedOptions).map(option => option.value)
    };

    try {
        const url = methodId ? `/api/methods/${methodId}` : '/api/methods';
        const method = methodId ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(methodData),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to save method');
        }

        alert(methodId ? 'Method updated successfully!' : 'Method added successfully!');
        loadMethods(); // Reload methods list after saving
    } catch (error) {
        console.error('Error saving method:', error);
        alert('Error saving method. Please try again.');
    }
}


async function handlePanelSubmit(e) {
    e.preventDefault();
    console.log('Handling panel submit');
    const panelId = document.getElementById('select-panel').value;
    const panelData = {
        name: document.getElementById('panel-name').value,
        associatedPanels: Array.from(document.getElementById('associated-panels').selectedOptions).map(option => option.value)
    };

    try {
        const url = panelId ? `/api/panels/${panelId}` : '/api/panels';
        const method = panelId ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(panelData),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to save panel');
        }

        alert(panelId ? 'Panel updated successfully!' : 'Panel added successfully!');
        loadPanels(); // Reload panels list after saving
    } catch (error) {
        console.error('Error saving panel:', error);
        alert('Error saving panel. Please try again.');
    }
}





// Make functions globally available
window.loadCompound = function(id) {
    console.log(`Loading compound with ID: ${id}`);
    if (!id) {
        console.log('No compound selected');
        return;
    }
    const compound = compoundsData.find(c => c.id === id);
    console.log('Compound found:', compound);

    if (!compound) {
        console.error(`Compound with ID ${id} not found`);
        return;
    }

    // Populate the form fields with the compound data
    document.getElementById('compound-name').value = compound.name || '';
    document.getElementById('cas-number').value = compound.cas || '';

    // Update panels and methods
    const panelSelect = document.getElementById('panel');
    Array.from(panelSelect.options).forEach(option => {
        option.selected = compound.panel && compound.panel.includes(option.value);
    });
    $(panelSelect).trigger('change');

    const methodsSelect = document.getElementById('methods');
    Array.from(methodsSelect.options).forEach(option => {
        option.selected = compound.methods && compound.methods.includes(option.value);
    });
    $(methodsSelect).trigger('change');

    console.log('Form fields updated');
};

window.loadMethod = async function(id) {
    console.log(`Loading method: ${id}`);
    try {
        const method = methodsData.find(m => m.id === id); // Use preloaded methods data
        console.log('Method found:', method);

        if (!method) {
            console.error(`Method with ID ${id} not found`);
            return;
        }

        document.getElementById('method').value = method.method || '';
        document.getElementById('reporting-limit').value = method.reportingLimit || '';
        document.getElementById('analytical-technique').value = method.analyticalTechnique || '';
        document.getElementById('media-option').value = method.mediaOption || '';
        document.getElementById('single-analyte').value = method.singleAnalyte || '';
        document.getElementById('additional-analyte').value = method.additionalAnalyte || '';
        document.getElementById('panel-cost').value = method.panelCost || '';
        document.getElementById('standard-tat').value = method.standardTAT || '';
        document.getElementById('flow-rate').value = method.flowRate || '';
        document.getElementById('sampling-criteria').value = method.samplingCriteria || '';
        document.getElementById('shipping').value = method.shipping || '';
        document.getElementById('stability').value = method.stability || '';
        document.getElementById('als-storage-policy').value = method.alsStoragePolicy || '';
        document.getElementById('pricing-notes').value = method.pricingNotes || '';
        document.getElementById('notes').value = method.notes || '';
        document.getElementById('aiha-accredited').value = method.aihaAccredited || '';
        document.getElementById('three-sample-minimum').value = method.threeSampleMinimum || '';

        // Set selected panels
        const methodPanelSelect = document.getElementById('method-panel');
        Array.from(methodPanelSelect.options).forEach(option => {
            option.selected = method.panel && method.panel.includes(option.value);
        });
        $(methodPanelSelect).trigger('change');
    } catch (error) {
        console.error('Error loading method:', error);
        alert('Error loading method. Please try again.');
    }
};

window.loadPanel = function(id) {
    console.log(`Loading panel with ID: ${id}`);
    const panel = panelsData.find(p => p.id === id);
    console.log('Panel found:', panel);

    if (!panel) {
        console.error(`Panel with ID ${id} not found`);
        return;
    }

    document.getElementById('panel-name').value = panel.name || '';

    // Set selected associated panels
    const associatedPanelsSelect = document.getElementById('associated-panels');
    Array.from(associatedPanelsSelect.options).forEach(option => {
        option.selected = panel.associatedPanels && panel.associatedPanels.includes(option.value);
    });
    $(associatedPanelsSelect).trigger('change');

    console.log('Panel loaded successfully');
};

// Add this function to handle the selection change
function handleSelectionChange(selectElement, loadFunction) {
    const selectedId = selectElement.value;
    if (selectedId) {
        loadFunction(selectedId);
    } else {
        // Clear the form if no item is selected
        clearForm(selectElement.id);
    }
}

// Add this function to clear the form
function clearForm(formType) {
    if (formType === 'select-compound') {
        document.getElementById('compound-name').value = '';
        document.getElementById('cas-number').value = '';
        $('#panel').val(null).trigger('change');
        $('#methods').val(null).trigger('change');
    } else if (formType === 'select-method') {
        // Clear method form fields
        document.getElementById('method').value = '';
        document.getElementById('reporting-limit').value = '';
        document.getElementById('analytical-technique').value = '';
        document.getElementById('media-option').value = '';
        document.getElementById('single-analyte').value = '';
        document.getElementById('additional-analyte').value = '';
        document.getElementById('panel-cost').value = '';
        document.getElementById('standard-tat').value = '';
        document.getElementById('flow-rate').value = '';
        document.getElementById('sampling-criteria').value = '';
        document.getElementById('shipping').value = '';
        document.getElementById('stability').value = '';
        document.getElementById('als-storage-policy').value = '';
        document.getElementById('pricing-notes').value = '';
        document.getElementById('notes').value = '';
        document.getElementById('aiha-accredited').value = '';
        document.getElementById('three-sample-minimum').value = '';
        $('#method-panel').val(null).trigger('change');
    } else if (formType === 'select-panel') {
        // Clear panel form fields
        document.getElementById('panel-name').value = '';
        $('#associated-panels').val(null).trigger('change');
    }
}

console.log('Initialization complete.');

// Event listeners for selection changes
document.getElementById('select-compound').addEventListener('change', function() {
    console.log('Selected compound ID:', this.value);
    window.loadCompound(this.value);
});

document.getElementById('select-method').addEventListener('change', function() {
    handleSelectionChange(this, window.loadMethod);
});

document.getElementById('select-panel').addEventListener('change', function() {
    handleSelectionChange(this, window.loadPanel);
});

// Event listeners for delete buttons
document.getElementById('delete-compound-btn').addEventListener('click', () => confirmDelete('compound'));
document.getElementById('delete-method-btn').addEventListener('click', () => confirmDelete('method'));
document.getElementById('delete-panel-btn').addEventListener('click', () => confirmDelete('panel'));

console.log('edit.js fully loaded and initialized');
