import React, { useState, useEffect } from 'react';
import './Connect4.css';

function Connect4() {
  const [board, setBoard] = useState(Array(6).fill().map(() => Array(7).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [winner, setWinner] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [playerNumber, setPlayerNumber] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [joinGameId, setJoinGameId] = useState('');
  const [eventSource, setEventSource] = useState(null);

  // Set up SSE connection when game is created/joined
  useEffect(() => {
    if (gameId && !winner) {
      console.log('Setting up event source for game:', gameId);
      const newEventSource = new EventSource(`/api/game/${gameId}/events`);
      
      newEventSource.onopen = () => {
        console.log('SSE connection opened successfully');
      };
      
      newEventSource.onmessage = (event) => {
        console.log('Raw SSE event received:', event);
        const data = JSON.parse(event.data);
        console.log('Parsed game update:', data);
        
        if (data.error) {
          console.error('Game error:', data.error);
          newEventSource.close();
          return;
        }

        setBoard(data.board);
        setCurrentPlayer(data.current_player);
        
        if (data.players_count === 2 && gameStatus === 'waiting') {
          console.log('Second player joined, updating game status');
          setGameStatus('playing');
        }
      };

      newEventSource.onerror = (error) => {
        console.error('SSE error:', error);
        console.error('SSE readyState:', newEventSource.readyState);
        newEventSource.close();
      };

      setEventSource(newEventSource);

      return () => {
        console.log('Cleaning up event source');
        newEventSource.close();
        setEventSource(null);
      };
    }
  }, [gameId, winner, gameStatus]);

  const createGame = async () => {
    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
      });
      const data = await response.json();
      
      setGameId(data.game_id);
      setPlayerNumber(data.player_number);
      setGameStatus('waiting');
      setCurrentPlayer(data.current_player);
      setBoard(Array(6).fill().map(() => Array(7).fill(null)));
      
      // Start waiting for opponent
      const waitResponse = await fetch(`/api/game/${data.game_id}/wait_for_opponent`);
      const waitData = await waitResponse.json();
      
      if (waitData.joined) {
        console.log('Opponent joined!');
        setGameStatus('playing');
        setBoard(waitData.board);
        setCurrentPlayer(waitData.current_player);
      }
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const handleJoinGame = async (e) => {
    e.preventDefault();
    if (!joinGameId) return;

    try {
      const response = await fetch(`/api/game/${joinGameId}/join`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }

      setGameId(joinGameId);
      setPlayerNumber(data.player_number);
      setGameStatus(data.player_number === 0 ? 'spectating' : 'playing');
      setBoard(data.board);
      setCurrentPlayer(data.current_player);
    } catch (error) {
      console.error('Error joining game:', error);
    }
  };

  const handleClick = async (column) => {
    if (winner || currentPlayer !== playerNumber) {
      return;
    }

    try {
      const response = await fetch(`/api/game/${gameId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          column: column,
          player: playerNumber
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }

      if (data.winner) {
        setWinner(data.winner);
        setWinningCells(data.winningCells);
      }
    } catch (error) {
      console.error('Error making move:', error);
    }
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
