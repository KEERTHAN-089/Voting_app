import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import Icon from './Icon';

const Navbar = ({ theme, onToggleTheme }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  // Arriving on a new page should not leave the mobile menu hanging open
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Escape closes it, and so does a click anywhere outside the bar
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onPointerDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setMenuOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <nav className="navbar" ref={navRef}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-mark" aria-hidden="true">
            <Icon name="ballot" />
          </span>
          Voting App
        </Link>

        <ul className={`navbar-links${menuOpen ? ' open' : ''}`} id="primary-navigation">
          <li><NavLink to="/" className={linkClass} end>Home</NavLink></li>

          {!user ? (
            <li><NavLink to="/login" className="btn btn-primary btn-sm">Sign in</NavLink></li>
          ) : (
            <>
              <li><NavLink to="/dashboard" className={linkClass}>My sessions</NavLink></li>
              <li><NavLink to="/create" className={linkClass}>Create session</NavLink></li>
              <li>
                <button type="button" onClick={handleLogout} className="nav-link nav-button">
                  <Icon name="logOut" size={16} />
                  Sign out
                </button>
              </li>
            </>
          )}
        </ul>

        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>

        <button
          type="button"
          className="icon-button navbar-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'x' : 'menu'} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
