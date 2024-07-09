var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};
const game = new Phaser.Game(config);

let leftScore = 0;
let rightScore = 0;
let leftPaddle, rightPaddle, ball;
let cursors;
let ballVelocity = { x: 200, y: 200 };
let leftWall, rightWall;
let leftScoreText, rightScoreText;
let socket;
let restartKey;

function preload() {
    // Load assets if any
}

function create() {
    // Create paddles and ball
    leftPaddle = this.add.rectangle(50, 300, 10, 100, 0xffffff);
    rightPaddle = this.add.rectangle(750, 300, 10, 100, 0xffffff);
    ball = this.add.rectangle(400, 300, 10, 10, 0xffffff);

    // Create walls
    leftWall = this.add.rectangle(10, 300, 5, 600, 0x000000);
    rightWall = this.add.rectangle(790, 300, 5, 600, 0x000000);

    // Create scores
    leftScoreText = this.add.text(250, 16, leftScore, { fontSize: '64px', fill: '#ffffff' });
    rightScoreText = this.add.text(500, 16, rightScore, { fontSize: '64px', fill: '#ffffff' });

    // Create divider
    let divider_count = 0;
    for (let i = 0; i < 30; i++) {
        this.add.rectangle(400, 10 + divider_count, 10, 10, 0xffffff);
        divider_count += 20;
    }

    // Setup physics
    this.physics.add.existing(leftPaddle, false);
    this.physics.add.existing(rightPaddle, false);
    this.physics.add.existing(ball, false);
    this.physics.add.existing(leftWall, true);
    this.physics.add.existing(rightWall, true);

    // Paddles immovable
    leftPaddle.body.setImmovable(true);
    rightPaddle.body.setImmovable(true);

    // Ball dynamics
    ball.body.setVelocity(ballVelocity.x, ballVelocity.y);
    ball.body.setBounce(1, 1);
    ball.body.setCollideWorldBounds(true);

    // Collisions
    this.physics.add.collider(ball, leftPaddle);
    this.physics.add.collider(ball, rightPaddle);
    this.physics.add.collider(ball, leftWall, () => playerScored('right'), null, this);
    this.physics.add.collider(ball, rightWall, () => playerScored('left'), null, this);

    // Input
    cursors = this.input.keyboard.createCursorKeys();
    restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // Socket.io client
    socket = io();

    // Listen to restart game
    socket.on('restart_game_request', (data) =>{
        leftPaddle.setPosition(data.leftX, data.leftY);
        rightPaddle.setPosition(data.rightX, data.rightY);
        ball.setPosition(data.ballX, data.ballY);
        ball.body.setVelocity(data.ballVx, data.ballVy);
        leftScoreText.setText(data.left);
        rightScoreText.setText(data.right);
    });

    // Listen for position updates
    socket.on('update_position', (data) => {
        if (data.paddle === 'left') {
            leftPaddle.y = data.position;
        } else if (data.paddle === 'right') {
            rightPaddle.y = data.position;
        }
    });

    // Listen for score updates
    socket.on('update_score', (scores) => {
        leftScoreText.setText(scores.left);
        rightScoreText.setText(scores.right);
    });

    // Listen for reset ball
    socket.on('reset_ball', (position) => {
        ball.setPosition(position.x, position.y);
        ball.body.setVelocity(position.vx, position.vy);
    });

    // Event listener for Restart Game
    restartKey.on('down', function (event) {
        restartGame();
    }, this);
}

// Phaser lifecycle @ 60 fps
function update() {
    handlePlayerInput();
    enforcePaddleBounds();
}

// Control paddle movement
function handlePlayerInput() {
    let velocity = 10;
    let offset = 35;
    if (cursors.up.isDown) {
        leftPaddle.y -= velocity;
        socket.emit('player_move', { paddle: 'left', position: leftPaddle.y - offset });
    }
    if (cursors.down.isDown) {
        leftPaddle.y += velocity ;
        socket.emit('player_move', { paddle: 'left', position: leftPaddle.y + offset });
    }
    if (cursors.left.isDown) {
        rightPaddle.y -= velocity;
        socket.emit('player_move', { paddle: 'right', position: rightPaddle.y - offset });
    }
    if (cursors.right.isDown) {
        rightPaddle.y += velocity;
        socket.emit('player_move', { paddle: 'right', position: rightPaddle.y + offset });
    }
}

// Keep paddles from flying out of screen
function enforcePaddleBounds() {
    leftPaddle.y = Phaser.Math.Clamp(leftPaddle.y, 50, 550);
    rightPaddle.y = Phaser.Math.Clamp(rightPaddle.y, 50, 550);
}

// Handle score updates and reset ball when player scored
function playerScored(side) {
    ball.body.setVelocity(0, 0);
    socket.emit('score_update', { side: side });
    socket.emit('reset_ball_request');
}

// Restart Game
function restartGame() {
    socket.emit('restart_game_request');
}