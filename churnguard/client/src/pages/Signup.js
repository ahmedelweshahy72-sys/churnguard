import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, User, Building, AlertCircle } from 'lucide-react';
import './Auth.css';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.company);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb orb1" />
        <div className="auth-orb orb2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-card fade-up">
        <div className="auth-logo">
          <div className="logo-icon"><Shield size={22} /></div>
          <span>ChurnGuard</span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start predicting churn in minutes</p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={15} /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Full Name</label>
            <div className="input-wrap">
              <User size={15} />
              <input type="text" placeholder="John Smith" value={form.name} onChange={set('name')} required />
            </div>
          </div>

          <div className="field">
            <label>Email</label>
            <div className="input-wrap">
              <Mail size={15} />
              <input type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
            </div>
          </div>

          <div className="field">
            <label>Company (optional)</label>
            <div className="input-wrap">
              <Building size={15} />
              <input type="text" placeholder="Acme Corp" value={form.company} onChange={set('company')} />
            </div>
          </div>

          <div className="field">
            <label>Password</label>
            <div className="input-wrap">
              <Lock size={15} />
              <input type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
