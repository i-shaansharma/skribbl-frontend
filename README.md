# i-Sketch — Real-Time Multiplayer Drawing & Guessing Game

A full-stack multiplayer drawing game inspired by Skribbl.io, built with Next.js, TypeScript, Socket.IO, Node.js, and HTML5 Canvas.

Players can create private rooms, invite friends, draw words in real time, and compete through multiple rounds while the server handles game state, scoring, timers, and turn rotation. The project was built from scratch with a custom game engine and real-time event architecture instead of relying on any game framework.

---

## Live Demo

**Frontend:** https://i-sketch.vercel.app/

**Backend:** https://skribbl-backend-z442.onrender.com/

---

## Features

### Real-Time Multiplayer Gameplay

* Create and join private rooms
* Support for multiple players per lobby
* Live chat-based word guessing
* Automatic round progression
* Real-time score updates

### Drawing System

* HTML5 Canvas based drawing
* Multiple brush colors
* Canvas clearing
* Undo functionality
* Instant drawing synchronization using Socket.IO

### Game Engine

* Turn-based gameplay
* Random word selection
* Timed drawing rounds
* Automatic drawer rotation
* End-game winner detection
* Dynamic scoring based on guess speed

### Room Configuration

Hosts can customize:

* Number of rounds
* Drawing duration
* Maximum players

---

## Technical Highlights

### Real-Time Canvas Synchronization

Instead of sending images across the network, the application streams drawing coordinates and brush metadata. This keeps bandwidth usage low and allows drawings to appear almost instantly for every connected player.

### Server-Authoritative Architecture

The backend acts as the source of truth for:

* Player management
* Turn rotation
* Timer control
* Score calculation
* Round progression
* Game state synchronization

This prevents clients from manipulating game state and keeps all players synchronized throughout a session.

### Custom Object-Oriented Game Engine

The backend is structured around three core classes:

#### SessionEngine

Manages active rooms and game sessions.

#### GameSession

Handles the complete game lifecycle including rounds, timers, scoring, word selection, and turn management.

#### Participant

Represents a connected player and stores information such as score, name, and drawing status.

---

## Tech Stack

| Layer                   | Technology                 |
| ----------------------- | -------------------------- |
| Frontend                | Next.js, React, TypeScript |
| Styling                 | Tailwind CSS               |
| Real-Time Communication | Socket.IO                  |
| Drawing Engine          | HTML5 Canvas               |
| Backend                 | Node.js, Express.js        |
| Deployment              | Vercel, Render             |

---

## Project Structure

### Frontend

```text
i-sketch-frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── styles/
└── public/
```

### Backend

```text
i-sketch-backend/
├── src/
│   ├── coordinators/
│   ├── domain/
│   ├── config/
│   └── main.js
```

---

## Running Locally

### Backend

```bash
cd i-sketch-backend
npm install
node src/main.js
```

Runs on:

```text
http://localhost:4000
```

### Frontend

```bash
cd i-sketch-frontend
npm install
npm run dev
```

Runs on:

```text
http://localhost:3000
```

---

## What I Learned

Building this project gave me hands-on experience with:

* WebSocket-based real-time communication
* Multiplayer game state management
* Event-driven system design
* HTML5 Canvas APIs
* Scalable room/session architecture
* Deploying full-stack applications across multiple services

---

## Author

Ishaan Sharma

Computer Science Undergraduate | Full-Stack Development | Real-Time Systems | AI & Machine Learning
