import React, { useState } from "react";
import { downloadCert } from "../../services/CertificateService";

const DownloadWithPassword: React.FC<{ certId: number }> = ({ certId }) => {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");

  const handleConfirm = async () => {
    if (!password.trim()) {
      alert("Password is required.");
      return;
    }
    try {
      await downloadCert(certId, password);
      setShowModal(false);
      setPassword("");
    } catch (err) {
      console.error("Failed to download certificate:", err);
      alert("❌ Failed to download certificate.");
    }
  };

  return (
    <>
      <button
        className="btn btn-sm btn-primary me-2"
        onClick={() => setShowModal(true)}
      >
        Download
      </button>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "300px",
            }}
          >
            <h5>Enter Password</h5>
            <input
              type="password"
              className="form-control mb-3"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-primary" onClick={handleConfirm}>
                Confirm
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowModal(false);
                  setPassword("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DownloadWithPassword;
