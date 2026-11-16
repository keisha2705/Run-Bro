
import Phaser from "phaser";

// ==========================================
// GAME SETTINGS
// ==========================================

const config = {
    type: Phaser.AUTO,
    width: 900,
    height: 500,
    parent: "game",
    backgroundColor: "#0b1117",

    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 1000 },
            debug: false,
        },
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },

    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};

// ==========================================
// GAME OBJECTS
// ==========================================

let player;
let ground;
let zombie;
let zombieLabel;
let cursors;

let obstacles;
let boosts;

let scoreText;
let highScoreText;
let boostText;
let livesText;

let pauseOverlay;
let pauseButton;
let resumeText;

// ==========================================
// GAME VALUES
// ==========================================

let score = 0;
let highScore = 0;

let gameOver = false;
let isPaused = false;

let obstacleTimer = 0;
let boostSpawnTimer = 0;

let isBoostActive = false;
let boostTimer = 0;

const groundY = 420;
const startingSpeed = 450;
let normalSpeed = startingSpeed;

const lateGameSpeed = 550;
const boostedSpeed = 700;
const boostDuration = 15000;

let gameTime = 0;
let zombieBumps = 0;

// Life system
let lives = 3;

let lifeSlowTimer = 0;
let isLifeSlow = false;

const lifeSlowDuration = 3000;
const lifeSlowMultiplier = 0.65;

const highScoreKey = "runBroHighScore";

// ==========================================
// CREATE THE GAME
// ==========================================

new Phaser.Game(config);

// ==========================================
// LOAD GAME ASSETS
// ==========================================

function preload() {
    this.load.spritesheet("player", "/assets/player-run.png", {
        frameWidth: 543,
        frameHeight: 724,
    });

    this.load.spritesheet("zombie", "/assets/zombie-run.png", {
        frameWidth: 169,
        frameHeight: 184,
        spacing: 0,
        margin: 0,
    });

    this.load.image("forest-background", "/assets/forest-background.png");
    this.load.image("zombie-obstacle", "/assets/spikes.png");
    this.load.image("zombie-land", "/assets/zombie-land.png");
}

// ==========================================
// CREATE FUNCTION
// Runs once when the game starts
// ==========================================

