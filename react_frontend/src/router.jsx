import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import Login from "./views/Login.jsx";
import Signup from "./views/Signup.jsx";
import { getToken } from "./auth.js";

// PUBLIC_INTERFACE
export function ProtectedRoute({ children }) {
  /** Guards routes requiring authentication by checking token presence. */
  const token = getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// PUBLIC_INTERFACE
export default function AppRouter() {
  /** Main router that defines public and protected routes. */
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
