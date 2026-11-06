# CampusArena

**A University-Based Social Platform for Activities, Challenges, and Collaboration**

CampusArena is a university-focused web application designed to help students connect through sports, games, study sessions, and other campus activities.

Students can create activity sessions, discover sessions posted by other students, join activities, and build their reputation through reviews and merit points.

The goal is to make university life more interactive by providing students with a dedicated platform to organize activities and connect with people who share similar interests.

---

## 1. Project Overview

CampusArena is being developed as a full-stack web application.

The platform follows a session-based model:

1. Students register using their university email.
2. Students can browse available sessions.
3. Students can create their own sessions.
4. Other students can join sessions.
5. Once a session is completed, participants can review one another.
6. Reviews contribute to user ratings and merit points.

The platform initially targets FAST Islamabad, with the possibility of supporting additional universities in the future.

## 2. Main Features

### User Authentication
- Student registration and login.
- University email verification.
- University selection during registration.
- Initial university option: FAST Islamabad.
- User-specific profiles.

### Session Management
Students can create and participate in different activities.

Supported session categories:

- Futsal
- Cricket
- Basketball
- Tennis
- Table Tennis
- Badminton
- Volleyball
- Cards
- FIFA
- Tekken
- Study Session

Session creation includes relevant information such as:
- Session title and description.
- Activity type.
- Date and time.
- Duration.
- Available participant capacity.
- Participation preferences.

### Audience Preferences

Sessions can have two participation options:

- All
- Girls Only

These options should be presented as selectable buttons rather than conventional dropdown menus.

### Study Sessions

Study sessions have additional fields:

- Work or study description.
- Department.
- Batch.

### Session Countdown

Each session has a countdown mechanism.

- The countdown indicates the remaining session time.
- Once the countdown ends, the session becomes eligible for participant reviews.
- Reviews should not be accessible before the countdown finishes.

For a production-ready implementation, session completion and attendance should also be validated on the backend.

### Reviews and Reputation

After a session, participants can review one another.

The review system includes:
- Star ratings.
- Written feedback.
- User reviews displayed on profiles.
- Merit points earned through platform participation.

The intention is to establish a reputation system that encourages positive participation and responsible behavior.

## 3. Technology Stack

### Frontend
- React.js
- Vite
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js
- REST APIs

### Database
- MongoDB
- MongoDB Atlas

### Development Tools
- Visual Studio Code
- Git
- GitHub
- Nodemon

## 4. Project Structure

The project is organized into separate frontend and backend components.

Expected high-level structure:

```text
CampusArena/
│
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── server/
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── rewardRoutes.js
│   │   └── sessionRoutes.js
│   │
│   ├── models/
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
```

*Note: This is the intended high-level organization. Verify the actual directory structure before assuming every listed file or folder exists.*

## 5. Backend Routes

The backend currently has the following route modules:

| Route module | Responsibility |
|---|---|
| authRoutes.js | Authentication |
| sessionRoutes.js | Session-related operations |
| reviewRoutes.js | Reviews and ratings |
| rewardRoutes.js | Merit points and rewards |

The exact endpoints, request formats, database schemas, and implementation details should be determined by inspecting the existing source code.

Do not assume an endpoint exists just because its route module exists.

## 6. Running the Project Locally

### Backend

Open a terminal in the project root:

```bash
cd server
npm install
npx nodemon server.js
```

The backend uses environment variables stored in a `.env` file.

### Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Vite normally serves the frontend at:

```text
http://localhost:5173
```

The actual URL may differ depending on the Vite configuration and available ports.

## 7. Environment Variables and Security

Sensitive configuration must remain in `.env` files.

Examples of environment variables may include:

- MongoDB connection string.
- Server port.
- Authentication secrets.
- Email service credentials.

Never commit real credentials, API keys, passwords, or database connection strings to GitHub.

The repository should contain `.env.example` with placeholder values when environment documentation is needed.

## 8. Current Development Status

CampusArena is under active development.

Known project progress:

- React + Vite frontend setup.
- Node.js + Express backend setup.
- MongoDB Atlas connection configured and previously confirmed working.
- Backend route modules created for authentication, sessions, reviews, and rewards.
- Git repository preparation underway.
- `.gitignore` created to exclude dependencies, environment files, and build output.

The exact implementation status of individual features must be verified by examining the current codebase.

Do not describe a feature as completed unless its implementation has been verified.

## 9. Development Roadmap

Potential development priorities include:

1. Verify the complete frontend and backend structure.
2. Establish reliable communication between React and Express.
3. Complete authentication and university email verification.
4. Finalize user and profile models.
5. Complete session creation, browsing, joining, and cancellation.
6. Implement session countdown and completion validation.
7. Implement participant reviews and ratings.
8. Implement merit points and reputation.
9. Improve UI responsiveness and user experience.
10. Add validation, authorization, and security checks.
11. Test the complete application.
12. Deploy the application.

Prioritize unfinished foundational features before adding unnecessary complexity.

---

# AI ASSISTANT CONTEXT AND DEVELOPMENT INSTRUCTIONS

This section is intended for AI coding assistants working on CampusArena.

## 10. Understanding the Project

CampusArena is an ongoing development project, not a request to build a new application from scratch.

When assisting with this project:

- Understand the existing implementation before suggesting changes.
- Inspect relevant files before modifying them.
- Preserve the current architecture unless there is a clear reason to change it.
- Maintain consistency with existing naming conventions and coding patterns.
- Avoid replacing working code with completely new implementations.
- Do not assume that the project structure described above is perfectly up to date.

## 11. Coding Guidelines

Follow these principles:

1. Prefer straightforward, readable code.
2. Avoid unnecessary abstractions and overengineering.
3. Explain the logic before presenting complicated implementations.
4. Use beginner-friendly explanations when introducing new concepts.
5. Keep frontend and backend responsibilities separate.
6. Validate important operations on the backend, not just in React.
7. Avoid introducing additional libraries without explaining why they are needed.
8. Do not invent existing functions, APIs, schemas, or file paths.
9. When modifying a file, provide the complete updated code when practical.
10. Explain exactly which file needs to be created or modified.

## 12. How AI Assistants Should Approach Changes

Before implementing a feature:

1. Ask for or inspect the relevant existing files.
2. Understand how the current feature works.
3. Identify the minimum files that need modification.
4. Explain the proposed changes.
5. Implement incrementally.
6. Explain how to test the changes.
7. Identify any new dependencies or environment variables.

Avoid changing unrelated parts of the application.

If an error occurs, diagnose the actual error before recommending a rewrite.

## 13. Important Functional Requirements

The following requirements should remain consistent throughout development:

- Users should register using university email addresses.
- The initial university option is FAST Islamabad.
- Session categories should follow the established activity list.
- Audience selection should use buttons.
- Study sessions require work description, department, and batch.
- Reviews should only become available after the session countdown ends.
- Reviews and ratings should be associated with the relevant users and sessions.
- Merit points should be handled consistently by the backend.
- Sensitive information must never be exposed in frontend code or GitHub.

## 14. Instructions for Future AI Sessions

When continuing development:

**First:** Understand the existing project files and implementation.

**Second:** Ask only for the specific missing files or information required.

**Third:** Continue from the current development stage rather than starting over.

**Fourth:** Make small, testable changes and explain how to run them.

**Fifth:** Keep this README updated when the architecture, technology stack, or major functionality changes.

---

## Project Vision

CampusArena aims to become a central digital space for university students to organize activities, discover communities, collaborate academically, and build meaningful campus connections.

**Build connections. Create sessions. Compete. Collaborate.**