function create() {

    // Reset game values
    score = 0;
    gameOver = false;
    isPaused = false;

    obstacleTimer = 0;
    boostSpawnTimer = 0;
    gameTime = 0;

    zombieBumps = 0;
    lives = 3;

    isBoostActive = false;
    boostTimer = 0;

    isLifeSlow = false;
    lifeSlowTimer = 0;

    normalSpeed = startingSpeed;

    // Load saved high score
    highScore = Number(localStorage.getItem(highScoreKey)) || 0;

    // ======================================
    // GROUND
    // ======================================

    this.add.image(450, 250, "forest-background")
        .setDisplaySize(900, 500)
        .setDepth(-10);

    this.add.rectangle(450, 250, 900, 500, 0x000000, 0.18)
        .setDepth(-9);

    ground = this.add.rectangle(
        450, 440, 900, 70, 0x555555
    );
    ground.setDepth(0);

    this.physics.add.existing(ground, true);

    this.add.image(450, 425, "zombie-land")
        .setDisplaySize(900, 110)
        .setDepth(-1);

    // ======================================
    // PLAYER
    // ======================================

    player = this.physics.add.sprite(
        150, 384, "player"
    );

    player.setScale(0.1);
    player.setDepth(10);

    // Adjust collision area
    player.body.setSize(360, 600);
    player.body.setOffset(90, 80);

    player.setCollideWorldBounds(true);

    // Running animation
    this.anims.create({
        key: "run",
        frames: this.anims.generateFrameNumbers("player", {
            start: 0,
            end: 3,
        }),
        frameRate: 10,
        repeat: -1,
    });

    player.play("run");

    this.physics.add.collider(player, ground);

    // ======================================
    // ZOMBIE
    // ======================================

    zombie = this.physics.add.sprite(90, 385, "zombie");
    zombie.setScale(0.52);
    zombie.setOrigin(0.5, 1);
    zombie.setVisible(true);
    zombie.setDepth(8);
    zombie.body.setAllowGravity(false);
    zombie.body.setImmovable(true);
    zombie.body.setSize(130, 180);
    zombie.body.setOffset(20, 10);

    this.anims.create({
        key: "zombie-walk",
        frames: this.anims.generateFrameNumbers("zombie", {
            start: 0,
            end: 7,
        }),
        frameRate: 8,
        repeat: -1,
    });

    zombie.play("zombie-walk");

    zombieLabel = this.add.text(0, 340, "", {
        fontSize: "16px",
        color: "#ffffff",
    });

    zombieLabel.setVisible(false);

    // ======================================
    // GROUPS
    // ======================================

    obstacles = this.physics.add.group();
    boosts = this.physics.add.group();

    // Detect collisions
    this.physics.add.overlap(
        player, obstacles, hitObstacle, null, this
    );

    this.physics.add.overlap(
        player, boosts, collectBoost, null, this
    );

    // ======================================
    // KEYBOARD CONTROLS
    // ======================================

    cursors = this.input.keyboard.createCursorKeys();

    // ======================================
    // MOBILE CONTROLS
    // ======================================

    this.input.on("pointerdown", (pointer, currentlyOver) => {

        if (currentlyOver && currentlyOver.length > 0) {
            return;
        }

        if (
            !gameOver &&
            !isPaused &&
            player.body.touching.down
        ) {
            player.body.setVelocityY(-500);
        }
    });

    // ======================================
    // GAME TITLE
    // ======================================

    this.add.text(20, 12, "RUN BRO", {
        fontSize: "38px",
        color: "#ffffff",
        fontStyle: "bold",
    }).setShadow(2, 2, "#000000", 4);

    // ======================================
    // SCORE
    // ======================================

    scoreText = this.add.text(20, 70, "Score: 0", {
        fontSize: "18px",
        color: "#ffffff",
    }).setShadow(2, 2, "#000000", 4);

    // ======================================
    // HIGH SCORE
    // ======================================

    highScoreText = this.add.text(
        20, 96, `Best: ${highScore}`, {
            fontSize: "16px",
            color: "#ffff00",
        }
    ).setShadow(2, 2, "#000000", 4);

    // ======================================
    // LIVES DISPLAY
    // ======================================

    livesText = this.add.text(
        20, 120, "LIVES: ♥ ♥ ♥", {
            fontSize: "18px",
            color: "#A8C77A",
            fontStyle: "bold",
        }
    ).setShadow(2, 2, "#000000", 4);

    // ======================================
    // BOOST STATUS
    // ======================================

    boostText = this.add.text(
        500, 22, "BOOST: READY", {
            fontSize: "18px",
            color: "#ffd60a",
        }
    ).setShadow(2, 2, "#000000", 4);

    // ======================================
    // PAUSE BUTTON
    // ======================================

    pauseButton = this.add.text(
        720, 18, "PAUSE", {
            fontSize: "18px",
            color: "#ffffff",
            backgroundColor: "#444444",
            padding: { x: 12, y: 6 },
        }
    );

    pauseButton.setInteractive({ useHandCursor: true });
    pauseButton.setDepth(10);

    // ======================================
    // PAUSE SCREEN
    // ======================================

    const pauseBackground = this.add.rectangle(
        0, 0, 400, 220, 0x000000, 0.9
    );

    const pauseTitle = this.add.text(
        0, -50, "GAME PAUSED", {
            fontSize: "30px",
            color: "#ffffff",
            fontStyle: "bold",
        }
    ).setOrigin(0.5);

    resumeText = this.add.text(
        0, 35, "RESUME", {
            fontSize: "24px",
            color: "#A8C77A",
            backgroundColor: "#333333",
            padding: { x: 15, y: 8 },
        }
    ).setOrigin(0.5);

    resumeText.setInteractive({ useHandCursor: true });

    pauseOverlay = this.add.container(450, 250, [
        pauseBackground,
        pauseTitle,
        resumeText,
    ]);

    pauseOverlay.setDepth(1000);
    pauseOverlay.setVisible(false);

    // Pause button interaction
    pauseButton.on("pointerdown", () => {
        togglePause.call(this);
    });

    // Resume button interaction
    resumeText.on("pointerdown", () => {
        togglePause.call(this);
    });

    // ESC keyboard shortcut
    this.input.keyboard.on("keydown-ESC", () => {
        togglePause.call(this);
    });

    // ======================================
    // INSTRUCTIONS
    // ======================================

    this.add.text(300, 20, "Press SPACE or UP to jump", {
        fontSize: "16px",
        color: "#ffffff",
    });
}

// ==========================================
// UPDATE FUNCTION
// Runs repeatedly while the game is playing
// ==========================================

