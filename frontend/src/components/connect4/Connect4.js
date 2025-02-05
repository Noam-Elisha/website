import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './Connect4.css';

const socket = io(window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin, {
  path: '/socket.io',
  transports: ['websocket']
});

function Connect4() {
  const [board, setBoard] = useState(Array(6).fill().map(() => Array(7).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [winner, setWinner] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [playerNumber, setPlayerNumber] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [gameStatus, setGameStatus] = useState('waiting'); // 'waiting', 'playing', 'spectating'
  const [joinGameId, setJoinGameId] = useState('');
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    socket.on('game_created', (data) => {
      setGameId(data.game_id);
      setPlayerNumber(data.player_number);
      setGameStatus('waiting');
      setCurrentPlayer(data.current_player);
    });

    socket.on('game_joined', (data) => {
      setPlayerNumber(data.player_number);
      setGameStatus(data.player_number === 0 ? 'spectating' : 'playing');
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
    });

    socket.on('player_joined', (data) => {
      setGameStatus('playing');
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
    });

    socket.on('move_made', (data) => {
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
      
      if (data.winner) {
        setWinner(data.winner);
        setWinningCells(data.winningCells);
      }
    });

    socket.on('error', (data) => {
      alert(data.message);
    });

    return () => {
      socket.off('game_created');
      socket.off('game_joined');
      socket.off('player_joined');
      socket.off('move_made');
      socket.off('error');
    };
  }, []);

  useEffect(() => {
    if (winner) {
      setGameId(null);
      setJoinGameId('');
    }
  }, [winner]);

  const createGame = () => {
    setBoard(Array(6).fill().map(() => Array(7).fill(null)));
    setWinner(null);
    setWinningCells([]);
    socket.emit('create_game');
  };

  const handleJoinGame = (e) => {
    e.preventDefault();
    if (joinGameId) {
      setBoard(Array(6).fill().map(() => Array(7).fill(null)));
      setWinner(null);
      setWinningCells([]);
      setGameId(joinGameId);
      socket.emit('join_game', { game_id: Number(joinGameId) });
    }
  };

  const handleClick = (column) => {
    if (winner || 
        gameStatus !== 'playing' || 
        currentPlayer !== playerNumber) {
      return;
    }
    
    socket.emit('make_move', {
      game_id: Number(gameId),
      column: column,
      player: playerNumber
    });
  };

  const resetGame = () => {
    setBoard(Array(6).fill().map(() => Array(7).fill(null)));
    setCurrentPlayer(1);
    setWinner(null);
    setWinningCells([]);
    setGameStatus('waiting');
  };

  const handleWin = (winner) => {
    setWinner(winner);
    setShowButtons(true);
  };

  const renderCell = (row, col) => {
    const value = board[row][col];
    const isWinningCell = winningCells.some(([r, c]) => r === row && c === col);
    const cellClass = `cell ${value ? `player${value}` : ''} ${isWinningCell ? 'winner' : ''}`;
    
    return (
      <div 
        className={cellClass}
        onClick={() => handleClick(col)}
        key={`${row}-${col}`}
      />
    );
  };

  const handleNewGame = () => {
    console.log("Requesting new game"); // Debug log
    socket.emit('new_game');
  };

  return (
    <div className="App">
      <h1>Connect 4</h1>
      {(!gameId || winner) && (
        <div className="game-setup">
          <button className="create-game-btn" onClick={createGame}>Create New Game</button>
          <div className="join-game-form">
            <input 
              type="number" 
              placeholder="Enter Game ID"
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value)}
            />
            <button 
              className="join-game-btn" 
              onClick={handleJoinGame}
              disabled={!joinGameId}
            >
              Join Game
            </button>
          </div>
        </div>
      )}
      {gameId && (
        <div className="game-info">
          <div>Game ID: {gameId}</div>
          {gameStatus === 'waiting' && <div>Waiting for opponent...</div>}
          {gameStatus === 'spectating' && <div>Spectating</div>}
          {gameStatus === 'playing' && (
            winner ? 
              <div>Player {winner} wins!</div> : 
              <div>{currentPlayer === playerNumber ? 'Your turn' : "Opponent's turn"}</div>
          )}
        </div>
      )}
      <div className="board">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((_, colIndex) => renderCell(rowIndex, colIndex))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Connect4;
