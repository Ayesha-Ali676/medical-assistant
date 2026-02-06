import React, { useState } from 'react';
import axios from 'axios';
import { Activity, Lock, User, FileBadge } from 'lucide-react';
import './login.css';
const Signup = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    medical_license_id: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/signup', formData);

      if (response.data.status === 'success') {
        alert('Account created successfully! Please login.');
        onSwitchToLogin();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

 return (
  <div className="signup-page">
    <div className="signup-card">
      <div className="signup-header">
        <div className="icon-box">
          <User />
        </div>
        <h1>Doctor Registration</h1>
        <p>Create your MedAssist account</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Full Name</label>
          <input
            type="text"
            required
            placeholder="Dr. Jane Doe"
            value={formData.full_name}
            onChange={(e) =>
              setFormData({ ...formData, full_name: e.target.value })
            }
          />
        </div>

        <div className="field">
          <label>Medical License ID</label>
          <input
            type="text"
            required
            placeholder="LIC-12345"
            value={formData.medical_license_id}
            onChange={(e) =>
              setFormData({ ...formData, medical_license_id: e.target.value })
            }
          />
        </div>

        <div className="field">
          <label>Username</label>
          <input
            type="text"
            required
            placeholder="Choose a username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
          />
        </div>

        <div className="field">
          <label>Email Address</label>
          <input
            type="email"
            required
            placeholder="doctor@example.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            required
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
        </div>

        {error && <div className="error-box">{error}</div>}

        <button disabled={loading} className="submit-btn">
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <p className="switch-text">
        Already have an account?
        <span onClick={onSwitchToLogin}> Login here</span>
      </p>
    </div>
  </div>
);
}
export default Signup;
