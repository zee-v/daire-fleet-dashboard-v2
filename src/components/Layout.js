import React from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

export default function Layout({ children }) {
  return (
    <div className="app-root">
      <Sidebar />
      <div className="page-content">{children}</div>
    </div>
  );
}
