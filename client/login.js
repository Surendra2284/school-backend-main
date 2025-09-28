async function login(username, password) {
  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    console.log('Login successful:', data);
    // Handle successful login (e.g., redirect to another page, store user info, etc.)
  } catch (error) {
    console.error('Error:', error);
    // Handle login error (e.g., show error message to user)
  }
}

// Example usage:
// login('studentId123', 'password123');
