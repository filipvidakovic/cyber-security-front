import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import AuthService from "./services/AuthService";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import HomePage from "./pages/HomePage";
import CertificateForm from "./components/certificate/CertificateForm";
import CertificateList from "./components/certificate/CertificateList";

function AppContent() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(AuthService.isAuthenticated());
  const [userRole, setUserRole] = useState<"USER" | "ADMIN" | "CA_USER" | null>(
    AuthService.getUserRole()
  );

  const handleLogout = () => {
    AuthService.logout();
    setIsLoggedIn(false);
    setUserRole(null);
    navigate("/login");
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm mb-4">
        <div className="container">
          <Link className="navbar-brand" to="/">
            MyApp
          </Link>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  Home
                </Link>
              </li>

              {(userRole === "ADMIN" ||
                userRole === "CA_USER" ||
                userRole === "USER") && (
                <li className="nav-item">
                  <Link className="nav-link" to="/create-certificates">
                    Create Certificate
                  </Link>
                </li>
              )}

              {userRole === "ADMIN" && (
                <li className="nav-item">
                  <Link className="nav-link" to="/register-ca-user">
                    Add CA User
                  </Link>
                </li>
              )}

              {userRole && (
                <li className="nav-item">
                  <Link className="nav-link" to="/certificates">
                    View Certificates
                  </Link>
                </li>
              )}
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
          <Route
            path="/login"
            element={
              <Login
                onLogin={(role) => {
                  setIsLoggedIn(true);
                  setUserRole(role);
                }}
              />
            }
          />
          <Route path="/register" element={<Register />} />
          <Route
            path="/create-certificates"
            element={<CertificateForm role={userRole} />}
          />
          <Route
            path="/register-ca-user"
            element={<Register adminMode={true} />}
          />
          <Route
            path="/certificates"
            element={<CertificateList role={userRole} />}
          />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
