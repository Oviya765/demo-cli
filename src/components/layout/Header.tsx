import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Sun, Moon, Users, Stethoscope, Pill, FlaskConical } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { globalSearch } from '../../services/searchService';
import type { SearchResult } from '../../services/searchService';
import type { UserRole } from '../../models/types';
import './Header.css';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  patient: { icon: Users, color: '#2563eb', label: 'Patient' },
  encounter: { icon: Stethoscope, color: '#7c3aed', label: 'Encounter' },
  prescription: { icon: Pill, color: '#059669', label: 'Prescription' },
  lab: { icon: FlaskConical, color: '#d97706', label: 'Lab Order' },
};

export default function Header({ onMenuClick, title, subtitle }: HeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const res = await globalSearch(q, (user?.role || 'PATIENT') as UserRole);
      setResults(res);
      setShowDropdown(res.length > 0);
      setActiveIdx(-1);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [user?.role]);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setShowDropdown(false);
    setQuery('');
    setResults([]);
    navigate(result.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]); }
    else if (e.key === 'Escape') { setShowDropdown(false); }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        <div className="header-search" ref={containerRef}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search patients, encounters..."
            aria-label="Global search"
            value={query}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            onKeyDown={handleKeyDown}
          />
          {showDropdown && (
            <div className="search-dropdown">
              {searching && <div className="search-dropdown-loading">Searching...</div>}
              {results.map((r, idx) => {
                const meta = TYPE_META[r.type];
                const Icon = meta.icon;
                return (
                  <div
                    key={`${r.type}-${r.id}`}
                    className={`search-dropdown-item ${idx === activeIdx ? 'active' : ''}`}
                    onMouseDown={() => handleSelect(r)}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <div className="search-item-icon" style={{ background: meta.color + '18', color: meta.color }}>
                      <Icon size={14} />
                    </div>
                    <div className="search-item-content">
                      <div className="search-item-title">{r.title}</div>
                      <div className="search-item-sub">{r.subtitle}</div>
                    </div>
                    <span className="search-item-badge" style={{ color: meta.color }}>{meta.label}</span>
                  </div>
                );
              })}
              {!searching && results.length === 0 && query.trim().length >= 2 && (
                <div className="search-dropdown-empty">No results found</div>
              )}
            </div>
          )}
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
