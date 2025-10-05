import React, { useState } from "react";
import axios from "axios";
import "./AuthPage.css";

const AuthPage = ({ setLoggedIn, setUserRole, setUserId, darkMode }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user"); // user or doctor
  const [error, setError] = useState("");

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setError("");

    const url = type === "login" 
      ? "http://localhost:5000/login" 
      : "http://localhost:5000/register";

    try {
      const res = await axios.post(url, { username, password, role });
      if (res.data.success) {
        if (type === "login") {
          const { user_id, role } = res.data;

          // Save in localStorage
          localStorage.setItem("user_id", user_id);
          localStorage.setItem("role", role);

          // Update App state
          setUserId(user_id);
          setUserRole(role);
          setLoggedIn(true);
        }
        alert(res.data.message);
      } else {
        setError(res.data.message || "Something went wrong");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className={`auth-page ${darkMode ? "dark" : ""}`}>
      <h2>Login / Sign Up</h2>
      {error && <p className="error">{error}</p>}

      <form>
        <label>Username:</label>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} />

        <label>Password:</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />

        <label>Role:</label>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="user">User</option>
          <option value="doctor">Doctor</option>
        </select>

        <div className="buttons">
          <button onClick={(e) => handleSubmit(e, "login")}>Login</button>
          <button onClick={(e) => handleSubmit(e, "signup")}>Sign Up</button>
        </div>
      </form>
    </div>
  );
};

export default AuthPage;
