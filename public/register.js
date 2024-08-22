document.getElementById('registration-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const title = document.getElementById('title').value.trim();
  const phoneNumber = document.getElementById('phoneNumber').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const role = document.getElementById('role').value;

  if (!fullName || !email || !password) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    console.log('Sending registration request to the backend...');

    const response = await fetch('/api/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName,
        title,
        phoneNumber,
        email,
        password,
        role,
      }),
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Registration result:', result);

    alert('Registration successful!');
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Error during registration:', error);
    alert('Registration failed. Please try again.');
  }
});