function update(time, delta) {

    // Stop game logic when paused or game over
    if (gameOver || isPaused) {
        return;
    }

    // ======================================
    // TEMPORARY SLOWDOWN AFTER LOSING A LIFE
    // ======================================

    if (isLifeSlow) {

        lifeSlowTimer -= delta;

        if (lifeSlowTimer <= 0) {

            isLifeSlow = false;
            lifeSlowTimer = 0;

            // Restore the correct world speed
            setWorldSpeed(getCurrentSpeed());
        }
    }

    // ======================================
    // TRACK SURVIVAL TIME
    // ======================================

    gameTime += delta;

    // Increase speed after 20 seconds
    if (gameTime >= 20000 && normalSpeed !== lateGameSpeed) {

        normalSpeed = lateGameSpeed;

        if (!isBoostActive) {
            setWorldSpeed(getCurrentSpeed());
        }
    }

    // ======================================
    // KEYBOARD JUMP
    // ======================================

    if (
        Phaser.Input.Keyboard.JustDown(cursors.space) ||
        Phaser.Input.Keyboard.JustDown(cursors.up)
    ) {

        if (player.body.blocked.down || player.body.touching.down || player.y >= 390) {
            player.body.setVelocityY(-500);
        }
    }

    // ======================================
    // SPAWN OBSTACLES
    // ======================================

    obstacleTimer += delta;

    if (obstacleTimer >= 1500) {

        spawnObstacle(this);

        obstacleTimer = 0;
    }

    // ======================================
    // SPAWN SPEED BOOSTS
    // ======================================

    boostSpawnTimer += delta;

    if (
        boostSpawnTimer >= 8000 &&
        boosts.countActive(true) === 0
    ) {

        spawnBoost(this);

        boostSpawnTimer = 0;
    }

    // ======================================
    // BOOST COUNTDOWN
    // ======================================

    if (isBoostActive) {

        boostTimer -= delta;

        boostText.setText(
            `BOOST: ${(boostTimer / 1000).toFixed(1)}s`
        );

        if (boostTimer <= 0) {

            isBoostActive = false;
            boostTimer = 0;

            setWorldSpeed(getCurrentSpeed());

            player.clearTint();

            boostText.setText("BOOST: READY");
        }
    }

    // ======================================
    // REMOVE OBSTACLES
    // ======================================

    obstacles.getChildren().forEach((obstacle) => {

        if (obstacle.x < -50) {

            score += isBoostActive ? 20 : 10;

            scoreText.setText(`Score: ${score}`);

            obstacle.destroy();
        }
    });

    // ======================================
    // REMOVE MISSED BOOSTS
    // ======================================

    boosts.getChildren().forEach((boost) => {

        if (boost.x < -50) {
            boost.destroy();
        }
    });

    // ======================================
    // KEEP ZOMBIE CHASING BEHIND PLAYER
    // ======================================

    zombie.x = Phaser.Math.Linear(zombie.x, player.x - 120, 0.05);
    zombie.y = 385;

    zombieLabel.setPosition(zombie.x - 25, 340);
}

// ==========================================
// CREATE AN OBSTACLE
// ==========================================

function spawnObstacle(scene) {

    const obstacle = scene.add.image(950, 410, "zombie-obstacle");
    obstacle.setDisplaySize(90, 70);
    obstacle.setOrigin(0.5, 1);

    scene.physics.add.existing(obstacle);

    obstacles.add(obstacle);

    obstacle.body.setAllowGravity(false);
    obstacle.body.setImmovable(true);
    obstacle.body.setSize(70, 45);
    obstacle.body.setVelocityX(-getCurrentSpeed());
}

// ==========================================
// CREATE SPEED BOOST COLLECTIBLE
// ==========================================

function spawnBoost(scene) {

    const boost = scene.add.star(
        950, 300, 5, 12, 24, 0xffd60a
    );

    scene.physics.add.existing(boost);

    boosts.add(boost);

    boost.body.setAllowGravity(false);
    boost.body.setImmovable(true);

    boost.body.setVelocityX(-getCurrentSpeed());
}

// ==========================================
// COLLECT SPEED BOOST
// ==========================================

function collectBoost(playerObject, boost) {

    boost.destroy();

    isBoostActive = true;
    boostTimer = boostDuration;

    setWorldSpeed(getCurrentSpeed());

    player.setTint(0x00d4ff);

    boostText.setText(
        `BOOST: ${(boostDuration / 1000).toFixed(1)}s`
    );
}

// ==========================================
// GET CURRENT WORLD SPEED
// ==========================================

function getCurrentSpeed() {

    let speed = isBoostActive ? boostedSpeed : normalSpeed;

    // Apply slowdown after losing a life
    if (isLifeSlow) {
        speed *= lifeSlowMultiplier;
    }

    return speed;
}

// ==========================================
// CHANGE SPEED OF EXISTING OBJECTS
// ==========================================

function setWorldSpeed(speed) {

    obstacles.getChildren().forEach((obstacle) => {
        obstacle.body.setVelocityX(-speed);
    });

    boosts.getChildren().forEach((boost) => {
        boost.body.setVelocityX(-speed);
    });
}

// ==========================================
// PLAYER HITS AN OBSTACLE
// ==========================================

