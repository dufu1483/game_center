const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const playerScoreEl = document.getElementById('playerScore');
const aiScoreEl = document.getElementById('aiScore');
const winnerText = document.getElementById('winnerText');

// Game Constants
const TABLE_WIDTH_RATIO = 0.9; // Canvas width relative to window
const TABLE_HEIGHT_RATIO = 0.6; // Canvas height relative to window
const PUCK_RADIUS = 15;
const PADDLE_RADIUS = 25;
const GOAL_SIZE = 120;
const MAX_SCORE = 7;
const FRICTION_FACTOR = 0.5; // Retains 0.5 speed per second (approx 0.99 per frame at 60fps)
const PADDLE_MASS = 10;
const PUCK_MASS = 1;

// Colors - Dynamic from CSS variables
function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
        board: '#151520',
        lines: '#2a2a35',
        player: style.getPropertyValue('--neon-primary').trim() || '#00f3ff',
        ai: style.getPropertyValue('--neon-secondary').trim() || '#ff00ff',
        puck: '#ffffff',
        glow: 'rgba(255, 255, 255, 0.5)'
    };
}

let COLORS = getThemeColors();

// Game State
let gameRunning = false;
let isPaused = false;
let playerScore = 0;
let aiScore = 0;
let lastTime = 0;

// Entities
const puck = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: PUCK_RADIUS,
    maxSpeed: 1000 // Pixels per second
};

const player = {
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    radius: PADDLE_RADIUS,
    color: COLORS.player,
    isDragging: false
};

const ai = {
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    vx: 0,
    vy: 0,
    radius: PADDLE_RADIUS,
    color: COLORS.ai,
    speed: 350, // Pixels per second
    reactionDelay: 0.1
};

