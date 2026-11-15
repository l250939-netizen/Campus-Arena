
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config";

const API_URL = `${API_BASE_URL}/api/auth`;

function Auth({ user, onLogin, onLogout, onEmailVerified }) {
  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    gender: "Prefer not to say",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const verificationLinkHandled = useRef(false);

  const completeVerification = useCallback(async (token) => {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not verify this email.");
      }

      setVerificationToken("");
      setMessage(data.message || "Email verified successfully. You can now log in.");
      onEmailVerified?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [onEmailVerified]);

  useEffect(() => {
    if (verificationLinkHandled.current || window.location.pathname !== "/verify-email") {
      return;
    }

    verificationLinkHandled.current = true;
    const token = new URLSearchParams(window.location.search).get("token");
    window.history.replaceState({}, document.title, "/");

    if (!token) {
      const timer = window.setTimeout(() => {
        setError("This verification link is missing its token. Request another email.");
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      completeVerification(token);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [completeVerification]);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setError("");
    setForm({
      fullName: "",
      email: "",
      password: "",
      gender: "Prefer not to say",
    });
  }

  async function handleResendVerification() {
    if (!user || !user.email) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not resend verification email.");
      }

      setMessage(data.message || "Verification email sent.");
      setVerificationToken(data.verificationToken || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const endpoint = mode === "register" ? "/register" : "/login";

      const payload =
        mode === "register"
          ? {
              fullName: form.fullName.trim(),
              email: form.email.trim(),
              password: form.password,
              confirmPassword: form.password,
              university: "FAST Islamabad",
              gender: form.gender,
            }
          : {
              email: form.email.trim(),
              password: form.password,
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      if (mode === "register") {
        setMessage(data.message || "Account created. Please verify your email.");
        setVerificationToken(data.verificationToken || "");

        setMode("login");
        setForm({
          fullName: "",
          email: form.email,
          password: "",
          gender: "Prefer not to say",
        });
      } else {
        onLogin(data.user, data.token);
        setForm({
          fullName: "",
          email: "",
          password: "",
          gender: "Prefer not to say",
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderLocalVerification() {
    if (!verificationToken) {
      return null;
    }

    return (
      <div className="verification-token">
        <p>Development verification token</p>
        <code>{verificationToken}</code>
        <button
          type="button"
          className="secondary-action"
          onClick={() => completeVerification(verificationToken)}
          disabled={submitting}
        >
          {submitting ? "Verifying..." : "Verify email"}
        </button>
      </div>
    );
  }

  if (user) {
    return (
      <section className="auth-panel">
        <p className="auth-eyebrow">YOUR ACCOUNT</p>
        <h2>Welcome, {user.fullName}!</h2>
        <p>{user.email}</p>

        <p className="verification-note">
          Email verification:{" "}
          {user.emailVerified ? "Verified" : "Not verified yet"}
        </p>

        {!user.emailVerified && (
          <button
            type="button"
            className="secondary-action"
            onClick={handleResendVerification}
            disabled={submitting}
          >
            {submitting ? "Sending..." : "Send verification email"}
          </button>
        )}

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
        {renderLocalVerification()}

        <button
          type="button"
          className="auth-submit"
          onClick={onLogout}
        >
          Log out
        </button>
      </section>
    );
  }

  return (
    <section className="auth-panel" id="account">
      <p className="auth-eyebrow">JOIN THE ARENA</p>

      <h2>
        {mode === "register"
          ? "Create your CampusArena account"
          : "Welcome back"}
      </h2>

      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => switchMode("login")}
        >
          Log in
        </button>

        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => switchMode("register")}
        >
          Register
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "register" && (
          <label>
            Full name
            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={updateForm}
              placeholder="Your full name"
              minLength={2}
              maxLength={100}
              autoComplete="name"
              required
            />
          </label>
        )}

        <label>
          University email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={updateForm}
            placeholder="your-id@isb.nu.edu.pk"
            autoComplete="email"
            required
          />
        </label>

        {mode === "register" && (
          <label>
            Gender
            <select
              name="gender"
              value={form.gender}
              onChange={updateForm}
            >
              <option value="Prefer not to say">Prefer not to say</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </label>
        )}

        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={updateForm}
            placeholder="At least 8 characters"
            minLength={mode === "register" ? 8 : undefined}
            maxLength={128}
            autoComplete={
              mode === "register"
                ? "new-password"
                : "current-password"
            }
            required
          />
        </label>

        <button
          className="auth-submit"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Please wait..."
            : mode === "register"
              ? "Create account →"
              : "Log in →"}
        </button>
      </form>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
      {renderLocalVerification()}

      <p className="auth-footnote">
        Currently available for FAST Islamabad students. Email verification is required before creating or joining campus sessions.
      </p>
    </section>
  );
}

export default Auth;