function hitObstacle(playerObject, obstacle) {

    // Prevent collisions when the game is stopped
    if (gameOver || isPaused) {
        return;
    }

    obstacle.destroy();

    zombieBumps++;

    // Show zombie after the first mistake
    zombie.setVisible(true);
    zombieLabel.setVisible(true);

    if (zombieBumps === 1) {

        zombie.x = 20;

    } else if (zombieBumps === 2) {

        zombie.x = 80;

    } else if (zombieBumps >= 3) {

        // If the player is on the last heart, the zombie catches them
        if (lives <= 1) {
            zombie.x = player.x - 30;
            zombie.y = player.y + 10;
            endGame.call(this);
            return;
        }

        // Player loses one life
        lives--;

        // Update hearts display
        const hearts =
            "♥ ".repeat(lives) + "♡ ".repeat(3 - lives);

        livesText.setText(`LIVES: ${hearts.trim()}`);

        // Reset collision counter for the next life
        zombieBumps = 0;

        // Move zombie back
        zombie.x = 20;

        // Slow the world after losing a life
        isLifeSlow = true;
        lifeSlowTimer = lifeSlowDuration;

        setWorldSpeed(getCurrentSpeed());
    }

    zombieLabel.setPosition(zombie.x - 25, 340);
}

// ==========================================
// END THE GAME
// ==========================================

function endGame() {

    gameOver = true;

    // Save a new high score
    if (score > highScore) {

        highScore = score;

        localStorage.setItem(highScoreKey, highScore);

        highScoreText.setText(`Best: ${highScore}`);
    }

    // Stop the player
    player.body.setVelocity(0, 0);
    player.body.setAllowGravity(false);
    player.anims.stop();

    // Stop obstacles
    obstacles.getChildren().forEach((obstacle) => {
        obstacle.body.setVelocityX(0);
    });

    // Stop boosts
    boosts.getChildren().forEach((boost) => {
        boost.body.setVelocityX(0);
    });

    // ======================================
    // GAME OVER BACKGROUND
    // ======================================

    this.add.rectangle(
        450, 250, 900, 500, 0x000000, 0.65
    ).setDepth(100);

    // ======================================
    // GAME OVER PANEL
    // ======================================

    const panel = this.add.rectangle(
        450, 250, 470, 310, 0x263D2B
    );

    panel.setStrokeStyle(3, 0x647A43);
    panel.setDepth(101);

    // ======================================
    // GAME TITLE
    // ======================================

    this.add.text(450, 125, "RUN BRO", {
        fontSize: "20px",
        color: "#A8C77A",
        fontStyle: "bold",
    }).setOrigin(0.5).setDepth(102);

    // ======================================
    // GAME OVER HEADING
    // ======================================

    this.add.text(450, 165, "GAME OVER", {
        fontSize: "36px",
        color: "#702D3A",
        fontStyle: "bold",
    }).setOrigin(0.5).setDepth(102);

    // ======================================
    // ZOMBIE MESSAGE
    // ======================================

    this.add.text(450, 205, "The zombie finally caught you!", {
        fontSize: "17px",
        color: "#FFFFFF",
    }).setOrigin(0.5).setDepth(102);

    // ======================================
    // FINAL SCORE
    // ======================================

    this.add.text(450, 250, `FINAL SCORE: ${score}`, {
        fontSize: "23px",
        color: "#FFFFFF",
        fontStyle: "bold",
    }).setOrigin(0.5).setDepth(102);

    // ======================================
    // BEST SCORE
    // ======================================

    this.add.text(450, 285, `BEST SCORE: ${highScore}`, {
        fontSize: "19px",
        color: "#A8C77A",
    }).setOrigin(0.5).setDepth(102);

    // ======================================
    // RESTART BUTTON
    // ======================================

    const restartText = this.add.text(
        450, 350, "PLAY AGAIN", {
            fontSize: "23px",
            color: "#FFFFFF",
            backgroundColor: "#647A43",
            padding: { x: 25, y: 12 },
            fontStyle: "bold",
        }
    );

    restartText.setOrigin(0.5);

    restartText.setDepth(103);

    restartText.setInteractive({ useHandCursor: true });

    // Button hover effect
    restartText.on("pointerover", () => {
        restartText.setAlpha(0.7);
    });

    restartText.on("pointerout", () => {
        restartText.setAlpha(1);
    });

    // Restart game
    restartText.on("pointerdown", () => {
        this.scene.restart();
    });
}

// ==========================================
// PAUSE AND RESUME THE GAME
// ==========================================

function togglePause() {

    // Don't allow pausing after game over
    if (gameOver) {
        return;
    }

    isPaused = !isPaused;

    if (isPaused) {

        // Pause physics and player animation
        this.physics.world.pause();

        player.anims.pause();

        pauseOverlay.setVisible(true);

        pauseButton.setText("RESUME");

    } else {

        // Resume physics and player animation
        this.physics.world.resume();

        player.anims.resume();

        pauseOverlay.setVisible(false);

        pauseButton.setText("PAUSE");
    }
}
  