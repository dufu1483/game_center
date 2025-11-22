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
const FRICTION = 0.99;
const PADDLE_MASS = 10;
const PUCK_MASS = 1;

// Colors
const COLORS = {
    board: '#151520',
    lines: '#2a2a35',
    player: '#00f3ff',
    ai: '#ff00ff',
    puck: '#ffffff',
    glow: 'rgba(255, 255, 255, 0.5)'
};

// Game State
let gameRunning = false;
let playerScore = 0;
let aiScore = 0;

// Entities
const puck = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: PUCK_RADIUS,
    speed: 0,
    maxSpeed: 15
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
    speed: 5, // Increased base speed
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

function resolveCollision(puck, paddle) {
    const dx = puck.x - paddle.x;
    const dy = puck.y - paddle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return; // Prevent divide by zero

    // Normal vector (from paddle to puck)
    const nx = dx / distance;
    const ny = dy / distance;

    // Move puck out of collision (position correction)
    const overlap = (puck.radius + paddle.radius) - distance;
    puck.x += nx * overlap;
    puck.y += ny * overlap;

    // Calculate relative velocity
    // Paddle velocity is estimated from this frame's movement
    const paddleVx = paddle.x - paddle.lastX;
    const paddleVy = paddle.y - paddle.lastY;

    const dvx = puck.vx - paddleVx;
    const dvy = puck.vy - paddleVy;

    // Calculate relative velocity in terms of the normal direction
    const velAlongNormal = dvx * nx + dvy * ny;

    // Do not resolve if velocities are separating
    if (velAlongNormal > 0) return;

    // Calculate restitution (bounciness)
    const restitution = 1.2; // Slightly > 1 for energetic hits

    // Calculate impulse scalar
    let j = -(1 + restitution) * velAlongNormal;

    // Apply impulse
    puck.vx += j * nx;
    puck.vy += j * ny;

    // Cap speed
    const currentSpeed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
    if (currentSpeed > puck.maxSpeed) {
        const scale = puck.maxSpeed / currentSpeed;
        puck.vx *= scale;
        puck.vy *= scale;
    }
}

function update() {
    if (!gameRunning) return;

    // Puck Physics
    puck.x += puck.vx;
    puck.y += puck.vy;

    // Friction
    puck.vx *= FRICTION;
    puck.vy *= FRICTION;

    // Wall Collisions
    // Top/Bottom
    if (puck.y - puck.radius < 0) {
        puck.y = puck.radius;
        puck.vy = -puck.vy;
    } else if (puck.y + puck.radius > canvas.height) {
        puck.y = canvas.height - puck.radius;
        puck.vy = -puck.vy;
    }

    // Left/Right (Goal check)
    if (puck.x - puck.radius < 0) {
        if (puck.y > canvas.height / 2 - GOAL_SIZE / 2 && puck.y < canvas.height / 2 + GOAL_SIZE / 2) {
            // AI Scored
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
            // Player Scored
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

    // Paddle Collisions
    if (checkCollision(puck, player)) {
        resolveCollision(puck, player);
    }
    if (checkCollision(puck, ai)) {
        resolveCollision(puck, ai);
    }

    // AI Logic
    // Save last position before moving
    ai.lastX = ai.x;
    ai.lastY = ai.y;

    const aiTargetY = puck.y;
    const aiTargetX = canvas.width * 0.9;
    const dy = aiTargetY - ai.y;

    // Improved AI Movement Logic
    let moveSpeed = ai.speed;

    // If puck is on AI side
    if (puck.x > canvas.width / 2) {
        // Move vertically towards puck
        if (Math.abs(dy) > 5) {
            ai.y += Math.sign(dy) * moveSpeed;
        }

        // Attack logic
        // If puck is in front of AI and close, strike it
        if (puck.x < ai.x && puck.x > canvas.width * 0.6) {
            // Move forward to hit
            ai.x -= moveSpeed * 1.2;
        } else {
            // Retreat to home X
            if (ai.x < aiTargetX) ai.x += moveSpeed;
            if (ai.x > aiTargetX) ai.x -= moveSpeed;
        }
    } else {
        // Puck on player side - track Y but stay defensive
        if (Math.abs(dy) > 10) {
            ai.y += Math.sign(dy) * (moveSpeed * 0.8);
        }

        // Return to home X
        if (ai.x < aiTargetX) ai.x += moveSpeed;
        if (ai.x > aiTargetX) ai.x -= moveSpeed;
    }

    // Constrain AI
    ai.y = Math.max(ai.radius, Math.min(ai.y, canvas.height - ai.radius));
    ai.x = Math.max(canvas.width / 2 + ai.radius, Math.min(ai.x, canvas.width - ai.radius));
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

function loop() {
    update();
    draw();

    // Update last positions for velocity calculation in next frame
    player.lastX = player.x;
    player.lastY = player.y;
    // AI lastX/Y is updated inside update() before it moves

    requestAnimationFrame(loop);
}

// Start Game
startBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    gameRunning = true;
    resetPositions();
});

// Restart Game
restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    playerScore = 0;
    aiScore = 0;
    playerScoreEl.textContent = '0';
    aiScoreEl.textContent = '0';
    gameRunning = true;
    resetPositions();
});

// Init
resetPositions();
loop();
