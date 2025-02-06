import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Connect4 from './components/connect4/Connect4';
import Mancala from './components/mancala/mancala';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/connect4" />} />
        <Route path="/connect4/*" element={<Connect4 />} />
        <Route path="/mancala/*" element={<Mancala />} />
      </Routes>
    </Router>
  );
}

export default App; 