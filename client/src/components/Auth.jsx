
import { useState } from "react";

const API_URL = "http://localhost:5000/api/auth";

function Auth({ user, onLogin, onLogout }) {
  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const endpoint =
        mode === "register" ? "/register" : "/login";

      const payload =
        mode === "register"
          ? {
              fullName: form.fullName.trim(),
              email: form.email.trim(),
              password: form.password,
              university: "FAST Islamabad",
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
        setMessage(
          "Account created! You can now log in. Email verification will be added later."
        );

        setMode("login");
        setForm({
          fullName: "",
          email: form.email,
          password: "",
        });
      } else {
        onLogin(data.user, data.token);
        setForm({
          fullName: "",
          email: "",
          password: "",
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
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
            placeholder="your-id@nu.edu.pk"
            autoComplete="email"
            required
          />
        </label>

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

      <p className="auth-footnote">
        Currently available for FAST Islamabad students.
        University email ownership verification is coming soon.
      </p>
    </section>
  );
}

export default Auth;
