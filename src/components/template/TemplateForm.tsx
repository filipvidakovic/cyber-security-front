import React, { useEffect, useState } from "react";
import { createTemplate } from "../../services/TemplateService";
import "./TemplateForm.css";
import { getIssuers } from "../../services/CertificateService";

const TemplateForm: React.FC = () => {
  const [name, setName] = useState("");
  const [issuerId, setIssuerId] = useState<number | "">("");
  const [cnRegex, setCnRegex] = useState(".*");
  const [sanRegex, setSanRegex] = useState(".*");
  const [ttlDays, setTtlDays] = useState(365);
  const [keyUsage, setKeyUsage] = useState<string[]>(["digitalSignature"]);
  const [extendedKeyUsage, setExtendedKeyUsage] = useState<string[]>(["serverAuth"]);
  const [issuers, setIssuers] = useState<any[]>([]);
  useEffect(() => {
  const fetchIssuers = async () => {
    try {
      const data = await getIssuers();
      setIssuers(data);
    } catch (err) {
      console.error("Failed to fetch issuers", err);
    }
  };
  fetchIssuers();
}, []);

  const kuFlags = [
    "digitalSignature",
    "nonRepudiation",
    "keyEncipherment",
    "dataEncipherment",
    "keyAgreement",
    "keyCertSign",
    "cRLSign",
    "encipherOnly",
    "decipherOnly"
  ] as const;

  const ekuOptions = [
    "serverAuth",
    "clientAuth",
    "codeSigning",
    "emailProtection",
    "timeStamping",
    "OCSPSigning"
  ] as const;

  // Toggle KeyUsage checkboxes
  const toggleKu = (flag: string) => {
    setKeyUsage((prev) =>
      prev.includes(flag)
        ? prev.filter((f) => f !== flag)
        : [...prev, flag]
    );
  };

  const isKuChecked = (flag: string) => keyUsage.includes(flag);

  // Toggle ExtendedKeyUsage checkboxes
  const toggleEku = (flag: string) => {
    setExtendedKeyUsage((prev) =>
      prev.includes(flag)
        ? prev.filter((f) => f !== flag)
        : [...prev, flag]
    );
  };

  const isEkuChecked = (flag: string) => extendedKeyUsage.includes(flag);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const template = {
        name,
        issuerId: Number(issuerId),
        cnRegex,
        sanRegex,
        ttlDays,
        keyUsage: keyUsage.join(","),
        extendedKeyUsage: extendedKeyUsage.join(","),
      };
      const created = await createTemplate(template);
      alert(`Template created with ID ${created.id}`);
      // reset form
      setName("");
      setIssuerId("");
      setCnRegex(".*");
      setSanRegex(".*");
      setTtlDays(365);
      setKeyUsage(["digitalSignature"]);
      setExtendedKeyUsage(["serverAuth"]);
    } catch (err: any) {
      alert(err.response?.data?.message || "Unknown error occurred");
    }
  };

  return (
    <div className="template-forms">
      <form onSubmit={handleSubmit} className="shadow-sm p-4 mb-3 bg-white rounded">
        <h2 className="mb-3">Create Certificate Template</h2>

        <label className="mb-2">
          Template Name
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <div className="issuer-dropdown">
        <label className="issuer-label">Select Issuer:</label>
        <select
            className="issuer-select"
            value={issuerId}
            onChange={(e) => setIssuerId(Number(e.target.value))}
            required
        >
            <option value="">— Choose an issuer —</option>
            {issuers.map((iss) => (
            <option key={iss.id} value={iss.id}>
                {iss.type} — {iss.subjectDn}
            </option>
            ))}
        </select>
        </div>


        <label className="mb-2">
          CN Regex
          <input
            type="text"
            className="form-control"
            value={cnRegex}
            onChange={(e) => setCnRegex(e.target.value)}
          />
        </label>

        <label className="mb-2">
          SAN Regex
          <input
            type="text"
            className="form-control"
            value={sanRegex}
            onChange={(e) => setSanRegex(e.target.value)}
          />
        </label>

        <label className="mb-2">
          TTL (days)
          <input
            type="number"
            className="form-control"
            value={ttlDays}
            onChange={(e) => setTtlDays(Number(e.target.value))}
            required
          />
        </label>

        {/* Extensions */}
        <fieldset className="ext-panel">
          <legend>Extensions</legend>

          <div className="ext-group">
            <label className="ext-label">Key Usage (2.5.29.15)</label>
            <div className="ext-grid">
              {kuFlags.map((f) => (
                <label key={f} className="ext-checkbox">
                  <input
                    type="checkbox"
                    checked={isKuChecked(f)}
                    onChange={() => toggleKu(f)}
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>

          <div className="ext-group">
            <label className="ext-label">Extended Key Usage (2.5.29.37)</label>
            <div className="ext-grid">
              {ekuOptions.map((p) => (
                <label key={p} className="ext-checkbox">
                  <input
                    type="checkbox"
                    checked={isEkuChecked(p)}
                    onChange={() => toggleEku(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div className="ext-group">
            <label className="ext-label">Subject Alternative Name (2.5.29.17)</label>
            <input
              type="text"
              className="ext-input"
              placeholder="DNS:example.com, DNS:www.example.com, IP:10.0.0.5, EMAIL:ops@example.com"
              value={sanRegex}
              onChange={(e) => setSanRegex(e.target.value)}
            />
            <small className="ext-help">
              Comma-separated. Supported: DNS, IP, EMAIL, URI.
            </small>
          </div>
        </fieldset>

        <button type="submit" className="btn btn-success mt-3 w-100">
          Create Template
        </button>
      </form>
    </div>
  );
};

export default TemplateForm;
