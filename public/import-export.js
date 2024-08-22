// Show/Hide Loading Spinner
function showLoadingSpinner() {
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoadingSpinner() {
  document.getElementById('loading-overlay').style.display = 'none';
}

// Open Tab Function
function openTab(evt, tabName) {
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  const tablinks = document.getElementsByClassName("tablink");
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

// Import Data Function
async function importData() {
  const fileUpload = document.getElementById('file-upload');
  const typeSelect = document.getElementById('type-select');
  const selectedType = typeSelect.value;

  if (fileUpload.files.length === 0) {
    alert('Please select an Excel file to upload.');
    return;
  }

  showLoadingSpinner();

  const formData = new FormData();
  formData.append('file', fileUpload.files[0]);
  formData.append('type', selectedType);

  try {
    const response = await fetch('/api/import-data', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message || 'Import completed!');
    } else {
      throw new Error(result.error || 'Failed to import data.');
    }
  } catch (error) {
    console.error('Error importing data:', error);
    alert('Failed to import data.');
  } finally {
    hideLoadingSpinner();
  }
}

// Export Data Function
async function exportData() {
  const typeSelect = document.getElementById('type-select');
  const selectedType = typeSelect.value;

  showLoadingSpinner();

  try {
    const response = await fetch('/api/export-data', {
      method: 'POST',
      body: JSON.stringify({ type: selectedType }),
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedType}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      const result = await response.json();
      throw new Error(result.error || 'Failed to export data.');
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Failed to export data.');
  } finally {
    hideLoadingSpinner();
  }
}

// Delete All Data Function
async function confirmDeletion(collectionName) {
  if (confirm(`Are you sure you want to delete all records in the ${collectionName} collection? This action cannot be undone.`)) {
    showLoadingSpinner();

    try {
      const response = await fetch('/api/delete-all', {
        method: 'DELETE',
        body: JSON.stringify({ type: collectionName }),
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const result = await response.json();
      if (response.ok) {
        alert(result.message || 'Deletion completed!');
      } else {
        throw new Error(result.error || 'Failed to delete data.');
      }
    } catch (error) {
      console.error(`Error deleting documents from ${collectionName}:`, error);
      alert(`Failed to delete documents from ${collectionName}.`);
    } finally {
      hideLoadingSpinner();
    }
  }
}

document.getElementById('import-button').addEventListener('click', importData);
document.getElementById('export-button').addEventListener('click', exportData);
document.getElementById('delete-all-compounds-button').addEventListener('click', () => confirmDeletion('compounds'));
document.getElementById('delete-all-methods-button').addEventListener('click', () => confirmDeletion('methods'));
document.getElementById('delete-all-panels-button').addEventListener('click', () => confirmDeletion('panel'));

// Make openTab function globally available
window.openTab = openTab;
