import { useEffect, useState, useRef } from "react";
import { FaUsers, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import API from "../../services/api";
import toast from "react-hot-toast";
import "../../styles/student/SearchProjects.css";

function SearchProjects() {
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const socketRef = useRef(null);
  const retryCountRef = useRef(0);

  // =============================
  // FETCH PROJECTS
  // =============================
  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects/search");

      // ✅ FIX: correct response structure
      const data = res.data?.data || [];

      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // WEBSOCKET CONNECTION (FIXED)
  // =============================
  const connectSocket = () => {
    const token = localStorage.getItem("access_token");

    // ✅ FIX: prevent null token connection
    if (!token) {
      console.warn("No token found. Skipping WebSocket.");
      return;
    }

    // ⚠️ NOTE: your backend requires project_id
    // For now, disable or use a valid one
    const projectId = 1; // TODO: dynamic later

    const socket = new WebSocket(
      `ws://localhost:8000/ws/project/${projectId}?token=${token}`
    );

    socketRef.current = socket;

    socket.onopen = () => {
      console.log("✅ WebSocket Connected");
      retryCountRef.current = 0;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "REQUEST_STATUS_UPDATED":
            handleRequestUpdate(data);
            break;

          case "PROJECT_REOPENED":
            toast("🚀 Project reopened!");
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("WS message error:", err);
      }
    };

    socket.onclose = () => {
      console.log("❌ WebSocket Disconnected");

      // ✅ FIX: retry limit
      if (retryCountRef.current < 5) {
        retryCountRef.current++;
        setTimeout(connectSocket, 3000);
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  };

  // =============================
  // HANDLE REALTIME UPDATE
  // =============================
  const handleRequestUpdate = ({ project_id, status }) => {
    setProjects(prev =>
      prev.map(p =>
        p.id === project_id
          ? { ...p, user_request_status: status }
          : p
      )
    );

    if (status === "ACCEPTED") toast.success("🎉 Joined!");
    if (status === "REJECTED") toast.error("❌ Rejected");
    if (status === "REMOVED") toast("⚠️ Removed");
  };

  // =============================
  // SEND REQUEST
  // =============================
  const sendRequest = async (projectId) => {
    try {
      setActionLoading(projectId);

      await API.post(`/projects/${projectId}/request`);

      setProjects(prev =>
        prev.map(p =>
          p.id === projectId
            ? { ...p, user_request_status: "WAITING" }
            : p
        )
      );

      toast.success("Request sent");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Request failed");
    } finally {
      setActionLoading(null);
    }
  };

  // =============================
  // INIT
  // =============================
  useEffect(() => {
    fetchProjects();
    connectSocket();

    return () => socketRef.current?.close();
  }, []);

  // =============================
  // SAFE FILTER
  // =============================
  const safeProjects = Array.isArray(projects) ? projects : [];

  const filteredProjects = safeProjects.filter(p => {
    if (activeTab === "OPEN") {
      return p.status === "OPEN" && p.user_request_status !== "ACCEPTED";
    }

    if (activeTab === "WORKING") {
      return p.user_request_status === "ACCEPTED";
    }

    return true;
  });

  if (loading) return <p className="loading">Loading projects...</p>;

  return (
    <div className="search-container">
      <h1 className="page-title">Search Projects</h1>

      <div className="tab-switch">
        <button
          className={activeTab === "OPEN" ? "active" : ""}
          onClick={() => setActiveTab("OPEN")}
        >
          Open Projects
        </button>

        <button
          className={activeTab === "WORKING" ? "active" : ""}
          onClick={() => setActiveTab("WORKING")}
        >
          Working Projects
        </button>
      </div>

      <div className="grid">
        {filteredProjects.map(project => {
          const vacancy =
            project.team_limit - project.current_members;

          const status = project.user_request_status || "NONE";

          return (
            <div key={project.id} className="project-card">

              <div className="card-top">
                <h2>{project.title}</h2>
                <span className={`status ${project.status}`}>
                  {project.status}
                </span>
              </div>

              <div className="owner">
                <img
                  src={project.owner_image || "/default-avatar.png"}
                  alt="owner"
                />
                <div>
                  <p>{project.owner_name}</p>
                  <small>{project.owner_department}</small>
                </div>
              </div>

              <div className="team">
                <FaUsers />
                {project.current_members}/{project.team_limit}
              </div>

              <div className={vacancy > 0 ? "vacancy open" : "vacancy full"}>
                {vacancy > 0 ? (
                  <>
                    <FaCheckCircle /> {vacancy} spots left
                  </>
                ) : (
                  <>
                    <FaTimesCircle /> Team Full
                  </>
                )}
              </div>

              {status === "NONE" && vacancy > 0 && (
                <button
                  className="join-btn"
                  onClick={() => sendRequest(project.id)}
                  disabled={actionLoading === project.id}
                >
                  {actionLoading === project.id ? "Sending..." : "Request to Join"}
                </button>
              )}

              {status === "WAITING" && (
                <button className="cancel-btn">
                  Cancel Request
                </button>
              )}

              {status === "ACCEPTED" && (
                <div className="accepted">Joined ✅</div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SearchProjects;