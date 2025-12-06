# 🎮 Neon Arcade

A neon-styled web game center featuring classic Table Hockey and Brick Breaker games.

![Neon Arcade](https://img.shields.io/badge/Made%20With-HTML%2C%20CSS%2C%20JS-brightgreen)
![Games](https://img.shields.io/badge/Games-2-blue)

## ✨ Features

- 🌈 **Neon Visual Style** - Stunning neon glow effects and dynamic shadows
- 🎨 **Multiple Themes** - 4 switchable color schemes
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🖱️ **Multiple Controls** - Mouse, touch, and keyboard support
- ⏸️ **Pause Function** - Press ESC to pause games
- 🏆 **High Score Tracking** - Automatically saves your best scores

## 🕹️ Games

### 🏒 Table Hockey
- **Objective**: Drag your paddle to hit the puck. First to 7 points wins!
- **Controls**: Mouse drag / Touch swipe
- **Mode**: Single player vs AI

### 🧱 Brick Breaker
- **Objective**: Control the paddle to bounce the ball and destroy all bricks
- **Controls**: 
  - Mouse movement
  - Keyboard `A` / `D` or `←` / `→`
- **Features**: 
  - Ball speed increases over time
  - 3 lives, destroy all bricks to win

## 📁 Project Structure

```
neon-arcade/
├── index.html              # Main menu page
├── README.md               # Project documentation
├── css/
│   └── style.css           # Shared styles
├── games/
│   ├── hockey.html         # Hockey game page
│   └── brick_breaker.html  # Brick Breaker game page
└── js/
    ├── hockey.js           # Hockey game logic
    └── brick_breaker.js    # Brick Breaker game logic
```

## 🚀 Quick Start

1. Download or clone this repository
2. Open `index.html` in your browser
3. Select a game and start playing!

> 💡 No server or installation required - just open and play.

## 🎨 Theme Colors

Switch between 4 color schemes at the bottom of the main menu:

| Theme | Primary | Secondary |
|-------|---------|-----------|
| Cyan-Pink | Cyan | Pink |
| Green-Purple | Green | Purple |
| Orange-Blue | Orange | Blue |
| Red-Yellow | Red | Yellow |

Your theme selection is automatically saved for your next visit.

## 🛠️ Technical Details

- **Pure Frontend** - HTML5 Canvas + Vanilla JavaScript
- **Delta Time Game Loop** - Consistent game speed across devices
- **CSS Variables** - Dynamic theme switching
- **LocalStorage** - Saves themes and high scores
- **Responsive Canvas** - Auto-adapts to window size

## 📄 License

MIT License - Free to use and modify!
