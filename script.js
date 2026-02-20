const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const INITIAL_SPEED = 6;
const GAME_SPEED_ACCELERATION = 0.001;
const GROUND_Y = 250;

// Game State
let isPlaying = false;
let gameSpeed = INITIAL_SPEED;
let score = 0;
let highScore = localStorage.getItem('equestrian_high_score') || 0;
let animationId;

// Format Score helper
const formatScore = (s) => String(Math.floor(s)).padStart(5, '0');
highScoreElement.textContent = formatScore(highScore);

// Player (Girl on Horse)
const player = {
    x: 50,
    y: GROUND_Y - 50, // 50 is approximate height
    width: 60,
    height: 50,
    vy: 0,
    isJumping: false,

    // Animation frames for galloping (simple leg switching)
    frame: 0,
    frameCount: 0,

    draw(ctx) {
        // Draw Horse (Fleabitten Grey — near-white with dark flecks)
        ctx.fillStyle = '#eaecef';
        // Body
        ctx.fillRect(this.x + 10, this.y + 20, 40, 20);
        // Head & Neck
        ctx.fillRect(this.x + 40, this.y + 5, 15, 20);
        // Snout (lighter muzzle)
        ctx.fillStyle = '#f2f3f5';
        ctx.fillRect(this.x + 50, this.y + 10, 10, 10);

        // Fleabitten speckles (small dark flecks on light coat)
        ctx.fillStyle = '#a0a7b0';
        ctx.fillRect(this.x + 15, this.y + 23, 2, 2);
        ctx.fillRect(this.x + 25, this.y + 25, 2, 2);
        ctx.fillRect(this.x + 35, this.y + 23, 2, 2);
        ctx.fillRect(this.x + 21, this.y + 31, 2, 2);
        ctx.fillRect(this.x + 41, this.y + 29, 2, 2);
        ctx.fillRect(this.x + 30, this.y + 22, 2, 2);
        ctx.fillRect(this.x + 44, this.y + 10, 2, 2);
        ctx.fillRect(this.x + 48, this.y + 16, 2, 2);

        // Mane & Tail (soft grey)
        ctx.fillStyle = '#b0b5be';
        ctx.fillRect(this.x + 35, this.y + 5, 5, 15); // Mane
        ctx.fillRect(this.x + 5, this.y + 20, 5, 15); // Tail

        // Legs (animation)
        ctx.fillStyle = '#dcdfe3';
        if (this.isJumping) {
            // Legs tucked
            ctx.fillRect(this.x + 15, this.y + 40, 8, 8); // Front
            ctx.fillRect(this.x + 40, this.y + 40, 8, 8); // Back
        } else {
            // Galloping
            if (this.frame === 0) {
                ctx.fillRect(this.x + 10, this.y + 40, 8, 10); // Back outer
                ctx.fillRect(this.x + 20, this.y + 40, 8, 8);  // Back inner
                ctx.fillRect(this.x + 35, this.y + 40, 8, 10); // Front inner
                ctx.fillRect(this.x + 45, this.y + 40, 8, 8);  // Front outer
            } else {
                ctx.fillRect(this.x + 15, this.y + 40, 8, 8);  // Back outer
                ctx.fillRect(this.x + 25, this.y + 40, 8, 10); // Back inner
                ctx.fillRect(this.x + 30, this.y + 40, 8, 8);  // Front inner
                ctx.fillRect(this.x + 40, this.y + 40, 8, 10); // Front outer
            }
        }

        // Draw Rider (Girl)
        // Jacket (Black)
        ctx.fillStyle = '#111827';
        ctx.fillRect(this.x + 20, this.y, 15, 25);
        // Face (lower half of head)
        ctx.fillStyle = '#e8bfa8';
        ctx.fillRect(this.x + 22, this.y - 4, 12, 6);
        // Helmet (Dark Grey, upper half)
        ctx.fillStyle = '#374151';
        ctx.fillRect(this.x + 22, this.y - 10, 12, 7);
        // Breeches (White)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 20, this.y + 18, 10, 12);
        // Boots (Black)
        ctx.fillStyle = '#111827';
        ctx.fillRect(this.x + 23, this.y + 25, 6, 12);

    },

    update() {
        // Easter egg: hover mode
        if (flyMode) {
            const hoverY = GROUND_Y - this.height - 60;
            this.y += (hoverY - this.y) * 0.15;
            this.vy = 0;
            this.isJumping = true;
            return;
        }

        // Apply Gravity
        this.vy += GRAVITY;
        this.y += this.vy;

        // Ground Collision
        if (this.y + this.height >= GROUND_Y) {
            this.y = GROUND_Y - this.height;
            this.vy = 0;
            this.isJumping = false;
        }

        // Animation update
        if (!this.isJumping) {
            this.frameCount++;
            if (this.frameCount > 5) { // Change frame every 5 ticks
                this.frame = this.frame === 0 ? 1 : 0;
                this.frameCount = 0;
            }
        }
    },

    jump() {
        if (!this.isJumping) {
            this.vy = JUMP_FORCE;
            this.isJumping = true;
        }
    }
};