// Resize Canvas
function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth * 0.95, 800);
    canvas.height = Math.min(window.innerHeight * 0.8, 500);

    // Reset positions if game not running
    if (!gameRunning) {
        resetPositions();
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Input Handling
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.clientX || evt.touches[0].clientX;
    const clientY = evt.clientY || evt.touches[0].clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function handleInputMove(x, y) {
    // Constrain player to left half
    const halfWidth = canvas.width / 2;

    let targetX = Math.max(player.radius, Math.min(x, halfWidth - player.radius));
    let targetY = Math.max(player.radius, Math.min(y, canvas.height - player.radius));

    player.x = targetX;
    player.y = targetY;
}

canvas.addEventListener('mousemove', (e) => {
    if (!gameRunning) return;
    const pos = getMousePos(e);
    handleInputMove(pos.x, pos.y);
});

canvas.addEventListener('touchmove', (e) => {
    if (!gameRunning) return;
    e.preventDefault(); // Prevent scrolling
    const pos = getMousePos(e);
    handleInputMove(pos.x, pos.y);
}, { passive: false });

// Game Logic
function resetPositions() {
    puck.x = canvas.width / 2;
    puck.y = canvas.height / 2;
    puck.vx = 0;
    puck.vy = 0;

    player.x = canvas.width * 0.1;
    player.y = canvas.height / 2;
    player.lastX = player.x;
    player.lastY = player.y;

    ai.x = canvas.width * 0.9;
    ai.y = canvas.height / 2;
    ai.lastX = ai.x;
    ai.lastY = ai.y;
}

function checkCollision(c1, c2) {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < c1.radius + c2.radius;
}

// We need to rewrite resolveCollision to accept paddle velocity
function resolveCollisionWithVelocity(puck, paddle, paddleVx, paddleVy) {
    const dx = puck.x - paddle.x;
    const dy = puck.y - paddle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const nx = dx / distance;
    const ny = dy / distance;

    const overlap = (puck.radius + paddle.radius) - distance;
    puck.x += nx * overlap;
    puck.y += ny * overlap;

    const dvx = puck.vx - paddleVx;
    const dvy = puck.vy - paddleVy;

    const velAlongNormal = dvx * nx + dvy * ny;

    if (velAlongNormal > 0) return;

    const restitution = 1.2;
    let j = -(1 + restitution) * velAlongNormal;

    puck.vx += j * nx;
    puck.vy += j * ny;

    // Min speed boost on hit
    const currentSpeed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
    if (currentSpeed < 300) {
        puck.vx += nx * 100;
        puck.vy += ny * 100;
    }

    // Cap speed
    const newSpeed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
    if (newSpeed > puck.maxSpeed) {
        const scale = puck.maxSpeed / newSpeed;
        puck.vx *= scale;
        puck.vy *= scale;
    }
}

function update(dt) {
    if (!gameRunning || isPaused) return;

    // Puck Physics
    puck.x += puck.vx * dt;
    puck.y += puck.vy * dt;

    // Friction (Exponential decay)
    // velocity = velocity * pow(friction, dt)
    const friction = Math.pow(FRICTION_FACTOR, dt);
    puck.vx *= friction;
    puck.vy *= friction;

    // Wall Collisions
    if (puck.y - puck.radius < 0) {
        puck.y = puck.radius;
        puck.vy = -puck.vy;
    } else if (puck.y + puck.radius > canvas.height) {
        puck.y = canvas.height - puck.radius;
        puck.vy = -puck.vy;
    }

    // Goals
    if (puck.x - puck.radius < 0) {
        if (puck.y > canvas.height / 2 - GOAL_SIZE / 2 && puck.y < canvas.height / 2 + GOAL_SIZE / 2) {
            aiScore++;
            aiScoreEl.textContent = aiScore;
            checkWin();
            resetPositions();
            return;
        } else {
            puck.x = puck.radius;
            puck.vx = -puck.vx;
        }
    } else if (puck.x + puck.radius > canvas.width) {
        if (puck.y > canvas.height / 2 - GOAL_SIZE / 2 && puck.y < canvas.height / 2 + GOAL_SIZE / 2) {
            playerScore++;
            playerScoreEl.textContent = playerScore;
            checkWin();
            resetPositions();
            return;
        } else {
            puck.x = canvas.width - puck.radius;
            puck.vx = -puck.vx;
        }
    }

    // Calculate Paddle Velocities (px/s)
    // Avoid dividing by zero if dt is very small
    const safeDt = dt > 0.001 ? dt : 0.016;
    const playerVx = (player.x - player.lastX) / safeDt;
    const playerVy = (player.y - player.lastY) / safeDt;

    const aiVx = (ai.x - ai.lastX) / safeDt;
    const aiVy = (ai.y - ai.lastY) / safeDt;

    // Paddle Collisions
    if (checkCollision(puck, player)) {
        resolveCollisionWithVelocity(puck, player, playerVx, playerVy);
    }
    if (checkCollision(puck, ai)) {
        resolveCollisionWithVelocity(puck, ai, aiVx, aiVy);
    }

    // AI Logic
    ai.lastX = ai.x;
    ai.lastY = ai.y;

    const aiTargetY = puck.y;
    const aiTargetX = canvas.width * 0.9;
    const dy = aiTargetY - ai.y;

    let moveSpeed = ai.speed * dt;

    if (puck.x > canvas.width / 2) {
        if (Math.abs(dy) > 5) {
            ai.y += Math.sign(dy) * Math.min(Math.abs(dy), ai.speed * dt);
        }

        if (puck.x < ai.x && puck.x > canvas.width * 0.6) {
            ai.x -= ai.speed * 1.2 * dt;
        } else {
            if (ai.x < aiTargetX) ai.x += ai.speed * dt;
            if (ai.x > aiTargetX) ai.x -= ai.speed * dt;
        }
    } else {
        if (Math.abs(dy) > 10) {
            ai.y += Math.sign(dy) * Math.min(Math.abs(dy), ai.speed * 0.6 * dt);
        }
        if (ai.x < aiTargetX) ai.x += ai.speed * dt;
        if (ai.x > aiTargetX) ai.x -= ai.speed * dt;
    }

    ai.y = Math.max(ai.radius, Math.min(ai.y, canvas.height - ai.radius));
    ai.x = Math.max(canvas.width / 2 + ai.radius, Math.min(ai.x, canvas.width - ai.radius));

    // Update Player Last Pos
    player.lastX = player.x;
    player.lastY = player.y;
}

function checkWin() {
    if (playerScore >= MAX_SCORE || aiScore >= MAX_SCORE) {
        gameRunning = false;
        winnerText.textContent = playerScore >= MAX_SCORE ? "PLAYER WINS!" : "AI WINS!";
        winnerText.style.color = playerScore >= MAX_SCORE ? COLORS.player : COLORS.ai;
        gameOverScreen.classList.add('active');
    }
}

function draw() {
    // Update colors from CSS vars (in case theme changed)
    COLORS = getThemeColors();

    // Clear
    ctx.fillStyle = COLORS.board;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Center Line
    ctx.beginPath();
    ctx.strokeStyle = COLORS.lines;
    ctx.lineWidth = 4;
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Draw Center Circle
    ctx.beginPath();
    ctx.strokeStyle = COLORS.lines;
    ctx.lineWidth = 4;
    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Goals
    ctx.fillStyle = '#000';
    // Left Goal
    ctx.fillRect(0, canvas.height / 2 - GOAL_SIZE / 2, 5, GOAL_SIZE);
    // Right Goal
    ctx.fillRect(canvas.width - 5, canvas.height / 2 - GOAL_SIZE / 2, 5, GOAL_SIZE);

    // Draw Player
    ctx.beginPath();
    ctx.fillStyle = COLORS.player;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.player;
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw AI
    ctx.beginPath();
    ctx.fillStyle = COLORS.ai;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.ai;
    ctx.arc(ai.x, ai.y, ai.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Puck
    ctx.beginPath();
    ctx.fillStyle = COLORS.puck;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.puck;
    ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000; // Convert to seconds
    lastTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(loop);
}

// Pause functionality
const pauseScreen = document.getElementById('pauseScreen');
const resumeBtn = document.getElementById('resumeBtn');

function togglePause() {
    if (!gameRunning) return;

    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.classList.add('active');
    } else {
        pauseScreen.classList.remove('active');
        lastTime = performance.now();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        togglePause();
    }
});

// Start Game
startBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    gameRunning = true;
    isPaused = false;
    resetPositions();
    lastTime = performance.now(); // Reset lastTime for accurate dt calculation
});

// Restart Game
restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    playerScore = 0;
    aiScore = 0;
    playerScoreEl.textContent = '0';
    aiScoreEl.textContent = '0';
    gameRunning = true;
    isPaused = false;
    resetPositions();
    lastTime = performance.now(); // Reset lastTime for accurate dt calculation
});

// Resume Game
if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
        togglePause();
    });
}

// Init
resetPositions();
requestAnimationFrame(loop);
