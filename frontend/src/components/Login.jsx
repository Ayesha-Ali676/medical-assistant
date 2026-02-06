import React, { useState } from 'react';
import axios from 'axios';
import { Activity, Lock, User } from 'lucide-react';
import './login.css';
const Login = ({ onLogin, onSwitchToSignup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/login', {
        username,
        password,
      });

      if (response.data.status === 'success') {
        onLogin(response.data.user);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        {/* Header */}
        <div className="signup-header">
          <div className="icon-box">
            <Activity />
          </div>
          <h1>MedAssist Login</h1>
          <p>Secure Physician Access</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username or Email</label>
            <input
              type="text"
              required
              placeholder="Enter your username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Verifying Credentials...' : 'Access Dashboard'}
          </button>
        </form>

        {/* Footer */}
        <p className="switch-text">
          New to the system?
          <span onClick={onSwitchToSignup}> Create Physician Account</span>
        </p>
      </div>
    </div>
  );
};

export default Login;