import { useEffect, useState } from "react";
import {
  downloadCert,
  revokeCertificate,
} from "../../services/CertificateService";
import api from "../../api/axiosInstance";
import DownloadWithPassword from "./DownloadPasswordPopup";

interface CertificateDTO {
  id: number;
  type: string;
  subjectDn: string;
  issuerDn: string;
  serialHex: string;
  notBefore: string;
  notAfter: string;
  status: string;
  orgId: string;
}

const API_URL = import.meta.env.VITE_API_URL + "cert";

interface CertificateListProps {
  role: "ADMIN" | "CA_USER" | "USER" | null;
}

export default function CertificateList({ role }: CertificateListProps) {
  const [certificates, setCertificates] = useState<CertificateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const token = localStorage.getItem("accessToken");

        // Select endpoint based on user role
        let url = "";
        switch (role) {
          case "ADMIN":
            url = `${API_URL}/admin`;
            break;
          case "CA_USER":
            url = `${API_URL}/ca`; // implement backend endpoint for CA_USER (their own org/lchain)
            break;
          case "USER":
          default:
            url = `${API_URL}/user`;
            break;
        }

        const res = await api.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Fetched certificates:", res.data);
        setCertificates(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        console.error("Error fetching certificates:", err);
        setError(err.response?.data?.message || "Failed to load certificates");
      } finally {
        setLoading(false);
      }
    };
    fetchCertificates();
  }, [role]);

  // ✅ Actions
  const handleDownload = async (id: number) => {
    const password = prompt("Enter a password to protect your .p12 file:");
    if (!password) return alert("Download cancelled — password is required.");

    try {
      await downloadCert(id, password);
    } catch (err) {
      alert("Failed to download certificate.");
    }
  };

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Are you sure you want to revoke this certificate?"))
      return;

    const reasonText =
      "Select revocation reason (enter number):\n\n" +
      "1 - Key Compromise\n" +
      "3 - Affiliation Changed\n" +
      "4 - Superseded\n" +
      "5 - Cessation of Operation\n" +
      "9 - Privilege Withdrawn";

    const reasonInput = prompt(reasonText);
    if (reasonInput === null) return;

    const reasonCode = parseInt(reasonInput);
    const validReasons = [1, 3, 4, 5, 9];

    if (!validReasons.includes(reasonCode)) {
      alert("Invalid reason code. Allowed values are 1, 3, 4, 5, or 9.");
      return;
    }

    try {
      const msg = await revokeCertificate(id, reasonCode);
      alert(msg || "Certificate revoked successfully!");

      setCertificates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "REVOKED" } : c))
      );
    } catch (err) {
      console.error("Failed to revoke certificate:", err);
      alert("Failed to revoke certificate. Please try again.");
    }
  };

  // ✅ Loading & Error states
  if (loading) return <p>Loading certificates...</p>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  // ✅ Render table
  return (
    <div>
      <h3 className="mb-4">
        {role === "ADMIN"
          ? "All Certificates"
          : role === "CA_USER"
          ? "Organization Certificates"
          : "My Certificates"}
      </h3>

      <table className="table table-striped table-bordered">
        <thead className="table-light">
          <tr>
            <th>Type</th>
            <th>Subject DN</th>
            <th>Issuer DN</th>
            <th>Serial</th>
            <th>Valid From</th>
            <th>Valid To</th>
            <th>Status</th>
            <th>Org</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {certificates.map((c) => {
            const isExpired = new Date(c.notAfter) < new Date();
            const effectiveStatus =
              isExpired && c.status === "VALID" ? "EXPIRED" : c.status;
            const canRevoke = c.status === "VALID" && !isExpired;

            return (
              <tr key={c.id} style={{ opacity: isExpired ? 0.5 : 1 }}>
                <td>{c.type}</td>
                <td>{c.subjectDn}</td>
                <td>{c.issuerDn}</td>
                <td>{c.serialHex}</td>
                <td>{new Date(c.notBefore).toLocaleDateString()}</td>
                <td>{new Date(c.notAfter).toLocaleDateString()}</td>
                <td>{effectiveStatus}</td>
                <td>{c.orgId}</td>
                <td>
                  <DownloadWithPassword certId={c.id} />

                  {(role === "ADMIN" ||
                    role === "CA_USER" ||
                    role === "USER") && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleRevoke(c.id)}
                      disabled={!canRevoke}
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
