document.getElementById('sign-in-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/sign-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            // Store user role and email in session storage
            sessionStorage.setItem('userRole', result.userRole);
            sessionStorage.setItem('userEmail', result.userEmail);

            // Update the UI or redirect as needed
            alert('Sign in successful! Redirecting to home page...');
            window.location.href = 'index.html';
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error during sign in:', error);
        alert('An error occurred. Please try again later.');
    }
});
