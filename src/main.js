import Phaser from "phaser";

// Game settings
const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 500,
  parent: "game",
  backgroundColor: "#252525",

  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1000 },
      debug: false,
    },
  },

  scene: {
     preload:preload,
    create: create,
    update: update
   
  },
};

// Game objects
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

// Game values
let score = 0;
let highScore = 0;
let gameOver = false;

let obstacleTimer = 0;
let boostSpawnTimer = 0;

let isBoostActive = false;
let boostTimer = 0;

const groundY = 420;
let normalSpeed = 450;

const lateGameSpeed = 550;
const boostedSpeed = 700;
const boostDuration = 15000;

let gameTime = 0;
let zombieBumps = 0;

const highScoreKey = "runBroHighScore";

// Create the game
new Phaser.Game(config);

function preload() {
    this.load.spritesheet('player', '/assets/player-run.png', {
        frameWidth: 543,
        frameHeight: 724
    });
}

// Runs once when the game starts
function create() {
  score = 0;
  gameOver = false;
  obstacleTimer = 0;
  boostSpawnTimer = 0;
  gameTime = 0;
  zombieBumps = 0;

  isBoostActive = false;
  boostTimer = 0;

  // Load saved high score
  highScore = Number(localStorage.getItem(highScoreKey)) || 0;

  // Ground
  ground = this.add.rectangle(450, 460, 900, 80, 0x555555);
  this.physics.add.existing(ground, true);

  // Player
  // Create the player sprite
player = this.physics.add.sprite(150, 384, 'player');

// Make the character smaller
player.setScale(0.1);

// Adjust the collision area
player.body.setSize(360, 600);
player.body.setOffset(90, 80);

// Keep the player inside the game
player.setCollideWorldBounds(true);

// Make the player run
this.anims.create({
    key: 'run',
    frames: this.anims.generateFrameNumbers('player', {
        start: 0,
        end: 3
    }),
    frameRate: 10,
    repeat: -1
});

player.play('run');

  player.body.setCollideWorldBounds(true);
  this.physics.add.collider(player, ground);

  // Zombie
 zombie = this.add.rectangle(20, 390, 45, 60, 0x55aa55);
zombie.setVisible(false);

zombieLabel = this.add.text(0, 340, 'ZOMBIE', {
    fontSize: '16px',
    color: '#ffffff'
});

zombieLabel.setVisible(false);
  // Groups
  obstacles = this.physics.add.group();
  boosts = this.physics.add.group();

  // Detect collisions
  this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

  this.physics.add.overlap(player, boosts, collectBoost, null, this);

  // Keyboard controls
  cursors = this.input.keyboard.createCursorKeys();

  // Text on screen
  this.add.text(20, 20, "RUN BRO", {
    fontSize: "28px",
    color: "#ffffff",
    fontStyle: "bold",
  });

  scoreText = this.add.text(20, 60, "Score: 0", {
    fontSize: "20px",
    color: "#ffffff",
  });

  highScoreText = this.add.text(20, 90, `Best: ${highScore}`, {
    fontSize: "18px",
    color: "#ffff00",
  });

  boostText = this.add.text(680, 25, "BOOST: READY", {
    fontSize: "18px",
    color: "#ffd60a",
  });

  this.add.text(300, 20, "Press SPACE or UP to jump", {
    fontSize: "16px",
    color: "#ffffff",
  });
}

// Runs repeatedly while the game is playing
function update(time, delta) {
  if (gameOver) {
    return;
  }

  // Track how long the player has survived
gameTime += delta;

// Increase normal running speed after 20 seconds
if (gameTime >= 20000 && normalSpeed !== lateGameSpeed) {
    normalSpeed = lateGameSpeed;

    // Only change obstacle speed if boost is not active
    if (!isBoostActive) {
        setWorldSpeed(normalSpeed);
    }
}

  // Jump
  if (
    Phaser.Input.Keyboard.JustDown(cursors.space) ||
    Phaser.Input.Keyboard.JustDown(cursors.up)
  ) {
    if (player.body.touching.down) {
      player.body.setVelocityY(-500);
    }
  }

  // Spawn obstacles
  obstacleTimer += delta;

  if (obstacleTimer >= 1500) {
    spawnObstacle(this);
    obstacleTimer = 0;
  }

  // Spawn a boost occasionally
  boostSpawnTimer += delta;

  if (boostSpawnTimer >= 8000 && boosts.countActive(true) === 0) {
    spawnBoost(this);
    boostSpawnTimer = 0;
  }

  // Update the boost countdown
  if (isBoostActive) {
    boostTimer -= delta;

    boostText.setText(`BOOST: ${(boostTimer / 1000).toFixed(1)}s`);

    if (boostTimer <= 0) {
      isBoostActive = false;
      boostTimer = 0;

     setWorldSpeed(normalSpeed);

      player.clearTint();
      boostText.setText("BOOST: READY");
    }
  }

  // Remove obstacles after they leave the screen
  obstacles.getChildren().forEach((obstacle) => {
    if (obstacle.x < -50) {
      score += isBoostActive ? 20 : 10;

      scoreText.setText(`Score: ${score}`);

      obstacle.destroy();
    }
  });

  // Remove boosts that the player misses
  boosts.getChildren().forEach((boost) => {
    if (boost.x < -50) {
      boost.destroy();
    }
  });

  // Keep the zombie label above the zombie
  zombieLabel.setPosition(zombie.x - 25, 340);
}

