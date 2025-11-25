const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseScreen = document.getElementById('pauseScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const resumeBtn = document.getElementById('resumeBtn');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const winnerText = document.getElementById('winnerText');

// Game Constants
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 8;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 50;
const BRICK_OFFSET_LEFT = 35;
const BASE_SPEED = 300; // Pixels per second
const MAX_SPEED = 800;

// Colors (will be updated by CSS vars)
let COLORS = {
    paddle: getComputedStyle(document.documentElement).getPropertyValue('--neon-primary').trim(),
    ball: '#ffffff',
    brick: getComputedStyle(document.documentElement).getPropertyValue('--neon-secondary').trim()
};

// Game State
let gameRunning = false;
let isPaused = false;
let score = 0;
let lives = 3;
let highScore = parseInt(localStorage.getItem('brickBreaker_highScore')) || 0;
let lastTime = 0;

// Entities
const paddle = {
    x: canvas.width / 2 - PADDLE_WIDTH / 2,
    y: canvas.height - 30,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dx: 0
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height - 40,
    dx: 0,
    dy: 0,
    radius: BALL_RADIUS,
    speed: BASE_SPEED
};

const bricks = [];

// Resize Canvas
function resizeCanvas() {
    canvas.width = Math.min(window.innerWidth * 0.95, 800);
    canvas.height = Math.min(window.innerHeight * 0.8, 600);

    paddle.y = canvas.height - 30;
    initBricks();

    if (!gameRunning) {
        resetBall();
    }
}

window.addEventListener('resize', resizeCanvas);

// Init Bricks
function initBricks() {
    bricks.length = 0;
    const brickWidth = (canvas.width - (BRICK_OFFSET_LEFT * 2) - (BRICK_PADDING * (BRICK_COLUMN_COUNT - 1))) / BRICK_COLUMN_COUNT;
    const brickHeight = 20;

    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        bricks[c] = [];
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            bricks[c][r] = {
                x: 0,
                y: 0,
                status: 1,
                width: brickWidth,
                height: brickHeight
            };
        }
    }
}

// Input Handling
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.clientX || evt.touches[0].clientX;
    return clientX - rect.left;
}

function handleInputMove(x) {
    let relativeX = x;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddle.x = relativeX - paddle.width / 2;

        // Constrain
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
    }
}

canvas.addEventListener('mousemove', (e) => {
    if (!gameRunning) return;
    const x = getMousePos(e);
    handleInputMove(x);
});

canvas.addEventListener('touchmove', (e) => {
    if (!gameRunning) return;
    e.preventDefault();
    const x = getMousePos(e);
    handleInputMove(x);
}, { passive: false });

// Game Logic
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 40;
    ball.speed = BASE_SPEED;

    // Randomize start direction slightly
    const angle = (Math.random() * 45 + 45) * (Math.PI / 180); // 45-90 degrees
    const dirX = Math.random() > 0.5 ? 1 : -1;

    // Normalize velocity vector
    // We want initial dy to be negative (up)
    // Let's just set dx/dy based on speed
    // Initial launch: Up and slightly sideways
    ball.dx = ball.speed * Math.cos(angle) * dirX; // ~0.707 * speed
    ball.dy = -ball.speed * Math.sin(angle); // ~0.707 * speed

    paddle.x = canvas.width / 2 - paddle.width / 2;
}

function collisionDetection() {
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (ball.x > b.x && ball.x < b.x + b.width && ball.y > b.y && ball.y < b.y + b.height) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    score++;
                    scoreEl.textContent = score;

                    // Increase Speed
                    increaseSpeed();

                    // Check Win
                    if (score === BRICK_ROW_COUNT * BRICK_COLUMN_COUNT) {
                        gameOver(true);
                    }
                }
            }
        }
    }
}

function increaseSpeed() {
    // Increase speed by 2% per brick, cap at MAX_SPEED
    ball.speed = Math.min(ball.speed * 1.02, MAX_SPEED);

    // Re-normalize velocity vector to new speed
    const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    if (currentSpeed > 0) {
        ball.dx = (ball.dx / currentSpeed) * ball.speed;
        ball.dy = (ball.dy / currentSpeed) * ball.speed;
    }
}

