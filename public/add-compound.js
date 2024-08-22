    // add-compound.js
    let methods = [];

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const response = await fetch('/api/auth-check', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Authentication check failed');
            }

            const data = await response.json();
            if (!data.authenticated || data.user.role !== 'admin') {
                alert('You do not have permission to access this page.');
                window.location.href = 'index.html';
                return;
            }

            // If we reach here, the user is an admin
            initializeAddCompoundPage();
        } catch (error) {
            console.error('Error during authentication check:', error);
            alert('An error occurred. Please try again.');
            window.location.href = 'index.html';
        }
    });

    function initializeAddCompoundPage() {
        document.getElementById('add-method-form').addEventListener('submit', (e) => {
            e.preventDefault();
            addMethod();
        });

        document.getElementById('add-compound-form').addEventListener('submit', handleAddCompound);
    }

    async function handleAddCompound(e) {
        e.preventDefault();
        const compoundName = document.getElementById('compound-name').value;
        const casNumber = document.getElementById('cas-number').value;
        try {
            const response = await fetch('/api/add-compound', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: compoundName,
                    cas: casNumber,
                    methods: methods
                }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to add compound');
            }

            const result = await response.json();
            alert('Compound added successfully!');
            console.log('Document written with ID: ', result.id);
            document.getElementById('add-compound-form').reset();
            methods = [];
            updateMethodsDropdown();
        } catch (error) {
            console.error('Error adding compound: ', error);
            alert('Error adding compound. Please try again.');
        }
    }

    function addMethod() {
        const method = document.getElementById('method').value;
        const mediaOption = document.getElementById('media-option').value;
        const analyticalTechnique = document.getElementById('analytical-technique').value;
        const flowRate = document.getElementById('flow-rate').value;
        const airVolume = document.getElementById('air-volume').value;
        const reportingLimit = document.getElementById('reporting-limit').value;

        const newMethod = {
            method,
            mediaOption,
            analyticalTechnique,
            flowRate,
            airVolume,
            reportingLimit
        };

        methods.push(newMethod);
        updateMethodsDropdown();
        clearMethodForm();
    }

    function updateMethodsDropdown() {
        const methodsSelect = document.getElementById('methods');
        methodsSelect.innerHTML = '';
        methods.forEach((method, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.text = `${method.method} - ${method.mediaOption}`;
            methodsSelect.appendChild(option);
        });
    }

    function clearMethodForm() {
        document.getElementById('add-method-form').reset();
    }