// Obstacles Map
const obstacles = [];

// Show jumping fence color schemes (white + accent, like real competitions)
const JUMP_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#d97706'];

class Obstacle {
    constructor() {
        this.color = JUMP_COLORS[Math.floor(Math.random() * JUMP_COLORS.length)];
        this.variant = Math.floor(Math.random() * 3); // 0=vertical, 1=plank, 2=wall
        this.width = this.variant === 2 ? 28 : 34;
        this.height = Math.random() > 0.5 ? 40 : 55;
        this.x = canvas.width;
        this.y = GROUND_Y - this.height;
    }

    draw(ctx) {
        switch (this.variant) {
            case 0: this.drawVertical(ctx); break;
            case 1: this.drawPlank(ctx); break;
            case 2: this.drawWall(ctx); break;
        }
    }

    // Two white wing standards with colored caps and wide bases
    drawStandards(ctx, leftX, rightX, height) {
        const pw = 4;
        // White posts
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(leftX, GROUND_Y - height, pw, height);
        ctx.fillRect(rightX, GROUND_Y - height, pw, height);
        // Colored caps
        ctx.fillStyle = this.color;
        ctx.fillRect(leftX - 1, GROUND_Y - height - 3, pw + 2, 4);
        ctx.fillRect(rightX - 1, GROUND_Y - height - 3, pw + 2, 4);
        // Wider base feet
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(leftX - 2, GROUND_Y - 5, pw + 4, 5);
        ctx.fillRect(rightX - 2, GROUND_Y - 5, pw + 4, 5);
    }

    // Horizontal pole with alternating white/color stripes
    drawStripedPole(ctx, x, y, width, h) {
        const sw = 5;
        let cx = x;
        let white = true;
        while (cx < x + width) {
            const w = Math.min(sw, x + width - cx);
            ctx.fillStyle = white ? '#ffffff' : this.color;
            ctx.fillRect(cx, y, w, h);
            cx += w;
            white = !white;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(x, y + h - 1, width, 1);
    }

    // Standards + striped horizontal poles
    drawVertical(ctx) {
        const pw = 4;
        const leftX = this.x;
        const rightX = this.x + this.width - pw;
        const poleX = this.x + pw;
        const poleW = this.width - pw * 2;

        this.drawStandards(ctx, leftX, rightX, this.height);
        this.drawStripedPole(ctx, poleX, this.y + 4, poleW, 6);
        if (this.height >= 45) {
            this.drawStripedPole(ctx, poleX, this.y + 18, poleW, 6);
        }
    }

    // Standards + solid colored/white planks
    drawPlank(ctx) {
        const pw = 4;
        const leftX = this.x;
        const rightX = this.x + this.width - pw;
        const plankX = this.x + pw;
        const plankW = this.width - pw * 2;

        this.drawStandards(ctx, leftX, rightX, this.height);

        const plankH = 8;
        const gap = 3;
        let py = this.y + 3;
        let toggle = true;
        while (py + plankH <= this.y + this.height - 2) {
            ctx.fillStyle = toggle ? this.color : '#ffffff';
            ctx.fillRect(plankX, py, plankW, plankH);
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.fillRect(plankX, py + plankH - 1, plankW, 1);
            py += plankH + gap;
            toggle = !toggle;
        }
    }

    // Solid brick wall with colored cap
    drawWall(ctx) {
        // Stone body
        ctx.fillStyle = '#f5f5f4';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // Brick lines
        ctx.fillStyle = '#d6d3d1';
        for (let row = 0; row < this.height; row += 8) {
            const off = (Math.floor(row / 8) % 2) * 8;
            for (let col = off; col < this.width; col += 16) {
                ctx.fillRect(this.x + col, this.y + row, 1, 8);
            }
            if (row > 0) ctx.fillRect(this.x, this.y + row, this.width, 1);
        }
        // Colored cap
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 2, this.y - 3, this.width + 4, 4);
        // White trim
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x - 1, this.y - 1, this.width + 2, 2);
    }

    update() {
        this.x -= gameSpeed;
    }
}