function update(dt) {
    if (!gameRunning || isPaused) return;

    // Move Ball
    ball.x += ball.dx * dt;
    ball.y += ball.dy * dt;

    // Wall Collision
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
        // Push out of wall
        if (ball.x + ball.radius > canvas.width) ball.x = canvas.width - ball.radius;
        if (ball.x - ball.radius < 0) ball.x = ball.radius;
    }

    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
        ball.y = ball.radius;
    } else if (ball.y - ball.radius > canvas.height) {
        // Ball lost - deduct life
        lives--;
        updateLivesDisplay();

        if (lives <= 0) {
            gameOver(false);
        } else {
            resetBall();
        }
        return;
    }

    // Paddle Collision
    // Simple AABB for paddle
    if (ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height &&
        ball.x + ball.radius > paddle.x &&
        ball.x - ball.radius < paddle.x + paddle.width) {

        // Only bounce if moving down
        if (ball.dy > 0) {
            ball.dy = -ball.dy;

            // Add "English" based on hit position
            const hitPoint = ball.x - (paddle.x + paddle.width / 2);
            // Normalize hit point (-1 to 1)
            const normalizedHit = hitPoint / (paddle.width / 2);

            // Adjust dx based on hit point
            // Max angle change ~45 degrees
            const currentSpeed = ball.speed;
            ball.dx = normalizedHit * (currentSpeed * 0.8);

            // Re-normalize to maintain constant speed
            // We want to ensure dy is negative (up)
            // speed^2 = dx^2 + dy^2  =>  dy = -sqrt(speed^2 - dx^2)
            // Clamp dx so we don't get NaN
            if (Math.abs(ball.dx) > currentSpeed * 0.9) {
                ball.dx = Math.sign(ball.dx) * currentSpeed * 0.9;
            }

            ball.dy = -Math.sqrt(currentSpeed * currentSpeed - ball.dx * ball.dx);
        }
    }

    collisionDetection();
}

function gameOver(win) {
    gameRunning = false;

    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('brickBreaker_highScore', highScore);
    }

    winnerText.textContent = win ? "YOU WIN!" : "GAME OVER";
    winnerText.style.color = win ? COLORS.paddle : '#ff0000';
    gameOverScreen.classList.add('active');
}

function draw() {
    // Clear
    ctx.fillStyle = '#151520'; // Board color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update Colors from CSS vars (in case theme changed)
    const style = getComputedStyle(document.documentElement);
    COLORS.paddle = style.getPropertyValue('--neon-primary').trim();
    COLORS.brick = style.getPropertyValue('--neon-secondary').trim();

    // Draw Bricks
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = (c * (bricks[c][r].width + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                const brickY = (r * (bricks[c][r].height + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;

                ctx.beginPath();
                ctx.rect(brickX, brickY, bricks[c][r].width, bricks[c][r].height);
                ctx.fillStyle = COLORS.brick;
                ctx.shadowBlur = 10;
                ctx.shadowColor = COLORS.brick;
                ctx.fill();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
        }
    }

    // Draw Paddle
    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = COLORS.paddle;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.paddle;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;

    // Draw Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ball;
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.ball;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(loop);
}

// Update lives display
function updateLivesDisplay() {
    if (livesEl) {
        livesEl.textContent = '❤️'.repeat(lives);
    }
}

// Toggle Pause
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

// Keyboard Controls
const keys = {
    left: false,
    right: false
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        togglePause();
        return;
    }

    if (!gameRunning || isPaused) return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = false;
    }
});

// Update paddle position based on keyboard
function updatePaddleKeyboard(dt) {
    const PADDLE_SPEED = 500; // pixels per second

    if (keys.left) {
        paddle.x -= PADDLE_SPEED * dt;
        if (paddle.x < 0) paddle.x = 0;
    }
    if (keys.right) {
        paddle.x += PADDLE_SPEED * dt;
        if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
    }
}

// Modify update to include keyboard paddle control
const originalUpdate = update;
update = function (dt) {
    if (gameRunning && !isPaused) {
        updatePaddleKeyboard(dt);
    }
    originalUpdate(dt);
};

// Start Game
startBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    gameRunning = true;
    isPaused = false;
    score = 0;
    lives = 3;
    scoreEl.textContent = '0';
    updateLivesDisplay();
    initBricks();
    resetBall();
    lastTime = performance.now();
});

// Restart Game
restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    gameRunning = true;
    isPaused = false;
    score = 0;
    lives = 3;
    scoreEl.textContent = '0';
    updateLivesDisplay();
    initBricks();
    resetBall();
    lastTime = performance.now();
});

// Resume Game
if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
        togglePause();
    });
}

// Init
resizeCanvas();
updateLivesDisplay();
requestAnimationFrame(loop);
