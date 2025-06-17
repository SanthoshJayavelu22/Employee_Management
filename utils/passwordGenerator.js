const generateCredentials = (name) => {
  // Generate username: firstname.lastname (lowercase, no spaces)
  const username = name.toLowerCase().replace(/\s+/g, '.');
  
  // Generate random 8-character password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return { username, password };
};

module.exports = { generateCredentials };