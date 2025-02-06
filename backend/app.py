from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import os
import time

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)
socketio = SocketIO(app, 
    cors_allowed_origins=["http://localhost:3000", "http://localhost:5000", "https://noamelisha.com"]
)

# Store active games
games = {}

# Debug middleware to log all requests
@app.before_request
def before_request():
    print(f"Incoming request: {request.method} {request.path}")
    print(f"Request URL: {request.url}")
    print(f"Request base URL: {request.base_url}")

# Serve static files from the nested static directory (for React app)
@app.route('/static/<path:filename>')
def serve_static(filename):
    print(f"Serving static file from nested static: {filename}")
    try:
        return send_from_directory(os.path.join(app.static_folder, 'static'), filename)
    except Exception as e:
        print(f"Error serving static file: {e}")
        return str(e), 404

# Serve personal static assets
@app.route('/personal/static/<path:filename>')
def serve_personal_static(filename):
    print(f"Serving personal static file: {filename}")
    try:
        return send_from_directory(os.path.join(app.static_folder, 'personal', 'static'), filename)
    except Exception as e:
        print(f"Error serving personal static file: {e}")
        return str(e), 404

# Personal static routes
@app.route('/about')
def serve_about():
    return send_file(os.path.join(app.static_folder, 'personal', 'about.html'))

@app.route('/about/')
def serve_about_slash():
    return send_file(os.path.join(app.static_folder, 'personal', 'about.html'))

@app.route('/contact')
@app.route('/contact/')
def serve_contact():
    return send_file(os.path.join(app.static_folder, 'personal', 'contact.html'))

@app.route('/blog')
@app.route('/blog/')
def serve_blog():
    return send_file(os.path.join(app.static_folder, 'personal', 'blog.html'))

# Root path - serve personal index
@app.route('/')
def serve_root():
    print("Serving root path")
    try:
        return send_file(os.path.join(app.static_folder, 'personal', 'home.html'))
    except:
        return send_file(os.path.join(app.static_folder, 'index.html'))

# Explicit routes for the games
@app.route('/connect4')
@app.route('/connect4/')
@app.route('/mancala')
@app.route('/mancala/')
def serve_game():
    print(f"Serving game route: {request.path}")
    return send_file(os.path.join(app.static_folder, 'index.html'))

# Catch remaining static files
@app.route('/<path:filename>')
def serve_remaining(filename):
    print(f"Trying to serve: {filename}")
    try:
        # First check if it's a personal static file
        personal_path = os.path.join(app.static_folder, 'personal', filename)
        if os.path.exists(personal_path):
            return send_file(personal_path)
        # Then check root static folder
        if os.path.exists(os.path.join(app.static_folder, filename)):
            return send_file(os.path.join(app.static_folder, filename))
        # If neither, serve React app index.html for client-side routing
        return send_file(os.path.join(app.static_folder, 'index.html'))
    except Exception as e:
        print(f"Error serving file {filename}: {e}")
        return str(e), 404

def check_winner(board, row, col, player):
    def check_direction(row, col, row_delta, col_delta):
        winning_cells = [(row, col)]
        count = 1
        r, c = row + row_delta, col + col_delta
        
        # Check forward direction
        while 0 <= r < 6 and 0 <= c < 7 and board[r][c] == player:
            winning_cells.append((r, c))
            count += 1
            r += row_delta
            c += col_delta
        
        # Check backward direction
        r, c = row - row_delta, col - col_delta
        while 0 <= r < 6 and 0 <= c < 7 and board[r][c] == player:
            winning_cells.append((r, c))
            count += 1
            r -= row_delta
            c -= col_delta
            
        return (count >= 4, winning_cells if count >= 4 else [])

    # Check all directions
    directions = [
        (0, 1),  # horizontal
        (1, 0),  # vertical
        (1, 1),  # diagonal /
        (1, -1)  # diagonal \
    ]
    
    for row_delta, col_delta in directions:
        won, cells = check_direction(row, col, row_delta, col_delta)
        if won:
            return True, cells
    return False, []

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('create_game')
def handle_create_game():
    # Generate a random game ID between 1000 and 9999
    while True:
        game_id = random.randint(1000, 9999)
        if game_id not in games:
            break
    
    # Randomly choose who goes first (1 or 2)
    first_player = random.randint(1, 2)
    
    games[game_id] = {
        'board': [[None] * 7 for _ in range(6)],
        'current_player': first_player,  # Set the random first player
        'players': [request.sid],
        'spectators': []
    }
    join_room(str(game_id))
    emit('game_created', {
        'game_id': game_id, 
        'player_number': 1,
        'current_player': first_player  # Send the first player info
    })

