import React from 'react';
import { STATUS_LABEL } from '../data/portfolio';
import './StatusBadge.css';

const ICON = { healthy: '✓', warning: '!', critical: '✕', nodata: '–' };

export default function StatusBadge({ status, size = 'sm', label }) {
  const text = label || (status === 'nodata' ? 'No data' : STATUS_LABEL[status]);
  return (
    <span className={`status-badge status-badge--${status} status-badge--${size}`}>
      <span className="status-badge-icon" aria-hidden="true">{ICON[status]}</span>
      {text}
    </span>
  );
}
