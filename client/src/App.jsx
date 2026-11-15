import Auth from "./components/Auth";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "./config";
import "./App.css";

// Rewards are paused on main. Restore from the feature/rewards branch.

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

const defaultCarpoolForm = {
  journeyType: "From Uni",
  startingLocation: "",
  destination: "",
  stops: "",
  journeyDate: "",
  departureTime: "",
  transportType: "Car",
  seatsAvailable: "",
  fareType: "Set Fare",
  fareAmount: "",
  notes: "",
  passengerPreference: "Anyone",
};


function SessionCountdown({ session }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setNow(Date.now()));
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, []);

  if (now === null) {
    return <p className="session-countdown">Loading countdown...</p>;
  }

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
// const [leaderboard, setLeaderboard] = useState([]);
function handleLogin(userData, token) {
  setUser(userData);
  setAuthToken(token);
}
function handleEmailVerified(userData) {
  setUser((previous) => (previous ? { ...previous, ...userData } : previous));
}
// const [finalizingRewards, setFinalizingRewards] = useState({});
const [editingSession, setEditingSession] = useState(null);
const [editForm, setEditForm] = useState({});
const [sessionToCancel, setSessionToCancel] = useState(null);
const [savingEdit, setSavingEdit] = useState(false);
const [carpools, setCarpools] = useState([]);
const [myCarpools, setMyCarpools] = useState([]);
const [carpoolForm, setCarpoolForm] = useState(defaultCarpoolForm);
const [carpoolJourney, setCarpoolJourney] = useState("From Uni");
const [carpoolLoading, setCarpoolLoading] = useState(false);
const [carpoolSubmitting, setCarpoolSubmitting] = useState(false);
const [carpoolError, setCarpoolError] = useState("");
const [carpoolSuccess, setCarpoolSuccess] = useState("");
const [editingCarpool, setEditingCarpool] = useState(null);

function handleLogout() {
  setUser(null);
  setAuthToken(null);
  setMySessions([]);
  setMySessionsError("");
}

const loadProfile = useCallback(async (token) => {
  if (!token) {
    setUser(null);
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load profile.");
    }

    setUser((previous) => ({ ...(previous || {}), ...data.user }));
  } catch (error) {
    console.error("Load profile error:", error);
  }
}, []);

/*
async function loadLeaderboard(token) {
  if (!REWARDS_ENABLED || !token) {
    setLeaderboard([]);
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/leaderboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load leaderboard.");
    }

    setLeaderboard(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Load leaderboard error:", error);
  }
}
*/

