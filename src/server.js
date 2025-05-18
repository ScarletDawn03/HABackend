import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

// Set default port to 8080 if not specified in environment variables
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
