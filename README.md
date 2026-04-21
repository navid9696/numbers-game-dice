# 🎲 Numbers Game Dice

Multiplayer web application for interactive conversations based on the popular “Number Game”.

2 Players join a shared room, roll a virtual dice, and answer randomly selected questions — with full control over which topics they want to include or skip.

---

## 🚀 Live Demo

👉 https://numbers-game-dice.vercel.app

## 🖼️ Application Overview  

### Game Screen
<img width="1862" height="1036" alt="image" src="https://github.com/user-attachments/assets/e3029c60-b6f1-46ef-a146-c7663d9b8cc6" />

---

## 🧠 Concept

This project is based on a well-known internet “icebreaker” game where each number corresponds to a question.

Instead of manually choosing numbers, the application:

* generates questions randomly,
* allows users to filter or exclude specific ones,
* synchronizes gameplay between two players in real time.

---

## ⚙️ Features

* Real-time multiplayer rooms (2 players)
* Shared game state between users
* Random question generator (dice system)
* Ability to skip or exclude selected questions
* Custom question input
* Room-based session system (join via code)
* Simple and responsive UI

---

## 🔄 How It Works

1. User creates or joins a room using a room code
2. Second player joins the same room
3. Players roll the dice to draw a question
4. Questions can be answered, skipped, or filtered
5. Game state is synchronized between both players

---

## ⚠️ Content Note

The application includes a wide range of question types, from casual to more personal topics.

Users have full control over the experience:

* questions can be skipped,
* specific ones can be excluded,
* custom questions can be added.

---

## 🧱 Tech Stack

Frontend:

* React
* TypeScript

Backend / Realtime:

* Supabase

---

## 📚 What I Learned

* Implementing real-time communication between users
* Managing shared state in a multiplayer environment
* Designing simple interactive game logic
* Handling user-driven content and filtering

---

## 🛠️ Installation

```bash
git clone https://github.com/navid9696/numbers-game-dice
cd numbers-game-dice
npm install
npm run dev
```

---

## 📌 Project Scope

This is a lightweight experimental project focused on:

* real-time interaction,
* multiplayer synchronization,
* simple game mechanics.

---

## 👤 Author

Created as a side project to explore multiplayer logic and interactive UI.