async function loadSessionReviews(sessionId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/reviews/session/${sessionId}`
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
      `${API_BASE_URL}/api/reviews/session/${sessionId}/mine`,
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
      `${API_BASE_URL}/api/reviews/session/${sessionId}`,
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



  const loadSessions = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/sessions`
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
  }, []);

  const loadCarpools = useCallback(async () => {
    try {
      setCarpoolError("");
      setCarpoolLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/carpools?journeyType=${encodeURIComponent(carpoolJourney)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load carpools.");
      }

      setCarpools(Array.isArray(data) ? data : []);
    } catch (err) {
      setCarpoolError(err.message);
      setCarpools([]);
    } finally {
      setCarpoolLoading(false);
    }
  }, [carpoolJourney]);

  const loadMyCarpools = useCallback(async (token) => {
    if (!token) {
      setMyCarpools([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/carpools/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load your carpools.");
      }

      setMyCarpools(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load my carpools error:", err);
    }
  }, []);


  async function loadMySessions(token) {
  if (!token) {
    setMySessions([]);
    return;
  }

  setMySessionsLoading(true);
  setMySessionsError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/sessions/my`,
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
    const timer = window.setTimeout(() => {
      loadSessions();
      loadCarpools();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSessions, loadCarpools]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (authToken) {
        loadProfile(authToken);
        loadMyCarpools(authToken);
      } else {
        setMyCarpools([]);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authToken, loadProfile, loadMyCarpools]);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function updateCarpoolForm(event) {
    const { name, value } = event.target;

    setCarpoolForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function createCarpool(event) {
    event.preventDefault();

    if (!authToken) {
      setCarpoolError("Please log in to create a carpool.");
      return;
    }

    const safeStops = carpoolForm.stops
      .split(",")
      .map((stop) => stop.trim())
      .filter(Boolean);

    const payload = {
      journeyType: carpoolJourney,
      startingLocation: carpoolForm.startingLocation.trim(),
      destination:
        carpoolJourney === "From Uni"
          ? carpoolForm.destination.trim() || "FAST Islamabad Campus"
          : "FAST Islamabad Campus",
      stops: safeStops,
      journeyDate: carpoolForm.journeyDate,
      departureTime: carpoolForm.departureTime,
      transportType: carpoolForm.transportType,
      seatsAvailable:
        carpoolForm.transportType === "Car"
          ? Number(carpoolForm.seatsAvailable || 0)
          : 0,
      fareType: carpoolForm.fareType,
      fareAmount:
        carpoolForm.fareType === "Set Fare"
          ? Number(carpoolForm.fareAmount || 0)
          : 0,
      notes: carpoolForm.notes.trim(),
      passengerPreference: carpoolForm.passengerPreference,
    };

    if (!payload.startingLocation || !payload.destination || !payload.journeyDate || !payload.departureTime) {
      setCarpoolError("Please fill in the required carpool fields.");
      return;
    }

    if (payload.transportType === "Car" && payload.seatsAvailable < 1) {
      setCarpoolError("Carpool seats are required when choosing Car.");
      return;
    }

    if (payload.fareType === "Set Fare" && payload.fareAmount <= 0) {
      setCarpoolError("Set a valid fare amount.");
      return;
    }

    setCarpoolSubmitting(true);
    setCarpoolError("");
    setCarpoolSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/carpools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create carpool.");
      }

      setCarpoolSuccess("Carpool published successfully.");
      setCarpoolForm({ ...defaultCarpoolForm, journeyType: carpoolJourney });
      await loadCarpools();
      await loadMyCarpools(authToken);
    } catch (err) {
      setCarpoolError(err.message);
    } finally {
      setCarpoolSubmitting(false);
    }
  }

  async function requestCarpoolJoin(carpoolId) {
    if (!authToken) {
      setCarpoolError("Please log in to request a carpool.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/carpools/${carpoolId}/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not request to join this carpool.");
      }

      setCarpoolSuccess(data.message || "Join request sent successfully.");
      await loadCarpools();
      await loadMyCarpools(authToken);
    } catch (err) {
      setCarpoolError(err.message);
    }
  }

  async function decideCarpoolRequest(carpoolId, requestId, status) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/carpools/${carpoolId}/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update request.");
      }

      setCarpoolSuccess(data.message || "Request updated.");
      await loadCarpools();
      await loadMyCarpools(authToken);
    } catch (err) {
      setCarpoolError(err.message);
    }
  }

  async function cancelCarpool(carpoolId) {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/carpools/${carpoolId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not cancel carpool.");
      }

      setCarpoolSuccess(data.message || "Carpool cancelled.");
      await loadCarpools();
      await loadMyCarpools(authToken);
    } catch (err) {
      setCarpoolError(err.message);
    }
  }

  function startEditCarpool(carpool) {
    setEditingCarpool(carpool);
    setCarpoolForm({
      journeyType: carpool.journeyType,
      startingLocation: carpool.startingLocation || "",
      destination: carpool.destination || "",
      stops: (carpool.stops || []).join(", "),
      journeyDate: carpool.journeyDate ? new Date(carpool.journeyDate).toISOString().slice(0, 10) : "",
      departureTime: carpool.departureTime || "",
      transportType: carpool.transportType || "Car",
      seatsAvailable: carpool.seatsAvailable || "",
      fareType: carpool.fareType || "Set Fare",
      fareAmount: carpool.fareAmount || "",
      notes: carpool.notes || "",
      passengerPreference: carpool.passengerPreference || "Anyone",
    });
    setCarpoolJourney(carpool.journeyType);
  }

  async function saveEditedCarpool(event) {
    event.preventDefault();

    if (!editingCarpool || !authToken) return;

    const updatedPayload = {
      journeyType: carpoolForm.journeyType,
      startingLocation: carpoolForm.startingLocation.trim(),
      destination:
        carpoolForm.journeyType === "From Uni"
          ? carpoolForm.destination.trim() || "FAST Islamabad Campus"
          : "FAST Islamabad Campus",
      stops: carpoolForm.stops
        .split(",")
        .map((stop) => stop.trim())
        .filter(Boolean),
      journeyDate: carpoolForm.journeyDate,
      departureTime: carpoolForm.departureTime,
      transportType: carpoolForm.transportType,
      seatsAvailable: Number(carpoolForm.seatsAvailable || 0),
      fareType: carpoolForm.fareType,
      fareAmount: Number(carpoolForm.fareAmount || 0),
      notes: carpoolForm.notes.trim(),
      passengerPreference: carpoolForm.passengerPreference,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/carpools/${editingCarpool._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(updatedPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update carpool.");
      }

      setEditingCarpool(null);
      setCarpoolSuccess("Carpool updated successfully.");
      await loadCarpools();
      await loadMyCarpools(authToken);
    } catch (err) {
      setCarpoolError(err.message);
    }
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
        `${API_BASE_URL}/api/sessions`,
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
      `${API_BASE_URL}/api/sessions/${sessionId}/join`,
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
        `${API_BASE_URL}/api/sessions/${editingSession._id}`,
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
        `${API_BASE_URL}/api/sessions/${sessionToCancel._id}`,
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

  /*
  const finalizeRewards = async (sessionId) => {
    if (!REWARDS_ENABLED || !authToken) return;

    setFinalizingRewards((previous) => ({ ...previous, [sessionId]: true }));
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rewards/session/${sessionId}/claim`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not finalize rewards.");
      }

      setSuccess(data.message || "Rewards finalized successfully!");
      await loadSessions();
      await loadMySessions(authToken);
      await loadProfile(authToken);
      await loadLeaderboard(authToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setFinalizingRewards((previous) => ({ ...previous, [sessionId]: false }));
    }
  };
  */

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
  onEmailVerified={handleEmailVerified}
  onLogout={handleLogout}
/>

      {user && (
        <section className="profile-section">
          <div className="profile-card">
            <p className="auth-eyebrow">PROFILE</p>
            <h2>{user.fullName}</h2>
            <p>{user.email}</p>
            <div className="profile-stats">
              {/*
              <div>
                <span className="stat-label">Merit points</span>
                <strong>{user.meritPoints ?? 0}</strong>
              </div>
              */}
              <div>
                <span className="stat-label">Verification</span>
                <strong>{user.emailVerified ? "Verified" : "Pending"}</strong>
              </div>
            </div>
          </div>

          {/*
          <div className="leaderboard-card">
            <p className="auth-eyebrow">LEADERBOARD</p>
            <h2>Top campus contributors</h2>
            {leaderboard.length === 0 ? (
              <p className="empty-state">No merit points yet. Join a session to get started.</p>
            ) : (
              <ol className="leaderboard-list">
                {leaderboard.map((entry) => (
                  <li key={entry.id} className="leaderboard-item">
                    <span className="rank-badge">#{entry.rank}</span>
                    <div>
                      <strong>{entry.fullName}</strong>
                      <small>{entry.emailVerified ? "Verified" : "Awaiting verification"}</small>
                    </div>
                    <span className="points-pill">{entry.meritPoints} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          */}
        </section>
      )}

      <section className="carpool-section">
        <div className="carpool-header">
          <div>
            <p className="auth-eyebrow">CAMPUS CARPOOL</p>
            <h2>From Uni &amp; To Uni rides</h2>
          </div>

          <div className="journey-tabs">
            {[
              "From Uni",
              "To Uni",
            ].map((journey) => (
              <button
                key={journey}
                type="button"
                className={carpoolJourney === journey ? "active" : ""}
                onClick={() => {
                  setCarpoolJourney(journey);
                  setCarpoolForm((previous) => ({
                    ...previous,
                    journeyType: journey,
                    destination:
                      journey === "To Uni" ? "FAST Islamabad Campus" : previous.destination || "",
                  }));
                }}
              >
                {journey}
              </button>
            ))}
          </div>
        </div>

        <div className="carpool-layout">
          <form className="carpool-form" onSubmit={createCarpool}>
            <div className="carpool-form-row">
              <label>
                Starting location
                <input
                  type="text"
                  name="startingLocation"
                  value={carpoolForm.startingLocation}
                  onChange={updateCarpoolForm}
                  placeholder={carpoolJourney === "From Uni" ? "Main Gate, Library, Sports Complex" : "Hostel, Sector, Landmark"}
                  required
                />
              </label>

              <label>
                Destination
                <input
                  type="text"
                  name="destination"
                  value={
                    carpoolJourney === "To Uni"
                      ? "FAST Islamabad Campus"
                      : carpoolForm.destination
                  }
                  onChange={updateCarpoolForm}
                  placeholder="Where are you heading?"
                  readOnly={carpoolJourney === "To Uni"}
                  required
                />
              </label>
            </div>

            <div className="carpool-form-row">
              <label>
                Stops (optional)
                <input
                  type="text"
                  name="stops"
                  value={carpoolForm.stops}
                  onChange={updateCarpoolForm}
                  placeholder="Comma separated stops"
                />
              </label>

              <label>
                Journey date
                <input
                  type="date"
                  name="journeyDate"
                  value={carpoolForm.journeyDate}
                  onChange={updateCarpoolForm}
                  required
                />
              </label>
            </div>

            <div className="carpool-form-row">
              <label>
                Departure time
                <input
                  type="time"
                  name="departureTime"
                  value={carpoolForm.departureTime}
                  onChange={updateCarpoolForm}
                  required
                />
              </label>

              <label>
                Transport type
                <select
                  name="transportType"
                  value={carpoolForm.transportType}
                  onChange={updateCarpoolForm}
                >
                  <option value="Bike">Bike</option>
                  <option value="Car">Car</option>
                  <option value="Split InDrive">Split InDrive</option>
                </select>
              </label>
            </div>

            {carpoolForm.transportType === "Car" && (
              <label>
                Seats available
                <input
                  type="number"
                  name="seatsAvailable"
                  min="1"
                  value={carpoolForm.seatsAvailable}
                  onChange={updateCarpoolForm}
                  required
                />
              </label>
            )}

            <div className="carpool-form-row">
              <label>
                Fare option
                <select
                  name="fareType"
                  value={carpoolForm.fareType}
                  onChange={updateCarpoolForm}
                >
                  <option value="Set Fare">Set Fare</option>
                  <option value="Decide in Person">Decide in Person</option>
                </select>
              </label>

              {carpoolForm.fareType === "Set Fare" && (
                <label>
                  Fare amount (PKR)
                  <input
                    type="number"
                    name="fareAmount"
                    min="0"
                    value={carpoolForm.fareAmount}
                    onChange={updateCarpoolForm}
                    placeholder="250"
                    required
                  />
                </label>
              )}
            </div>

            <div className="carpool-form-row">
              <label>
                Passenger preference
                <select
                  name="passengerPreference"
                  value={carpoolForm.passengerPreference}
                  onChange={updateCarpoolForm}
                >
                  <option value="Anyone">Anyone</option>
                  <option value="Girls Only">Girls Only</option>
                </select>
              </label>
            </div>

            <label>
              Additional notes
              <textarea
                name="notes"
                value={carpoolForm.notes}
                onChange={updateCarpoolForm}
                placeholder="Pickup instructions, luggage info, route notes, etc."
              />
            </label>

            <button type="submit" className="submit-button" disabled={carpoolSubmitting}>
              {carpoolSubmitting ? "Publishing..." : "Create Carpool →"}
            </button>

            {carpoolSuccess && <p className="success-message">{carpoolSuccess}</p>}
            {carpoolError && <p className="error-message">{carpoolError}</p>}
          </form>

          <div className="carpool-list-panel">
            <h3>{carpoolJourney} carpools</h3>

            {carpoolLoading && <p>Loading carpools...</p>}

            {!carpoolLoading && carpools.length === 0 && (
              <p className="empty-state">No carpools available yet. Publish the first one for this route.</p>
            )}

            <div className="carpool-grid">
              {carpools.map((carpool) => {
                const isCreator = user && carpool.creator && carpool.creator._id === user.id;
                const pendingRequests = (carpool.requests || []).filter((request) => request.status === "pending");
                const seatStatus =
                  carpool.transportType === "Car"
                    ? `${(carpool.requests || []).filter((request) => request.status === "approved").length} / ${carpool.seatsAvailable} seats taken`
                    : "Flexible seats";

                return (
                  <article key={carpool._id} className="carpool-card">
                    <div className="carpool-card-top">
                      <span className="category-pill">{carpool.journeyType}</span>
                      <span className="audience-pill">{carpool.transportType}</span>
                    </div>

                    <p><strong>From:</strong> {carpool.startingLocation}</p>
                    <p><strong>To:</strong> {carpool.destination}</p>
                    {carpool.stops && carpool.stops.length > 0 && (
                      <p><strong>Stops:</strong> {carpool.stops.join(" • ")}</p>
                    )}
                    <p><strong>Date:</strong> {new Date(carpool.journeyDate).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {carpool.departureTime}</p>
                    <p><strong>Fare:</strong> {carpool.fareType === "Set Fare" ? `PKR ${carpool.fareAmount}` : "Decide in Person"}</p>
                    <p><strong>Preference:</strong> {carpool.passengerPreference}</p>
                    <p><strong>Seats:</strong> {seatStatus}</p>
                    {carpool.notes && <p><strong>Notes:</strong> {carpool.notes}</p>}
                    <p><strong>Driver:</strong> {carpool.creator?.fullName || "Campus student"}</p>

                    {isCreator && pendingRequests.length > 0 && (
                      <div className="carpool-request-list">
                        {pendingRequests.map((request) => (
                          <div key={request._id} className="carpool-request-item">
                            <span>{request.user?.fullName || "Student"}</span>
                            <div>
                              <button type="button" onClick={() => decideCarpoolRequest(carpool._id, request._id, "approved")}>Accept</button>
                              <button type="button" className="cancel-button" onClick={() => decideCarpoolRequest(carpool._id, request._id, "rejected")}>Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isCreator && (
                      <button
                        type="button"
                        className="submit-button"
                        onClick={() => requestCarpoolJoin(carpool._id)}
                        disabled={carpool.transportType === "Car" && (carpool.requests || []).filter((request) => request.status === "approved").length >= carpool.seatsAvailable}
                      >
                        {carpool.transportType === "Car" && (carpool.requests || []).filter((request) => request.status === "approved").length >= carpool.seatsAvailable
                          ? "Full"
                          : "Request to join →"}
                      </button>
                    )}

                    {isCreator && (
                      <div className="carpool-actions">
                        <button type="button" className="secondary-action" onClick={() => startEditCarpool(carpool)}>
                          Edit
                        </button>
                        <button type="button" className="cancel-button" onClick={() => cancelCarpool(carpool._id)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {user && myCarpools.length > 0 && (
          <div className="my-carpools">
            <h3>Your carpools</h3>
            <div className="carpool-grid">
              {myCarpools.map((carpool) => (
                <article key={carpool._id} className="carpool-card mini">
                  <span className="category-pill">{carpool.journeyType}</span>
                  <p>{carpool.startingLocation} → {carpool.destination}</p>
                  <p>{new Date(carpool.journeyDate).toLocaleDateString()} · {carpool.departureTime}</p>
                  <p>{carpool.transportType} · {carpool.passengerPreference}</p>
                  {(carpool.requests || []).length > 0 && (
                    <p>{(carpool.requests || []).filter((request) => request.status === "pending").length} pending requests</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {editingCarpool && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setEditingCarpool(null);
          }
        }}>
          <section className="session-modal" role="dialog" aria-modal="true" aria-labelledby="edit-carpool-heading">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">CAMPUS CARPOOL</p>
                <h2 id="edit-carpool-heading">Edit Carpool</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingCarpool(null)}>✕</button>
            </div>

            <form className="edit-session-form" onSubmit={saveEditedCarpool}>
              <label>
                Starting location
                <input
                  name="startingLocation"
                  value={carpoolForm.startingLocation}
                  onChange={updateCarpoolForm}
                  required
                />
              </label>

              <label>
                Destination
                <input
                  name="destination"
                  value={carpoolForm.destination}
                  onChange={updateCarpoolForm}
                  required
                />
              </label>

              <label>
                Stops
                <input
                  name="stops"
                  value={carpoolForm.stops}
                  onChange={updateCarpoolForm}
                />
              </label>

              <label>
                Date
                <input
                  type="date"
                  name="journeyDate"
                  value={carpoolForm.journeyDate}
                  onChange={updateCarpoolForm}
                  required
                />
              </label>

              <label>
                Time
                <input
                  type="time"
                  name="departureTime"
                  value={carpoolForm.departureTime}
                  onChange={updateCarpoolForm}
                  required
                />
              </label>

              <label>
                Transport type
                <select
                  name="transportType"
                  value={carpoolForm.transportType}
                  onChange={updateCarpoolForm}
                >
                  <option value="Bike">Bike</option>
                  <option value="Car">Car</option>
                  <option value="Split InDrive">Split InDrive</option>
                </select>
              </label>

              {carpoolForm.transportType === "Car" && (
                <label>
                  Seats available
                  <input
                    type="number"
                    name="seatsAvailable"
                    min="1"
                    value={carpoolForm.seatsAvailable}
                    onChange={updateCarpoolForm}
                    required
                  />
                </label>
              )}

              <label>
                Fare option
                <select name="fareType" value={carpoolForm.fareType} onChange={updateCarpoolForm}>
                  <option value="Set Fare">Set Fare</option>
                  <option value="Decide in Person">Decide in Person</option>
                </select>
              </label>

              {carpoolForm.fareType === "Set Fare" && (
                <label>
                  Fare amount
                  <input
                    type="number"
                    name="fareAmount"
                    min="0"
                    value={carpoolForm.fareAmount}
                    onChange={updateCarpoolForm}
                    required
                  />
                </label>
              )}

              <label>
                Passenger preference
                <select name="passengerPreference" value={carpoolForm.passengerPreference} onChange={updateCarpoolForm}>
                  <option value="Anyone">Anyone</option>
                  <option value="Girls Only">Girls Only</option>
                </select>
              </label>

              <label>
                Notes
                <textarea name="notes" value={carpoolForm.notes} onChange={updateCarpoolForm} />
              </label>

              <div className="modal-actions">
                <button type="button" className="modal-secondary-button" onClick={() => setEditingCarpool(null)}>Discard</button>
                <button type="submit" className="submit-button">Save Carpool</button>
              </div>
            </form>
          </section>
        </div>
      )}

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
  <>
    {/*
    {user && session.createdBy === user._id && (
      <div className="session-rewards">
        <button
          type="button"
          className="reward-button"
          disabled={finalizingRewards[session._id]}
          onClick={() => finalizeRewards(session._id)}
        >
          {finalizingRewards[session._id]
            ? "Finalizing rewards..."
            : "Finalize rewards"}
        </button>
      </div>
    )}
    */}

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
  </>
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
