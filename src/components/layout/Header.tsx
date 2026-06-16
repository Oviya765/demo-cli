import { Menu, Search, Bell, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './Header.css';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
}

export default function Header({ onMenuClick, title, subtitle }: HeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-hamburger" onClick={onMenuClick} aria-label="Toggle menu">
          <Menu size={22} />
        </button>
        <div className="header-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="header-right">
        <div className="header-search">
          <Search className="search-icon" size={16} />
          <input type="text" placeholder="Search..." aria-label="Search" />
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          style={{ transition: 'transform 0.2s ease-out' }}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <button className="btn btn-ghost btn-icon" title="Notifications">
          <Bell size={20} />
        </button>
        <div className="sidebar-user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
          {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
        </div>
      </div>
    </header>
  );
}
