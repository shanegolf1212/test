// auth-check.js
document.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        signInButton: document.getElementById('sign-in-button'),
        signOutButton: document.getElementById('sign-out-button'),
        registerLink: document.getElementById('register-link'),
        editLink: document.getElementById('edit-link'),
        notesLink: document.getElementById('notes-link'),
        importexportLink: document.getElementById('importexport-link'),
        loadingOverlay: document.getElementById('loading-overlay')
    };

    try {
        const response = await fetch('/api/auth-check', {
            method: 'GET',
            credentials: 'include' // This is important for including cookies
        });

        if (!response.ok) {
            throw new Error('Auth check failed');
        }

        const data = await response.json();

        if (data.authenticated) {
            console.log('User is authenticated:', data.user.email);
            updateUIForSignedInUser(elements, true);
            handleUserData(data.user, elements);
        } else {
            console.log('User is not authenticated');
            updateUIForSignedInUser(elements, false);
            redirectToSignIn();
        }
    } catch (error) {
        console.error('Error during auth check:', error);
        updateUIForSignedInUser(elements, false);
        redirectToSignIn();
    } finally {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.style.display = 'none';
        }
    }
     if (elements.signOutButton) {
            elements.signOutButton.addEventListener('click', handleSignOut);
        }
    });


function updateUIForSignedInUser(elements, isSignedIn) {
    if (elements.signInButton) elements.signInButton.style.display = isSignedIn ? 'none' : 'block';
    if (elements.signOutButton) elements.signOutButton.style.display = isSignedIn ? 'block' : 'none';
}

function handleUserData(user, elements) {
    console.log('User data retrieved:', user);
    sessionStorage.setItem('userRole', user.role);
    sessionStorage.setItem('userEmail', user.email);

    const adminLinks = ['registerLink', 'importexportLink', 'notesLink', 'editLink'];
    adminLinks.forEach(link => {
        if (elements[link] && user.role === 'admin') {
            elements[link].style.display = 'block';
        }
    });

    if (!checkUserRoleAndAccess(user.role)) {
        alert('You do not have permission to access this page.');
        window.location.href = 'index.html';
    }
}
async function handleSignOut() {
    try {
        const response = await fetch('/api/sign-out', {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Sign-out failed');
        }

        // Clear session storage
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userEmail');

        // Redirect to sign-in page
        window.location.href = 'sign-in.html';
    } catch (error) {
        console.error('Error during sign-out:', error);
        
    }
}
function redirectToSignIn() {
    if (!window.location.href.includes('sign-in.html')) {
        window.location.href = 'sign-in.html';
    }
}

function checkUserRoleAndAccess(role) {
    const path = window.location.pathname;
    const adminOnlyPages = ['register.html', 'import-export.html', 'edit.html', 'notes.html'];
    if (adminOnlyPages.some(page => path.includes(page))) {
        return role === 'admin';
    }
    if (path.includes('admin-page.html')) {
        return role === 'admin';
    }
    if (path.includes('editor-page.html')) {
        return ['admin', 'editor'].includes(role);
    }
    return true;
}