// Create an obstacle
function spawnObstacle(scene) {
  const obstacle = scene.add.rectangle(950, 400, 40, 40, 0x9933ff);

  scene.physics.add.existing(obstacle);
  obstacles.add(obstacle);

  obstacle.body.setAllowGravity(false);
  obstacle.body.setImmovable(true);
  obstacle.body.setVelocityX(-(isBoostActive ? boostedSpeed : normalSpeed));
}

// Create the speed boost collectible
function spawnBoost(scene) {
  const boost = scene.add.star(950, 320, 5, 12, 24, 0xffd60a);

  scene.physics.add.existing(boost);
  boosts.add(boost);

  boost.body.setAllowGravity(false);
  boost.body.setImmovable(true);
  boost.body.setVelocityX(-normalSpeed);
}

// Collect the speed boost
function collectBoost(playerObject, boost) {
  boost.destroy();

  isBoostActive = true;
  boostTimer = boostDuration;

  setWorldSpeed(boostedSpeed);

  player.setTint(0x00d4ff);

  boostText.setText("BOOST: 5.0s");
}

// Change the speed of existing obstacles
function setWorldSpeed(speed) {

    // Change the speed of all existing obstacles
    obstacles.getChildren().forEach((obstacle) => {
        obstacle.body.setVelocityX(-speed);
    });

    // Change the speed of any existing boost collectibles
    boosts.getChildren().forEach((boost) => {
        boost.body.setVelocityX(-speed);
    });
}

// What happens when the player hits an obstacle
function hitObstacle(playerObject, obstacle) {
    if (gameOver) {
        return;
    }

    // Remove the obstacle
    obstacle.destroy();

    // Count the mistake
    zombieBumps++;

    // Show the zombie after the first mistake
    zombie.setVisible(true);
    zombieLabel.setVisible(true);

    if (zombieBumps === 1) {
        // First mistake: zombie appears in the distance
        zombie.x = 20;

    } else if (zombieBumps === 2) {
        // Second mistake: zombie gets much closer
        zombie.x = 80;

    } else if (zombieBumps >= 3) {
        // Third mistake: the zombie catches the player
        endGame.call(this);
    }

    zombieLabel.setPosition(zombie.x - 25, 340);
}

// End the game
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

  // Stop obstacles
  obstacles.getChildren().forEach((obstacle) => {
    obstacle.body.setVelocityX(0);
  });

  // Stop boosts
  boosts.getChildren().forEach((boost) => {
    boost.body.setVelocityX(0);
  });

  // Game over screen
  this.add.rectangle(450, 250, 400, 220, 0x000000, 0.85);

  this.add.text(330, 170, "THE ZOMBIE GOT YOU!", {
    fontSize: "24px",
    color: "#ff4444",
    fontStyle: "bold",
  });

  this.add.text(390, 215, "GAME OVER", {
    fontSize: "22px",
    color: "#ffffff",
  });

  this.add.text(380, 250, `Score: ${score}`, {
    fontSize: "20px",
    color: "#ffffff",
  });

  const restartText = this.add.text(365, 300, "PLAY AGAIN", {
    fontSize: "24px",
    color: "#ffd60a",
    backgroundColor: "#333333",
    padding: { x: 12, y: 8 },
  });

  restartText.setInteractive({ useHandCursor: true });

  restartText.on("pointerdown", () => {
    this.scene.restart();
  });

  restartText.on("pointerover", () => {
    restartText.setAlpha(0.7);
  });

  restartText.on("pointerout", () => {
    restartText.setAlpha(1);
  });
}
