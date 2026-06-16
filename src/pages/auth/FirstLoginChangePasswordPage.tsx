import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { changePassword } from '../../services/authService';
import { Lock, Eye, EyeOff, AlertCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { validatePassword } from '../../utils/validation';
import '../../assets/styles/auth/LoginPage.css';

export default function FirstLoginChangePasswordPage() {
  const navigate = useNavigate();
  const { user, loginUser } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const check = validatePassword(newPassword);
    if (!check.isValid) {
      setError(check.error || 'Password does not meet validation criteria');
      return;
    }

    if (newPassword === 'clinic@123') {
      setError('Password cannot be the default clinic@123 password');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(newPassword);
      // Update session with new token
      loginUser({
        ...user!,
        token: res.token,
        needsPasswordChange: false
      });
      toast.success('Password updated successfully! Welcome to Clinic Flow.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-bg-glow"></div>
      <div className="auth-bg-glow-2"></div>

      <div className="auth-main-container" style={{ width: '450px', minHeight: '550px', display: 'flex' }}>
        <div className="form-container" style={{ position: 'relative', width: '100%', height: '100%', left: 0, opacity: 1, zIndex: 2, display: 'block' }}>
          <form onSubmit={handleSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                <ShieldAlert size={28} />
              </div>
              <h1>Secure Your Account</h1>
              <p className="subtitle" style={{ margin: 0, textAlign: 'center' }}>Please update your default password to continue</p>
            </div>

            {error && (
              <div className="error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Updating Password...' : 'Save & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
