import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Connect4 from './components/connect4/Connect4';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/connect4" />} />
        <Route path="/connect4/*" element={<Connect4 />} />
      </Routes>
    </Router>
  );
}

export default App; 