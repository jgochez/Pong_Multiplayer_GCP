const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

let leftScore = 0;
let rightScore = 0;

// Initial ball position and velocity
const initialBallState = {
    x: 400,
    y: 300,
    vx: 200,
    vy: 200
};

// Store the current position of the ball
let ballState = { ...initialBallState };

// Serve static files from the public directory
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected');

    // Emit initial game state to the new client
    socket.emit('update_score', { left: leftScore, right: rightScore });
    socket.emit('reset_ball', ballState);

    // Listen for player movements and broadcast to all clients
    socket.on('player_move', (data) => {
        io.emit('update_position', data);
    });

    // Listen for score updates and broadcast to all clients
    socket.on('score_update', (data) => {
        if (data.side === 'left') {
            leftScore++;
        } else if (data.side === 'right') {
            rightScore++;
        }
        io.emit('update_score', { left: leftScore, right: rightScore });
    });

    // Listen for reset ball request and reset ball position
    socket.on('reset_ball_request', () => {
        ballState = { ...initialBallState };
        io.emit('reset_ball', ballState);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
