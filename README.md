# WeHacU Backend – System Architecture

This backend powers **WeHacU**, an AI-driven applicant tracking system designed to help recruiters filter, verify, and manage candidates more efficiently. Built with **Node.js**, **Express.js**, and **MongoDB**, it also integrates with the **Gmail API**, **Google Calendar**, and **OpenAI** to enhance candidate screening and communication.

---

## 🧠 Key Features

- **Resume Parsing & Storage**: Extracts structured data from uploaded PDFs.
- **Semantic Filtering**: Uses LLMs to match candidates with job criteria.
- **Verification Workflow**: Sends CAPTCHA-protected forms to candidates for identity confirmation.
- **Smart Scheduling**: Books interviews directly via Google Calendar API.
- **Integrated Messaging**: Sends and reads candidate emails using Gmail API.
- **Session-Based Access**: Secures endpoints for authenticated recruiter users.

---

## 📦 Project Layers

The architecture follows a layered MVC-style structure for separation of concerns:

- **Routes**: Define API endpoints and connect to controllers.
- **Controllers**: Handle request/response logic and validate input.
- **Services**: Contain business logic like filtering, form handling, and API communication.
- **Models**: Define MongoDB schemas for jobs, applicants, users, etc.
- **Middleware**: Includes session validation, authentication, and error handling.
- **Utils**: Helper functions for tokens, emails, formatting, and others.

---

## 🔗 External Integrations

- **Google OAuth2** – For recruiter authentication
- **Gmail API** – Reading/sending candidate emails
- **Google Calendar API** – Scheduling interviews with candidates
- **OpenAI API** – Semantic matching of resumes to job descriptions
- **Google Forms + reCAPTCHA** – Candidate verification workflow

---

## 🛠️ Environment Setup

1. **Install dependencies**  
   `npm install`

2. **Configure environment**  
   Add keys and secrets to `.env`, including Mongo URI, Gmail API, and OpenAI keys. (Example Below)

3. **Run the server**  
   `npm run dev` (starts on port 8080 by default)

---

## 🧪 API Capabilities (High-Level)

- **Authentication**
  - Recruiter login via OAuth

- **Job Management**
  - Create and fetch job postings

- **Applicant Management**
  - Upload resume and auto-extract details
  - View/filter applicants
  - Send verification forms
  - Mark verified candidates

- **Interview Scheduling**
  - Create/view calendar events for interviews

- **Messaging**
  - Sync Gmail threads
  - Send new emails to candidates

---

## 👥 Team

Developed by:
- Kam Chee Qin  
- Sim En Wei  
- Elaine Chung Hui Lin  
- Michi Chong  

---
# MongoDB connection
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority

# Server port
PORT=8080

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback

# Google reCAPTCHA
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key

