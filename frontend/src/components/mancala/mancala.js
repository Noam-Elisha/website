import React, { useState } from 'react';
import './mancala.css';

const Mancala = () => {
    // Initialize board state: 6 pockets per player, 4 stones each, and 2 stores
    const [board, setBoard] = useState([
        4, 4, 4, 4, 4, 4, // Player 1's pockets
        0, // Player 1's store
        4, 4, 4, 4, 4, 4, // Player 2's pockets
        0  // Player 2's store
    ]);
    const [currentPlayer, setCurrentPlayer] = useState(1);
    const [gameOver, setGameOver] = useState(false);

    const makeMove = (pocketIndex) => {
        if (gameOver) return;
        
        // Validate move
        if ((currentPlayer === 1 && pocketIndex >= 6) || 
            (currentPlayer === 2 && pocketIndex < 7 || pocketIndex >= 13)) {
            return;
        }

        const newBoard = [...board];
        let stones = newBoard[pocketIndex];
        newBoard[pocketIndex] = 0;
        
        let currentIndex = pocketIndex;
        while (stones > 0) {
            currentIndex = (currentIndex + 1) % 14;
            // Skip opponent's store
            if ((currentPlayer === 1 && currentIndex === 13) ||
                (currentPlayer === 2 && currentIndex === 6)) {
                continue;
            }
            newBoard[currentIndex]++;
            stones--;
        }

        // Check if game is over
        const gameEnded = newBoard.slice(0, 6).every(pocket => pocket === 0) ||
                         newBoard.slice(7, 13).every(pocket => pocket === 0);
        
        if (gameEnded) {
            setGameOver(true);
            // Add remaining stones to respective stores
            const sum1 = newBoard.slice(0, 6).reduce((a, b) => a + b, 0);
            const sum2 = newBoard.slice(7, 13).reduce((a, b) => a + b, 0);
            newBoard[6] += sum1;
            newBoard[13] += sum2;
            newBoard.fill(0, 0, 6);
            newBoard.fill(0, 7, 13);
        }

        setBoard(newBoard);
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    };

    return (
        <div className="mancala-board">
            <div className="player-2-store store">{board[13]}</div>
            <div className="pockets-container">
                <div className="player-2-pockets">
                    {board.slice(7, 13).reverse().map((stones, index) => (
                        <div 
                            key={12 - index}
                            className="pocket"
                            onClick={() => makeMove(12 - index)}
                        >
                            {stones}
                        </div>
                    ))}
                </div>
                <div className="player-1-pockets">
                    {board.slice(0, 6).map((stones, index) => (
                        <div 
                            key={index}
                            className="pocket"
                            onClick={() => makeMove(index)}
                        >
                            {stones}
                        </div>
                    ))}
                </div>
            </div>
            <div className="player-1-store store">{board[6]}</div>
            <div className="game-status">
                {gameOver 
                    ? `Game Over! ${board[6] > board[13] ? 'Player 1' : 'Player 2'} wins!`
                    : `Current Player: ${currentPlayer}`
                }
            </div>
        </div>
    );
};

export default Mancala;
