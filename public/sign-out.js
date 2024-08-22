document.getElementById('sign-out-button').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await authCheck.signOut();
    } catch (error) {
        console.error('Error during sign out:', error);
        
    }
});