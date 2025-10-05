import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; // Use axios for consistency if possible, or keep fetch
import "./LoginPage.css";

// Note: Assuming you pass the necessary props from App.js now
function LoginPage({ setLoggedIn, setUserRole, setUserId, darkMode = false }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      // Using axios/fetch with JSON body
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      
      if (data.success) {
        const { user_id, role } = data;
        
        // Save state and local storage
        localStorage.setItem("user_id", user_id);
        localStorage.setItem("role", role);
        setUserId(user_id); 
        setUserRole(role);
        setLoggedIn(true);

        // Navigate based on role
        navigate(role === 'doctor' ? "/reports" : "/"); 
      } else {
        setError(data.message || "Login failed. Check your credentials.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Could not connect to the server.");
    }
  };

  return (
    <div className={`login-page ${darkMode ? 'dark' : ''}`}>
      
      <div className="login-card">
        <h1>Welcome Back</h1>
        
        {error && (
          <p className="error">{error}</p>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        
        <button
          onClick={handleLogin}
        >
          Login
        </button>

        {/* Since you don't have a dedicated signup page, point to /login which is the AuthPage */}
        <p className="aux-text">
          Need an account? <a href="/login">Sign Up</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;