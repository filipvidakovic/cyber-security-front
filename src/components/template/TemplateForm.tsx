import React, { useState } from "react";
import { createTemplate } from "../../services/TemplateService";
import "./TemplateForm.css";

const TemplateForm: React.FC = () => {
  const [name, setName] = useState("");
  const [issuerId, setIssuerId] = useState<number | "">("");
  const [cnRegex, setCnRegex] = useState(".*");
  const [sanRegex, setSanRegex] = useState(".*");
  const [ttlDays, setTtlDays] = useState(365);
  const [keyUsage, setKeyUsage] = useState("digitalSignature");
  const [extendedKeyUsage, setExtendedKeyUsage] = useState("serverAuth");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const template = {
        name,
        issuerId: Number(issuerId),
        cnRegex,
        sanRegex,
        ttlDays,
        keyUsage,
        extendedKeyUsage,
      };
      const created = await createTemplate(template);
      alert(`Template created with ID ${created.id}`);
      setName("");
      setIssuerId("");
      setCnRegex(".*");
      setSanRegex(".*");
      setTtlDays(365);
      setKeyUsage("digitalSignature");
      setExtendedKeyUsage("serverAuth");
    } catch (err: any) {
      alert(err.response?.data?.message || "Unknown error occurred");
    }
  };

  return (
    <div className="template-forms">
      <form onSubmit={handleSubmit} className="shadow-sm p-3 mb-3 bg-white rounded">
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

        <label className="mb-2">
          Issuer ID
          <input
            type="number"
            className="form-control"
            value={issuerId}
            onChange={(e) => setIssuerId(Number(e.target.value))}
            required
          />
        </label>

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

        <label className="mb-2">
          Key Usage
          <input
            type="text"
            className="form-control"
            value={keyUsage}
            onChange={(e) => setKeyUsage(e.target.value)}
          />
        </label>

        <label className="mb-2">
          Extended Key Usage
          <input
            type="text"
            className="form-control"
            value={extendedKeyUsage}
            onChange={(e) => setExtendedKeyUsage(e.target.value)}
          />
        </label>

        <button type="submit" className="btn btn-success mt-3">
          Create Template
        </button>
      </form>
    </div>
  );
};

export default TemplateForm;
