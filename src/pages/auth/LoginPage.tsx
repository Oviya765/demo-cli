import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { login, register } from '../../services/authService';
import type { UserRole } from '../../models/types';
import { Mail, Lock, User, Phone, Eye, EyeOff, Stethoscope, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { validatePassword, validateEmail } from '../../utils/validation';
import '../../assets/styles/auth/LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser } = useAuth();

  // Detect mode from URL path (/register vs /login)
  const isSignUp = location.pathname === '/register';

  // ── Login State ──
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Register State ──
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // ── Handlers ──
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await login({ email: loginEmail, password: loginPassword });
      loginUser({
        userId: res.user.userId,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role as UserRole,
        token: res.token,
        needsPasswordChange: res.user.needsPasswordChange,
      });
      toast.success('Successfully logged in!');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegError('');

    const emailCheck = validateEmail(regEmail);
    if (!emailCheck.isValid) {
      setRegError(emailCheck.error || 'Invalid email address');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match');
      return;
    }

    const passwordCheck = validatePassword(regPassword);
    if (!passwordCheck.isValid) {
      setRegError(passwordCheck.error || 'Invalid password complexity');
      return;
    }

    const trimmedPhone = regPhone.trim();
    if (trimmedPhone.length !== 10) {
      setRegError('Phone number must contain exactly 10 digits.');
      return;
    }

    setRegLoading(true);
    try {
      await register({ name: regName, email: regEmail, password: regPassword, phone: regPhone });
      toast.success('Account created! Please sign in.');
      
      // Clear registration state
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');
      
      // Switch back to Login view
      navigate('/login');
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-bg-glow"></div>
      <div className="auth-bg-glow-2"></div>

      {/* Global Viewport Corner Doodles */}
      <svg className="auth-doodle doodle-float-slow-1" style={{ top: '8%', left: '8%', width: '110px', height: '90px' }} viewBox="0 0 110 90" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 15 50 C 35 15, 65 15, 65 45 C 65 75, 35 75, 45 50 C 55 25, 85 45, 95 65" />
        <circle cx="15" cy="65" r="2" fill="currentColor" stroke="none" />
        <circle cx="95" cy="25" r="2.5" fill="currentColor" stroke="none" />
      </svg>
      
      <svg className="auth-doodle doodle-float-slow-2" style={{ bottom: '10%', right: '8%', width: '80px', height: '70px' }} viewBox="0 0 80 70" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 15 35 C 25 33, 45 37, 65 35" />
        <path d="M 40 10 C 38 25, 42 45, 40 60" />
        <path d="M 18 32 C 30 35, 40 33, 62 33" opacity="0.5" />
        <path d="M 42 12 C 41 22, 39 44, 41 58" opacity="0.5" />
      </svg>

      {/* Main Container */}
      <div 
        className={`auth-main-container container ${isSignUp ? 'right-panel-active mobile-sign-up' : 'mobile-sign-in'}`}
        id="auth-container"
      >
        {/* ── Sign Up Form ── */}
        <div className="form-container sign-up-container">
          <form onSubmit={handleRegister}>
            {/* Form Background Doodles */}
            <svg className="auth-doodle doodle-float-slow-3" style={{ top: '15%', right: '8%', width: '40px', height: '40px' }} viewBox="0 0 50 50" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 25 5 Q 25 25 5 25 Q 25 25 25 45 Q 25 25 45 25 Q 25 25 25 5 Z" />
            </svg>
            <svg className="auth-doodle doodle-float-slow-1" style={{ bottom: '12%', left: '8%', width: '100px', height: '50px' }} viewBox="0 0 130 60" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 10 30 Q 30 30 45 30 T 55 10 T 65 50 T 75 25 T 85 35 Q 100 30 120 30" />
            </svg>

            <h1>Create Account</h1>
            <p className="subtitle">Join Clinic Flow for outpatient management</p>

            {regError && (
              <div className="error-alert">
                <AlertCircle size={16} />
                <span>{regError}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="reg-name">Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  placeholder="John Doe"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="john@example.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Phone Number</label>
              <div className="input-wrapper">
                <Phone size={16} className="input-icon" />
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={regPhone}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setRegPhone(value);
                    }
                  }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="reg-password"
                  type={showRegPassword ? 'text' : 'password'}
                  placeholder="Min. 8 chars (caps, small, digit, symbol)"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="reg-confirm"
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={regConfirmPassword}
                  onChange={e => setRegConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={regLoading}>
              {regLoading ? 'Creating account...' : 'Create Account'}
            </button>

            {/* Mobile layout toggle */}
            <div className="mobile-toggle-footer">
              Already have an account? 
              <button type="button" onClick={() => navigate('/login')}>Sign In</button>
            </div>
          </form>
        </div>

        {/* ── Sign In Form ── */}
        <div className="form-container sign-in-container">
          <form onSubmit={handleLogin}>
            {/* Form Background Doodles */}
            <svg className="auth-doodle doodle-float-slow-2" style={{ bottom: '15%', right: '10%', width: '70px', height: '70px' }} viewBox="0 0 80 80" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 40 10 C 60 10, 70 25, 70 40 C 70 55, 55 70, 40 70 C 25 70, 10 55, 10 40 C 10 22, 28 8, 45 15 C 55 20, 62 35, 60 45" />
              <circle cx="25" cy="25" r="2" fill="currentColor" stroke="none" />
              <circle cx="55" cy="55" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            <svg className="auth-doodle doodle-float-slow-3" style={{ top: '15%', left: '8%', width: '40px', height: '40px' }} viewBox="0 0 50 50" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 25 5 Q 25 25 5 25 Q 25 25 25 45 Q 25 25 45 25 Q 25 25 25 5 Z" />
            </svg>

            <h1>Sign In</h1>
            <p className="subtitle">Access your Clinic Flow workstation</p>

            {loginError && (
              <div className="error-alert">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="doctor@clinicflow.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Mobile layout toggle */}
            <div className="mobile-toggle-footer">
              Don't have an account? 
              <button type="button" onClick={() => navigate('/register')}>Sign Up</button>
            </div>
          </form>
        </div>

        {/* ── Sliding Overlay Container ── */}
        <div className="overlay-container">
          <div className="overlay">
            {/* Left Panel (Shows when SignUp is active) */}
            <div className="overlay-panel overlay-left">
              {/* Overlay Background Doodles */}
              <svg className="auth-doodle doodle-float-slow-1" style={{ bottom: '20%', left: '12%', width: '80px', height: '80px', transform: 'rotate(-20deg)' }} viewBox="0 0 85 90" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 15 20 C 30 50, 60 55, 50 35 C 40 15, 20 30, 45 60 L 65 75" />
                <path d="M 52 75 L 67 77 L 69 62" />
              </svg>
              <svg className="auth-doodle doodle-pulse-slow" style={{ top: '18%', right: '15%', width: '40px', height: '40px' }} viewBox="0 0 50 50" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 25 5 Q 25 25 5 25 Q 25 25 25 45 Q 25 25 45 25 Q 25 25 25 5 Z" />
              </svg>

              <div className="overlay-brand">
                <div className="overlay-brand-logo">
                  <Stethoscope size={18} />
                </div>
                <span>Clinic Flow</span>
              </div>
              <h1>Welcome Back</h1>
              <p>
                Sign in to continue using your account and access your workspace.
              </p>
              <button 
                type="button" 
                className="btn-ghost" 
                id="signIn"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
            </div>

            {/* Right Panel (Shows when SignIn is active) */}
            <div className="overlay-panel overlay-right">
              {/* Overlay Background Doodles */}
              <svg className="auth-doodle doodle-float-slow-2" style={{ top: '18%', left: '12%', width: '80px', height: '80px' }} viewBox="0 0 100 100" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 15 45 L 85 15 L 50 85 L 40 55 L 15 45 Z" />
                <path d="M 85 15 L 40 55" />
                <path d="M 40 55 L 50 65 L 50 85" />
              </svg>
              <svg className="auth-doodle doodle-float-slow-3" style={{ bottom: '18%', right: '12%', width: '90px', height: '70px' }} viewBox="0 0 110 90" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 15 50 C 35 15, 65 15, 65 45 C 65 75, 35 75, 45 50 C 55 25, 85 45, 95 65" />
              </svg>

              <div className="overlay-brand">
                <div className="overlay-brand-logo">
                  <Stethoscope size={18} />
                </div>
                <span>Clinic Flow</span>
              </div>
              <h1>Create Your Account</h1>
              <p>
                Register to access Clinic Flow and manage healthcare operations
              </p>
              <button 
                type="button" 
                className="btn-ghost" 
                id="signUp"
                onClick={() => navigate('/register')}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}