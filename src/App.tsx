import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css'; 
import './App.css'
import AuthService from './services/AuthService';
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import HomePage from "./pages/HomePage";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    AuthService.isAuthenticated()
  );

  const handleLogout = () => {
    AuthService.logout();
    setIsLoggedIn(false);
  };
  return (
    <Router>
      <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm mb-4">
        <div className="container">
          <Link className="navbar-brand" to="/">
            MyApp
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  Home
                </Link>
              </li>
            </ul>
            <div className="d-flex">
              {!isLoggedIn ? (
                <>
                  <Link to="/login" className="btn btn-outline-primary me-2">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    Sign Up
                  </Link>
                </>
              ) : (
                <button onClick={handleLogout} className="btn btn-danger">
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