@socketio.on('join_game')
def handle_join_game(data):
    try:
        game_id = int(data['game_id'])
        if game_id not in games:
            emit('error', {'message': 'Game not found. Please check the game ID.'})
            return
        
        game = games[game_id]
        if len(game['players']) == 1:
            game['players'].append(request.sid)
            join_room(str(game_id))
            emit('game_joined', {
                'player_number': 2,
                'board': game['board'],
                'current_player': game['current_player']
            })
            emit('player_joined', {
                'board': game['board'],
                'current_player': game['current_player']
            }, room=str(game_id))
        else:
            game['spectators'].append(request.sid)
            join_room(str(game_id))
            emit('game_joined', {
                'player_number': 0,
                'board': game['board'],
                'current_player': game['current_player']
            })
    except ValueError:
        emit('error', {'message': 'Invalid game ID format'})

@socketio.on('make_move')
def handle_move(data):
    game_id = int(data['game_id'])
    column = data['column']
    player = data['player']
    
    if game_id not in games:
        emit('error', {'message': f'Game not found: {game_id}'})
        return

    game = games[game_id]
    
    # Verify it's the player's turn
    if game['current_player'] != player:
        emit('error', {'message': 'Not your turn'})
        return

    # Verify the player is in the game
    if request.sid not in game['players']:
        emit('error', {'message': 'Not a player in this game'})
        return

    # Verify it's the correct player making the move
    if request.sid != game['players'][player - 1]:
        emit('error', {'message': 'Not your turn'})
        return

    board = game['board']
    row = find_lowest_empty_row(board, column)
    
    if row == -1:
        emit('error', {'message': 'Column is full'})
        return
    
    board[row][column] = player
    is_winner, winning_cells = check_winner(board, row, column, player)
    
    # Update the current player
    game['current_player'] = 3 - player  # Switches between 1 and 2
    
    response = {
        'row': row,
        'column': column,
        'player': player,
        'current_player': game['current_player'],
        'winner': player if is_winner else None,
        'winningCells': winning_cells if is_winner else [],
        'board': board
    }
    
    emit('move_made', response, room=str(game_id))

def find_lowest_empty_row(board, column):
    for row in range(5, -1, -1):
        if not board[row][column]:
            return row
    return -1

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't need to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def setup_upnp(upnp):
    upnp.discoverdelay = 10
    upnp.discover()
    upnp.selectigd()
    
    # Get your local IP
    local_ip = get_local_ip()
    
    # Add port mapping
    # Arguments: external_port, protocol, internal_host, internal_port, description, remote_host
    upnp.addportmapping(5000, 'TCP', local_ip, 5000, 'Connect4 Server', '')
    
    # Get and display your public IP
    public_ip = requests.get('https://api.ipify.org').text
    print(f"Server is running!")
    print(f"Your public IP: {public_ip}")
    print(f"Port: 5000")
    
    return upnp

def cleanup_upnp(upnp):
    try:
        upnp.deleteportmapping(5000, 'TCP')
        print("\nPort forwarding removed")
    except:
        print("\nFailed to remove port forwarding")

def run_server():
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down server...")
        print("Server shutdown complete!")
        
if __name__ == "__main__":
    static_path = os.path.abspath(app.static_folder)
    print(f"Starting server with static folder: {static_path}")
    print(f"Index.html exists: {os.path.exists(os.path.join(static_path, 'index.html'))}")
    print(f"Available files in static folder: {os.listdir(static_path)}")
    socketio.run(app, debug=True)