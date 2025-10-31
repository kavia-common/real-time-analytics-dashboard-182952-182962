import React from "react";

/**
 * PUBLIC_INTERFACE
 * Header
 * Displays the application title and subtitle with themed styles.
 */
export default function Header({ title, subtitle }) {
  return (
    <header className="header">
      <div className="header-text">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </header>
  );
}