// Background Details (Clouds and Ground)
const environment = {
    groundDots: [],
    clouds: [],
    trees: [],
    fenceOffset: 0,

    init() {
        // Generate initial ground dots
        for (let i = 0; i < 50; i++) {
            this.groundDots.push({
                x: Math.random() * canvas.width,
                y: GROUND_Y + Math.random() * (canvas.height - GROUND_Y),
                size: Math.random() * 2 + 1
            });
        }
        // Generate initial clouds
        for(let i=0; i < 3; i++) {
            this.clouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * 100 + 20,
                width: 40 + Math.random() * 40,
                speed: 0.5 + Math.random() * 1
            });
        }
        // Generate background trees (spaced out)
        for (let i = 0; i < 5; i++) {
            this.trees.push({
                x: i * 200 + Math.random() * 80,
                height: 40 + Math.floor(Math.random() * 25),
                crownW: 20 + Math.floor(Math.random() * 12),
            });
        }
    },

    draw(ctx) {
        // Draw Background Trees (parallax — half fence speed)
        const treeScroll = this.fenceOffset * 0.5;
        const treeWrap = 1000; // total virtual width for wrapping
        this.trees.forEach(tree => {
            const tx = ((tree.x - treeScroll) % treeWrap + treeWrap) % treeWrap - 100;
            const baseY = GROUND_Y; // trunk reaches the ground
            // Trunk
            ctx.fillStyle = '#8b6f4e';
            ctx.fillRect(tx + tree.crownW / 2 - 3, baseY - tree.height + tree.crownW, 6, tree.height - tree.crownW);
            // Crown (layered for a rounder look)
            ctx.fillStyle = '#4a7c3f';
            ctx.fillRect(tx, baseY - tree.height, tree.crownW, tree.crownW);
            ctx.fillStyle = '#5a9a4a';
            ctx.fillRect(tx + 3, baseY - tree.height - 4, tree.crownW - 6, 6);
            ctx.fillRect(tx + 2, baseY - tree.height + 2, tree.crownW - 4, tree.crownW - 4);
        });

        // Draw Wooden Arena Fence (behind the action, along the horizon)
        const fenceY = GROUND_Y - 18;
        const postSpacing = 60;
        const railH = 3;
        const offset = this.fenceOffset % postSpacing;
        for (let i = -postSpacing; i < canvas.width + postSpacing; i += postSpacing) {
            const px = i - offset;
            // Vertical post
            ctx.fillStyle = '#a18262';
            ctx.fillRect(px, fenceY, 4, 20);
            // Post cap
            ctx.fillStyle = '#8b6f4e';
            ctx.fillRect(px - 1, fenceY - 2, 6, 3);
        }
        // Two horizontal rails across the full width
        ctx.fillStyle = '#b8956a';
        ctx.fillRect(0, fenceY + 4, canvas.width, railH);
        ctx.fillRect(0, fenceY + 12, canvas.width, railH);
        // Subtle highlight on top rail
        ctx.fillStyle = '#c9a87c';
        ctx.fillRect(0, fenceY + 4, canvas.width, 1);
        ctx.fillRect(0, fenceY + 12, canvas.width, 1);

        // Draw Sand Ground
        ctx.fillStyle = '#fce7c0';
        ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
        // Draw Ground Line
        ctx.fillStyle = '#292524';
        ctx.fillRect(0, GROUND_Y, canvas.width, 2);

        // Draw Ground Dots (Dirt simulation)
        ctx.fillStyle = '#78716c';
        this.groundDots.forEach(dot => {
            ctx.fillRect(dot.x, dot.y, dot.size, dot.size);
            dot.x -= gameSpeed;
            if (dot.x < 0) dot.x = canvas.width;
        });

        // Draw Clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.clouds.forEach(cloud => {
            // Simple pixel cloud shape
            ctx.fillRect(cloud.x, cloud.y, cloud.width, 15);
            ctx.fillRect(cloud.x + 10, cloud.y - 10, cloud.width - 20, 10);

            cloud.x -= cloud.speed;
            if (cloud.x + cloud.width < 0) {
                cloud.x = canvas.width;
                cloud.y = Math.random() * 100 + 20;
            }
        });

        // Advance fence scroll to match game speed
        this.fenceOffset += gameSpeed;
    }
};

