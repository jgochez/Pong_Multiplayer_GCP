import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode='eventlet')

left_score = 0
right_score = 0

# Initial ball position and velocity
initial_ball_state = {
    'x': 400,
    'y': 300,
    'vx': 200,
    'vy': 200
}

# Initial paddles positions
initial_paddles_position = {
    'leftX':  50,
    'leftY':  300,
    'rightX': 750,
    'rightY': 300
}

# Store the current position of the ball
ball_state = initial_ball_state.copy()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print('New client connected')
    emit('update_score', {'left': left_score, 'right': right_score})
    emit('reset_ball', ball_state)

@socketio.on('restart_game_request')
def handle_restart_game():
    global left_score, right_score, ball_state
    left_score = 0
    right_score = 0
    ball_state = initial_ball_state.copy()
    emit('restart_game_request', {
        'leftX': initial_paddles_position['leftX'],
        'leftY': initial_paddles_position['leftY'],
        'rightX': initial_paddles_position['rightX'],
        'rightY': initial_paddles_position['rightY'],
        'left': left_score,
        'right': right_score,
        'ballX': ball_state['x'],
        'ballY': ball_state['y'],
        'ballVx': ball_state['vx'],
        'ballVy': ball_state['vy']
    }, broadcast=True)

@socketio.on('player_move')
def handle_player_move(data):
    emit('update_position', data, broadcast=True)

@socketio.on('score_update')
def handle_score_update(data):
    global left_score, right_score
    if data['side'] == 'left':
        left_score += 1
    elif data['side'] == 'right':
        right_score += 1
    emit('update_score', {'left': left_score, 'right': right_score}, broadcast=True)

@socketio.on('reset_ball_request')
def handle_reset_ball_request():
    global ball_state
    ball_state = initial_ball_state.copy()
    emit('reset_ball', ball_state, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5151)
