const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const scoreEl = document.getElementById('score');
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

// Colors (will be updated by CSS vars)
let COLORS = {
    paddle: getComputedStyle(document.documentElement).getPropertyValue('--neon-primary').trim(),
    ball: '#ffffff',
    brick: getComputedStyle(document.documentElement).getPropertyValue('--neon-secondary').trim()
};

// Game State
let gameRunning = false;
let score = 0;
let lives = 3;

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
    dx: 4,
    dy: -4,
    radius: BALL_RADIUS,
    speed: 5
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
    ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -4;
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

                    // Check Win
                    if (score === BRICK_ROW_COUNT * BRICK_COLUMN_COUNT) {
                        gameOver(true);
                    }
                }
            }
        }
    }
}

function update() {
    if (!gameRunning) return;

    // Move Ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall Collision
    if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
    }
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
    } else if (ball.y + ball.dy > canvas.height - ball.radius) {
        // Ball lost
        gameOver(false);
    }

    // Paddle Collision
    if (ball.y + ball.dy > canvas.height - ball.radius - paddle.height - 10) {
        if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
            // Hit paddle
            ball.dy = -ball.dy;
            // Add some English based on where it hit
            const hitPoint = ball.x - (paddle.x + paddle.width / 2);
            ball.dx = hitPoint * 0.15;
        }
    }

    collisionDetection();
}

function gameOver(win) {
    gameRunning = false;
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

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start Game
startBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    gameRunning = true;
    score = 0;
    scoreEl.textContent = '0';
    initBricks();
    resetBall();
});

// Restart Game
restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    gameRunning = true;
    score = 0;
    scoreEl.textContent = '0';
    initBricks();
    resetBall();
});

// Init
resizeCanvas();
loop();