environment.init();

// Easter egg: hold F to fly
let flyMode = false;
window.addEventListener('keydown', (e) => { if (e.code === 'KeyF') flyMode = true; });
window.addEventListener('keyup', (e) => { if (e.code === 'KeyF') flyMode = false; });

// Input Handling
const handleJump = (e) => {
    if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'ArrowUp') return;
    if (!isPlaying) return;

    // Prevent default scrolling for space and up arrow
    if (e.type === 'keydown') {
        e.preventDefault();
    }

    player.jump();
};

window.addEventListener('keydown', handleJump);
window.addEventListener('mousedown', handleJump);
window.addEventListener('touchstart', handleJump, { passive: false });

// Collision Detection
const checkCollision = (rect1, rect2) => {
    // Tighten the collision bounding box for fairer gameplay
    const hitbox1 = {
        x: rect1.x + 10,
        y: rect1.y + 10,
        width: rect1.width - 20,
        height: rect1.height - 10
    };
    const hitbox2 = {
        x: rect2.x,
        y: rect2.y,
        width: rect2.width,
        height: rect2.height
    };

    return hitbox1.x < hitbox2.x + hitbox2.width &&
           hitbox1.x + hitbox1.width > hitbox2.x &&
           hitbox1.y < hitbox2.y + hitbox2.height &&
           hitbox1.y + hitbox1.height > hitbox2.y;
};

// Main Game Loop
let frames = 0;
let spawnTimer = 100;

function gameLoop() {
    if (!isPlaying) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update & Draw Environment
    environment.draw(ctx);

    // Update & Draw Player
    player.update();
    player.draw(ctx);

    // Obstacle Management
    spawnTimer--;
    if (spawnTimer <= 0) {
        obstacles.push(new Obstacle());
        // Randomize next spawn time based on speed
        const minSpawn = Math.max(40, 100 - (gameSpeed * 5));
        const maxSpawn = Math.max(80, 150 - (gameSpeed * 4));
        spawnTimer = Math.random() * (maxSpawn - minSpawn) + minSpawn;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.update();
        obs.draw(ctx);

        // Remove off-screen obstacles
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }

        // Collision Check
        if (checkCollision(player, obs)) {
            endGame();
        }
    }

    // Update Score & Speed
    score += 0.1;
    scoreElement.textContent = formatScore(score);
    gameSpeed += GAME_SPEED_ACCELERATION;

    animationId = requestAnimationFrame(gameLoop);
}

// Game State Management
function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // Reset State
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.isJumping = false;
    obstacles.length = 0;
    score = 0;
    gameSpeed = INITIAL_SPEED;
    spawnTimer = 50; // Initial quick spawn
    isPlaying = true;

    // Start Loop
    gameLoop();
}

function endGame() {
    isPlaying = false;
    cancelAnimationFrame(animationId);

    // Update High Score
    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('equestrian_high_score', highScore);
        highScoreElement.textContent = formatScore(highScore);
    }

    finalScoreElement.textContent = Math.floor(score);
    gameOverScreen.classList.remove('hidden');
}

// Button Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial Render (draw player frozen on start screen)
ctx.clearRect(0, 0, canvas.width, canvas.height);
environment.draw(ctx);
player.draw(ctx);
