import Auth from "./components/Auth";
import { useEffect, useState } from "react";
import "./App.css";

const categories = [
  "Futsal",
  "Cricket",
  "Basketball",
  "Tennis",
  "Table Tennis",
  "Badminton",
  "Volleyball",
  "Cards",
  "FIFA",
  "Tekken",
  "Study Session",
];

const initialForm = {
  title: "",
  category: "Futsal",
  audience: "All",
  location: "",
  startTime: "",
  durationMinutes: 60,
  maxParticipants: 10,
  topic: "",
  department: "",
  batch: "",
};


function SessionCountdown({ session }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const startTime = new Date(session.startTime).getTime();
  const endTime =
    startTime + Number(session.durationMinutes) * 60 * 1000;

  function formatTime(milliseconds) {
    const totalSeconds = Math.max(
      0,
      Math.floor(milliseconds / 1000)
    );

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const clock = [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":");

    return days > 0 ? `${days}d ${clock}` : clock;
  }

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return <p className="session-countdown">Time unavailable</p>;
  }

  if (now < startTime) {
    return (
      <p className="session-countdown upcoming">
        Starts in: {formatTime(startTime - now)}
      </p>
    );
  }

  if (now < endTime) {
    return (
      <p className="session-countdown in-progress">
        In progress · Ends in: {formatTime(endTime - now)}
      </p>
    );
  }

  return (
    <p className="session-countdown completed">
      Session completed
    </p>
  );
}


