import React from 'react';
import './PageHeader.css';

export default function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header-bar">
      <div className="page-header-brand">
        <img className="page-header-logo" src="/daire-logo.png" alt="dAIRE" />
        <div>
          <div className="page-header-product">Asset Management</div>
          <h1 className="page-header-title">{title}</h1>
          {subtitle && <p className="page-header-sub">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </header>
  );
}
