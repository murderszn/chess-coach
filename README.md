# 🏛️ Sicilian Dragon Chess Coach (GM Julian Vance)

An interactive, Greco-Roman styled Grandmaster Chess Analysis Board paired with an Apple iMessage coach sidebar powered by **Ollama Gemma 4**.

![Colonnade Board UI](public/assets/classical_bg.jpg)

---

## ♟️ Features

- **Fibonacci Golden Ratio Split (61.8% / 38.2%)**:
  - **61.8% Chessboard Main Stage**: Full-scale Chess.com caliber board arena (up to 940px) rendered with Carrara ivory and Verona green marble squares, antique Florentine bronze borders, and gold-leaf bevels.
  - **38.2% Apple iMessage Sidebar**: Seamless conversation with **GM Julian Vance (Magister of the Dragon)** with real-time streaming tokens.
- **Sicilian Dragon Tabiya Presets**:
  - 🐉 **Yugoslav 9.Bc4 Main Line (12.h4)**
  - 💥 **Thematic ...Rxc3 Exchange Sac Setup**
  - 🛡️ **Soltis 12...h5 Variation**
  - ⚡ **9.0-0-0 d5! Central Strike**
  - 🏮 **Chinese Dragon (10...Rb8)**
  - 🗡️ **Levenfish Attack (6.f4)**
  - ♟️ **Classical Dragon (6.Be2)**
- **Interactive Move Navigation**:
  - Legal move destination dots, capture rings, and last-move highlights.
  - Move ribbon navigation (`|<`, `<`, `>`, `>|`, `🔄 Flip`, `⏮️ Reset`, `📋 Copy FEN`).
  - **"💬 Ask Coach Vance"**: 1-click button to send any board position/FEN to Ollama Gemma 4 for tactical master breakdown.
- **Classical Greco-Roman Aesthetics**:
  - Corinthian & Ionic colonnade backdrop with classical statuary and marble lighting.
  - Classical monumental serif typography (**Cinzel** & **Cormorant Garamond**).

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **Ollama** installed with `gemma4`:
  ```bash
  ollama run gemma4
  ```

### 2. Installation
```bash
git clone https://github.com/murderszn/chess-coach.git
cd chess-coach
npm install
```

### 3. Run Locally
```bash
npm start
```
Open **[http://localhost:3030](http://localhost:3030)** in your browser.

---

## 📂 Architecture

- `server.js` - Express backend proxying SSE streaming requests to Ollama API `http://127.0.0.1:11434/api/chat`.
- `public/index.html` - Golden ratio split layout with classical Roman styling.
- `public/style.css` - Custom Greco-Roman design system and Chess.com board styling.
- `public/app.js` - Move validation, game tree navigation, and Ollama streaming iMessage logic.
- `public/pieces.js` - High-definition vector SVG chess piece set.
- `public/vendor/chess.min.js` - Chess engine for legal move validation and FEN/PGN handling.