function App() {
  const [sessions, setSessions] = useState([]);
  
const [sessionReviews, setSessionReviews] = useState({});
const [reviewForms, setReviewForms] = useState({});

const [mySessionReviews, setMySessionReviews] = useState({});

  const [form, setForm] = useState(initialForm);
  const [mySessions, setMySessions] = useState([]);
const [mySessionsLoading, setMySessionsLoading] = useState(false);
const [mySessionsError, setMySessionsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

const [user, setUser] = useState(null);
const [authToken, setAuthToken] = useState(null);
const [editingSession, setEditingSession] = useState(null);
const [editForm, setEditForm] = useState({});
const [sessionToCancel, setSessionToCancel] = useState(null);
const [savingEdit, setSavingEdit] = useState(false);

function handleLogin(loggedInUser, token) {
  setUser(loggedInUser);
  setAuthToken(token);
  loadMySessions(token);
}

function handleLogout() {
  setUser(null);
  setAuthToken(null);
  setMySessions([]);
  setMySessionsError("");
}


async function loadSessionReviews(sessionId) {
  try {
    const response = await fetch(
      `http://localhost:5000/api/reviews/session/${sessionId}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load reviews.");
    }

    setSessionReviews((previous) => ({
      ...previous,
      [sessionId]: data,
    }));
  } catch (error) {
    console.error("Load reviews error:", error);
  }
}


async function loadMySessionReview(sessionId) {
  if (!authToken) return;

  try {
    const response = await fetch(
      `http://localhost:5000/api/reviews/session/${sessionId}/mine`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load your review.");
    }

    setMySessionReviews((previous) => ({
      ...previous,
      [sessionId]: data.review,
    }));
  } catch (error) {
    console.error("Load my review error:", error);
  }
}


async function submitSessionReview(event, sessionId) {
  event.preventDefault();

  if (!authToken) {
    setError("Please log in to submit a review.");
    return;
  }

  const reviewForm = reviewForms[sessionId] || {
    rating: 5,
    comment: "",
  };

  try {
    const response = await fetch(
      `http://localhost:5000/api/reviews/session/${sessionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not submit review.");
    }

    setSuccess("Review submitted successfully!");

    setReviewForms((previous) => ({
      ...previous,
      [sessionId]: { rating: 5, comment: "" },
    }));

    await loadSessionReviews(sessionId);
    await loadMySessionReview(sessionId);
  } catch (error) {
    setError(error.message);
  }
}



  async function loadSessions() {
    try {
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/sessions"
      );

      if (!response.ok) {
        throw new Error("Failed to load Sessions");
      }

      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }


  async function loadMySessions(token) {
  if (!token) {
    setMySessions([]);
    return;
  }

  setMySessionsLoading(true);
  setMySessionsError("");

  try {
    const response = await fetch(
      "http://localhost:5000/api/sessions/my",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load your Sessions");
    }

    setMySessions(Array.isArray(data) ? data : []);
  } catch (err) {
    setMySessionsError(err.message);
  } finally {
    setMySessionsLoading(false);
  }
}

  useEffect(() => {
    loadSessions();
  }, []);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function createSession(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        audience: form.audience,
        location: form.location.trim(),
        startTime: new Date(form.startTime).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        maxParticipants: Number(form.maxParticipants),
      };

      if (form.category === "Study Session") {
        payload.studyDetails = {
          topic: form.topic.trim(),
          department: form.department.trim(),
          batch: form.batch.trim(),
        };
      }

      const response = await fetch(
        "http://localhost:5000/api/sessions",
        {
          method: "POST",
          headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${authToken}`,
},
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message);
      }

      setSuccess("Session created successfully!");
      setForm(initialForm);

      await loadMySessions(authToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  
async function joinSession(sessionId) {
  if (!authToken) {
    setError("Please log in to join a Session.");
    return;
  }

  setError("");
  setSuccess("");

  try {
    const response = await fetch(
      `http://localhost:5000/api/sessions/${sessionId}/join`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to join Session.");
    }

    setSuccess(data.message);
    await loadSessions();
    await loadMySessions(authToken);
  } catch (err) {
    setError(err.message);
  }
}

  
  const startEditSession = (session) => {
    const date = new Date(session.startTime);
    const localDateTime = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setEditingSession(session);
    setEditForm({
      title: session.title || "",
      category: session.category || "Futsal",
      audience: session.audience || "All",
      location: session.location || "",
      startTime: localDateTime,
      durationMinutes: session.durationMinutes || 60,
      maxParticipants: session.maxParticipants || 2,
      topic: session.studyDetails?.topic || "",
      department: session.studyDetails?.department || "",
      batch: session.studyDetails?.batch || ""
    });

    setError("");
    setSuccess("");
  };

  const updateEditForm = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const saveEditedSession = async (event) => {
    event.preventDefault();

    if (!editingSession || !authToken) return;

    if (
      !editForm.title.trim() ||
      !editForm.location.trim() ||
      !editForm.startTime
    ) {
      setError("Please fill in the title, location, and date/time.");
      return;
    }

    const participantCount =
      1 + (editingSession.participants?.length || 0);

    if (Number(editForm.maxParticipants) < participantCount) {
      setError(
        `The participant limit cannot be less than ${participantCount}.`
      );
      return;
    }

    setSavingEdit(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: editForm.title.trim(),
        category: editForm.category,
        audience: editForm.audience,
        location: editForm.location.trim(),
        startTime: new Date(editForm.startTime).toISOString(),
        durationMinutes: Number(editForm.durationMinutes),
        maxParticipants: Number(editForm.maxParticipants),
        studyDetails:
          editForm.category === "Study Session"
            ? {
                topic: editForm.topic.trim(),
                department: editForm.department.trim(),
                batch: editForm.batch.trim()
              }
            : {
                topic: "",
                department: "",
                batch: ""
              }
      };

      const response = await fetch(
        `http://localhost:5000/api/sessions/${editingSession._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update Session.");
      }

      setEditingSession(null);
      setSuccess("Session updated successfully!");
      await loadSessions();
      await loadMySessions(authToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const cancelSession = async () => {
    if (!sessionToCancel || !authToken) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `http://localhost:5000/api/sessions/${sessionToCancel._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel Session.");
      }

      setSessionToCancel(null);
      setSuccess("Session cancelled successfully!");
      await loadSessions();
      await loadMySessions(authToken);
    } catch (err) {
      setError(err.message);
    }
  };




  


  return (
    <main>
      <header className="site-header">
        <span className="brand">CampusArena.</span>
        <span className="header-tag">FAST Islamabad</span>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR CAMPUS. YOUR ARENA.</p>
        <h1>Find your people. Start a Session.</h1>
        <p>
          From Futsal and Badminton to FIFA and Study Sessions,
          there's always something happening on campus.
        </p>
        <a href="#create" className="primary-link">
          Create a Session →
        </a>
      </section>
      
      <Auth
  user={user}
  onLogin={handleLogin}
  onLogout={handleLogout}
/>
      <section id="create" className="create-section">
        <h2>Create a Session</h2>
        <p>Bring people together around something you enjoy.</p>

        <form onSubmit={createSession} className="session-form">
          <label>
            Session title
            <input
              name="title"
              value={form.title}
              onChange={updateForm}
              placeholder="e.g. Friday Futsal"
              required
            />
          </label>

          <label>
            Category
            <select
              name="category"
              value={form.category}
              onChange={updateForm}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="audience-fieldset">
            <legend>Who can join?</legend>

            <div className="audience-buttons">
              {["All", "Girls only"].map((audience) => (
                <button
                  key={audience}
                  type="button"
                  className={
                    form.audience === audience ? "selected" : ""
                  }
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      audience,
                    }))
                  }
                  aria-pressed={form.audience === audience}
                >
                  {audience}
                </button>
              ))}
            </div>
          </fieldset>

          <label>
            Location
            <input
              name="location"
              value={form.location}
              onChange={updateForm}
              placeholder="e.g. Sports Ground"
              required
            />
          </label>

          <label>
            Date and time
            <input
              type="datetime-local"
              name="startTime"
              value={form.startTime}
              onChange={updateForm}
              required
            />
          </label>

          <label>
            Duration (minutes)
            <input
              type="number"
              name="durationMinutes"
              min="15"
              value={form.durationMinutes}
              onChange={updateForm}
              required
            />
          </label>

          <label>
            Maximum participants
            <input
              type="number"
              name="maxParticipants"
              min="2"
              value={form.maxParticipants}
              onChange={updateForm}
              required
            />
          </label>

          {form.category === "Study Session" && (
            <div className="study-fields">
              <h3>Study Session details</h3>

              <label>
                Topic / note
                <input
                  name="topic"
                  value={form.topic}
                  onChange={updateForm}
                  required
                />
              </label>

              <label>
                Department
                <input
                  name="department"
                  value={form.department}
                  onChange={updateForm}
                  placeholder="e.g. Computer Science"
                  required
                />
              </label>

              <label>
                Batch
                <input
                  name="batch"
                  value={form.batch}
                  onChange={updateForm}
                  placeholder="e.g. 2024"
                  required
                />
              </label>
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Session →"}
          </button>
        </form>

        {success && <p className="success-message">{success}</p>}
        {error && <p className="error-message">{error}</p>}
      </section>
      {user && (
  <section className="explore-section">
    <h2>My Sessions</h2>
    <p>Challenges you've created on campus.</p>

    {mySessionsLoading && <p>Loading your Sessions...</p>}

    {mySessionsError && (
      <p className="error-message">{mySessionsError}</p>
    )}

    {!mySessionsLoading &&
      !mySessionsError &&
      mySessions.length === 0 && (
        <p>You haven't created any Sessions yet.</p>
      )}

    
<div className="sessions-grid">
  {mySessions.map((session) => (
    <article key={session._id} className="session-card">
      <span className="category-pill">{session.category}</span>
      <h3>{session.title}</h3>
      <p>📍 {session.location}</p>
      <p>🗓 {new Date(session.startTime).toLocaleString()}</p>
      <p>⏱ {session.durationMinutes} minutes</p>
      <span className="audience-pill">{session.audience}</span>

      <div className="session-actions">
        <button
          type="button"
          className="submit-button"
          onClick={() => startEditSession(session)}
        >
          ✏️ Edit Session
        </button>

        <button
          type="button"
          className="cancel-button"
          onClick={() => setSessionToCancel(session)}
        >
          ✕ Cancel Session
        </button>
      </div>
    </article>
  ))}
</div>


    
  </section>
)}


{editingSession && (
  <div
    className="modal-backdrop"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget && !savingEdit) {
        setEditingSession(null);
        setError("");
      }
    }}
  >
    <section
      className="session-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-session-heading"
    >
      <div className="modal-heading">
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h2 id="edit-session-heading">Edit Session</h2>
          <p>Update your campus plans.</p>
        </div>

        <button
          type="button"
          className="modal-close"
          aria-label="Close edit form"
          disabled={savingEdit}
          onClick={() => {
            setEditingSession(null);
            setError("");
          }}
        >
          ✕
        </button>
      </div>

      <form className="edit-session-form" onSubmit={saveEditedSession}>
        <label>
          Session title
          <input
            name="title"
            value={editForm.title}
            onChange={updateEditForm}
            placeholder="e.g. Friday Futsal"
            required
          />
        </label>

        <label>
          Category
          <select
            name="category"
            value={editForm.category}
            onChange={updateEditForm}
            required
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="edit-audience-fieldset">
          <legend>Who can join?</legend>
          <div className="edit-audience-options">
            {["All", "Girls only"].map((audience) => (
              <button
                key={audience}
                type="button"
                className={
                  editForm.audience === audience ? "selected" : ""
                }
                onClick={() =>
                  setEditForm((previous) => ({
                    ...previous,
                    audience
                  }))
                }
                aria-pressed={editForm.audience === audience}
              >
                {audience}
              </button>
            ))}
          </div>
        </fieldset>

        <label>
          Location
          <input
            name="location"
            value={editForm.location}
            onChange={updateEditForm}
            placeholder="e.g. Sports Ground"
            required
          />
        </label>

        <label>
          Date and time
          <input
            type="datetime-local"
            name="startTime"
            value={editForm.startTime}
            onChange={updateEditForm}
            required
          />
        </label>

        <div className="edit-form-row">
          <label>
            Duration (minutes)
            <input
              type="number"
              name="durationMinutes"
              min="15"
              value={editForm.durationMinutes}
              onChange={updateEditForm}
              required
            />
          </label>

          <label>
            Maximum participants
            <input
              type="number"
              name="maxParticipants"
              min="2"
              value={editForm.maxParticipants}
              onChange={updateEditForm}
              required
            />
          </label>
        </div>

        {editForm.category === "Study Session" && (
          <div className="edit-study-fields">
            <h3>Study Session details</h3>

            <label>
              Topic / note
              <input
                name="topic"
                value={editForm.topic}
                onChange={updateEditForm}
                required
              />
            </label>

            <label>
              Department
              <input
                name="department"
                value={editForm.department}
                onChange={updateEditForm}
                required
              />
            </label>

            <label>
              Batch
              <input
                name="batch"
                value={editForm.batch}
                onChange={updateEditForm}
                required
              />
            </label>
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="modal-secondary-button"
            disabled={savingEdit}
            onClick={() => {
              setEditingSession(null);
              setError("");
            }}
          >
            Discard
          </button>

          <button
            type="submit"
            className="submit-button"
            disabled={savingEdit}
          >
            {savingEdit ? "Saving..." : "Save Changes →"}
          </button>
        </div>
      </form>
    </section>
  </div>
)}



{sessionToCancel && (
  <div className="modal-backdrop">
    <section
      className="session-modal cancel-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-session-heading"
    >
      <div className="modal-heading">
        <div>
          <p className="eyebrow">PLEASE CONFIRM</p>
          <h2 id="cancel-session-heading">Cancel Session?</h2>
          <p>
            Are you sure you want to cancel{" "}
            <strong>{sessionToCancel.title}</strong>? This action
            cannot be undone.
          </p>
        </div>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="modal-secondary-button"
          onClick={() => setSessionToCancel(null)}
        >
          Keep Session
        </button>

        <button
          type="button"
          className="cancel-button"
          onClick={cancelSession}
        >
          Yes, Cancel Session
        </button>
      </div>
    </section>
  </div>
)}

      <section className="explore-section">
        <h2>Explore Sessions</h2>
        <p>See what's happening around campus.</p>

        {loading && <p>Loading Sessions...</p>}

        {!loading && sessions.length === 0 && (
          <p>No Sessions yet. Be the first to create one!</p>
        )}

        <div className="sessions-grid">
          {sessions.map((session) => (
            <article key={session._id} className="session-card">
              <span className="category-pill">{session.category}</span>

              <h3>{session.title}</h3>

              <p>📍 {session.location}</p>

              <p>
                🗓 {new Date(session.startTime).toLocaleString()}
              </p>

              <p>⏱ {session.durationMinutes} minutes</p>

              <SessionCountdown session={session} />

              {new Date() >=
  new Date(session.startTime).getTime() +
    Number(session.durationMinutes) * 60 * 1000 && (
  <div className="session-reviews">
    <h3>Session Reviews</h3>

    {sessionReviews[session._id] === undefined ? (
      <button
        type="button"
        onClick={() => loadSessionReviews(session._id)}
      >
        Load Reviews
      </button>
    ) : sessionReviews[session._id].length === 0 ? (
      <p>No reviews yet. Be the first to share your experience!</p>
    ) : (
      <div className="review-list">
        {sessionReviews[session._id].map((review) => (
          <div className="review-item" key={review._id}>
            <strong>{review.reviewer?.fullName || "Student"}</strong>
            <p className="review-stars">
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </p>
            {review.comment && <p>{review.comment}</p>}
          </div>
        ))}
      </div>
    )}

    
{authToken && (
  <>
    {mySessionReviews[session._id] === undefined ? (
      <button
        type="button"
        onClick={() => loadMySessionReview(session._id)}
      >
        Check Review Eligibility
      </button>
    ) : mySessionReviews[session._id] ? (
      <p className="review-status">
        You have already reviewed this session.
      </p>
    ) : session.createdBy === user?._id ||
      session.createdBy?._id === user?._id ? (
      <p className="review-status">
        You cannot review your own session.
      </p>
    ) : !(session.participants || []).some(
      (participant) =>
        (typeof participant === "string"
          ? participant
          : participant?._id) === user?._id
    ) ? (
      <p className="review-status">
        Join this session to become eligible to review it.
      </p>
    ) : (
      <form
        className="review-form"
        onSubmit={(event) =>
          submitSessionReview(event, session._id)
        }
      >
        <label htmlFor={`rating-${session._id}`}>
          Your rating
        </label>

        <select
          id={`rating-${session._id}`}
          value={reviewForms[session._id]?.rating ?? 5}
          onChange={(event) =>
            setReviewForms((previous) => ({
              ...previous,
              [session._id]: {
                rating: Number(event.target.value),
                comment: previous[session._id]?.comment ?? "",
              },
            }))
          }
        >
          <option value={5}>★★★★★ — Excellent</option>
          <option value={4}>★★★★☆ — Very good</option>
          <option value={3}>★★★☆☆ — Good</option>
          <option value={2}>★★☆☆☆ — Fair</option>
          <option value={1}>★☆☆☆☆ — Poor</option>
        </select>

        <label htmlFor={`comment-${session._id}`}>
          Feedback (optional)
        </label>

        <textarea
          id={`comment-${session._id}`}
          maxLength={500}
          rows={3}
          placeholder="How was your experience?"
          value={reviewForms[session._id]?.comment ?? ""}
          onChange={(event) =>
            setReviewForms((previous) => ({
              ...previous,
              [session._id]: {
                rating: previous[session._id]?.rating ?? 5,
                comment: event.target.value,
              },
            }))
          }
        />

        <button type="submit">Submit Review</button>
      </form>
    )}
  </>
)}

  </div>
)}

              <p>👥 Maximum {session.maxParticipants} participants</p>

              <span className="audience-pill">{session.audience}</span>
              
<p>
  👥 {1 + (session.participants?.length || 0)} /{" "}
  {session.maxParticipants} participants
</p>

{user && session.createdBy !== user._id && (
  <button
    type="button"
    className="submit-button"
    disabled={
      (session.participants?.length || 0) >=
      session.maxParticipants - 1
    }
    onClick={() => joinSession(session._id)}
  >
    {(session.participants || []).includes(user._id)
      ? "Joined ✓"
      : (session.participants?.length || 0) >=
          session.maxParticipants - 1
        ? "Session Full"
        : "Join Session →"}
  </button>
)}


              {session.category === "Study Session" &&
                session.studyDetails && (
                  <div className="study-info">
                    <p>Topic: {session.studyDetails.topic}</p>
                    <p>
                      {session.studyDetails.department} ·{" "}
                      {session.studyDetails.batch}
                    </p>
                  </div>
                )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
