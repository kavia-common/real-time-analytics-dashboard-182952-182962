import React, { useEffect, useState, useCallback } from "react";
import { login } from "../auth.js";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * Login
 * Login page for existing users. On success, redirects to dashboard or intended destination.
 * Uses large centered card with modern blue theme and smooth transitions.
 */
export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });

  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname || "/dashboard";

  // Clear location state error on component mount
  useEffect(() => {
    const locationError = location?.state?.error;
    if (locationError) {
      setError(locationError);
      // Clean up the location state to prevent showing error on revisit
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location?.state?.error]);

  const handleInputChange = useCallback(
    (field) => (e) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (error) setError("");
    },
    [error]
  );

  const handleBlur = useCallback(
    (field) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
    },
    []
  );

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getFieldError = useCallback(
    (field) => {
      if (!touched[field]) return "";
      if (field === "email" && formData.email && !isValidEmail(formData.email)) {
        return "Please enter a valid email address";
      }
      if (field === "password" && !formData.password) {
        return "Password is required";
      }
      return "";
    },
    [formData, touched]
  );

  const isFormValid =
    formData.email && isValidEmail(formData.email) && formData.password;

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!isFormValid) {
      setError("Please fix the validation errors above");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await login({ email: formData.email, password: formData.password });
      navigate(from, { replace: true });
    } catch (err) {
      const errorMessage =
        err?.message || "Login failed. Please check your credentials.";
      setError(errorMessage);

      // Focus on email field for accessibility after error
      setTimeout(() => {
        const emailInput = document.getElementById("email");
        if (emailInput) emailInput.focus();
      }, 100);
    } finally {
      setSubmitting(false);
    }
  };

  const emailError = getFieldError("email");
  const passwordError = getFieldError("password");
  const showFormErrors = emailError || passwordError;

  return (
    <div className="auth-container theme-user">
      <div className="auth-blob one" aria-hidden="true" />
      <div className="auth-blob two" aria-hidden="true" />

      <div className="auth-card auth-card--large auth-card--taller glass-card card-appear" role="main" aria-label="User sign in">
        <div className="auth-stack">
          <div className="auth-headblock">
            <div className="auth-icon" aria-hidden="true">🔐</div>
            <div className="auth-headtext">
              <h1 className="auth-title">Sign in</h1>
              <p className="auth-subtitle">Access your dashboard</p>
              <p className="auth-tagline">Welcome back</p>
            </div>
          </div>

        {error && (
          <div className="auth-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {showFormErrors && !error && (
          <div
            className="auth-error auth-error--validation"
            role="alert"
            aria-live="polite"
          >
            <strong>Please fix the following issues:</strong>
            <ul>
              {emailError && <li>{emailError}</li>}
              {passwordError && <li>{passwordError}</li>}
            </ul>
          </div>
        )}

        <form onSubmit={onSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">
              Email address
            </label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">📧</span>
              <input
                id="email"
                name="email"
                type="email"
                className={`auth-input ${emailError ? "auth-input--error" : ""}`}
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange("email")}
                onBlur={handleBlur("email")}
                required
                autoComplete="email"
                autoFocus
                aria-required="true"
                aria-invalid={emailError ? "true" : "false"}
                aria-describedby={emailError ? "email-error" : undefined}
                disabled={submitting}
              />
            </div>
            {emailError && (
              <div id="email-error" className="auth-field-error" role="alert">
                {emailError}
              </div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">🔑</span>
              <input
                id="password"
                name="password"
                type="password"
                className={`auth-input ${passwordError ? "auth-input--error" : ""}`}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange("password")}
                onBlur={handleBlur("password")}
                required
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={passwordError ? "true" : "false"}
                aria-describedby={passwordError ? "password-error" : undefined}
                disabled={submitting}
              />
            </div>
            {passwordError && (
              <div id="password-error" className="auth-field-error" role="alert">
                {passwordError}
              </div>
            )}
          </div>

          <button
            className={`btn-primary auth-submit ${submitting ? "is-loading" : ""}`}
            type="submit"
            disabled={submitting || (!isFormValid && touched.email && touched.password)}
            aria-busy={submitting}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-alt">
          New here?{" "}
          <a href="/signup" className="btn-link" aria-disabled={submitting}>
            Create an account
          </a>
        </div>

        <div className="auth-alt auth-alt--secondary">
          <a
            href="/forgot-password"
            className="btn-link btn-link--secondary"
            aria-disabled={submitting}
          >
            Forgot your password?
          </a>
        </div>
        </div>
      </div>
    </div>
  );
}
