import React, { useState, useEffect } from "react";
import { getIssuers } from "../../services/CertificateService";
import {
  createRoot,
  createIntermediate,
  issueEeAutogen,
  issueEeFromCsr,
} from "../../services/CertificateService";
import "./CertificateForm.css";
import { getTemplates } from "../../services/TemplateService";
import type { CertificateTemplate } from "../../model/CertificateTemplate";

/** ----------------- ExtensionsPanel ----------------- */
type Extensions = Record<string, string>;

const kuFlags = [
  "digitalSignature",
  "nonRepudiation",
  "keyEncipherment",
  "dataEncipherment",
  "keyAgreement",
  "keyCertSign",
  "cRLSign",
  "encipherOnly",
  "decipherOnly",
] as const;

const ekuOptions = [
  "serverAuth",
  "clientAuth",
  "codeSigning",
  "emailProtection",
  "timeStamping",
  "OCSPSigning",
] as const;

const LOCKED_CA = new Set(["keyCertSign", "cRLSign"]);
const FORBIDDEN_EE = new Set(["keyCertSign", "cRLSign"]);

const ExtensionsPanel: React.FC<{
  value: Extensions;
  onChange: (next: Extensions) => void;
  isCa?: boolean;
}> = ({ value, onChange, isCa }) => {
  const kuSel = (value["2.5.29.15"] ?? "").split(",").filter(Boolean);
  const ekuSel = (value["2.5.29.37"] ?? "").split(",").filter(Boolean);
  const san = value["2.5.29.17"] ?? "";

  // Enforce locks on mount/change of isCa
  useEffect(() => {
    const set = new Set(kuSel);
    if (isCa) {
      LOCKED_CA.forEach((f) => set.add(f)); // CA: force ON
    } else {
      FORBIDDEN_EE.forEach((f) => set.delete(f)); // EE: force OFF
    }
    const next = Array.from(set).join(",");
    if (next !== (value["2.5.29.15"] ?? "")) {
      onChange({
        ...value,
        ...(next ? { ["2.5.29.15"]: next } : { "2.5.29.15": "" }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCa]);

  const isKuDisabled = (f: (typeof kuFlags)[number]) =>
    (isCa && LOCKED_CA.has(f)) || (!isCa && FORBIDDEN_EE.has(f));

  const isKuChecked = (f: (typeof kuFlags)[number]) =>
    isCa && LOCKED_CA.has(f)
      ? true
      : !isCa && FORBIDDEN_EE.has(f)
      ? false
      : kuSel.includes(f);

  const toggleKu = (flag: (typeof kuFlags)[number]) => {
    if (isKuDisabled(flag)) return; // respect disabled state
    const set = new Set(kuSel);
    set.has(flag) ? set.delete(flag) : set.add(flag);
    // Re-assert policy after toggle
    if (isCa) LOCKED_CA.forEach((f) => set.add(f));
    if (!isCa) FORBIDDEN_EE.forEach((f) => set.delete(f));
    const next = Array.from(set).join(",");
    onChange({
      ...value,
      ...(next ? { ["2.5.29.15"]: next } : { "2.5.29.15": "" }),
    });
  };

  const toggleEku = (p: (typeof ekuOptions)[number]) => {
    const set = new Set(ekuSel);
    set.has(p) ? set.delete(p) : set.add(p);
    const next = Array.from(set).join(",");
    onChange({
      ...value,
      ...(next ? { ["2.5.29.37"]: next } : { "2.5.29.37": "" }),
    });
  };

  const updateSan = (s: string) => {
    const val = s.trim();
    onChange({
      ...value,
      ...(val ? { ["2.5.29.17"]: val } : { "2.5.29.17": "" }),
    });
  };

  return (
    <fieldset className="ext-panel">
      <legend>Extensions</legend>

      <div className="ext-group">
        <label className="ext-label">Key Usage (2.5.29.15)</label>
        <div className="ext-grid">
          {kuFlags.map((f) => (
            <label
              key={f}
              className={`ext-checkbox ${
                isKuDisabled(f) ? "ext-disabled" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={isKuChecked(f)}
                onChange={() => toggleKu(f)}
                disabled={isKuDisabled(f)}
              />
              {f}
            </label>
          ))}
        </div>
        {isCa && (
          <small className="ext-help">
            For CA: keyCertSign &amp; cRLSign are required and locked.
          </small>
        )}
      </div>

      <div className="ext-group">
        <label className="ext-label">Extended Key Usage (2.5.29.37)</label>
        <div className="ext-grid">
          {ekuOptions.map((p) => (
            <label key={p} className="ext-checkbox">
              <input
                type="checkbox"
                checked={ekuSel.includes(p)}
                onChange={() => toggleEku(p)}
              />
              {p}
            </label>
          ))}
        </div>
      </div>

      <div className="ext-group">
        <label className="ext-label">
          Subject Alternative Name (2.5.29.17)
        </label>
        <input
          type="text"
          className="ext-input"
          placeholder="DNS:example.com, DNS:www.example.com, IP:10.0.0.5, EMAIL:ops@example.com"
          value={san}
          onChange={(e) => updateSan(e.target.value)}
        />
        <small className="ext-help">
          Comma-separated. Supported: DNS, IP, EMAIL, URI.
        </small>
      </div>
    </fieldset>
  );
};
/** --------------- end ExtensionsPanel --------------- */

interface CertificateFormsProps {
  role: "ADMIN" | "CA_USER" | "USER" | null;
}

interface X500Data {
  cn: string;
  ou?: string;
  o?: string;
  l?: string;
  st?: string;
  c?: string;
}

const CertificateForm: React.FC<CertificateFormsProps> = ({ role }) => {
  if (!role) return <p>Please log in</p>;

  const [issuers, setIssuers] = useState<
    { id: number; subjectDn: string; type: string }[]
  >([]);

  useEffect(() => {
    const loadIssuers = async () => {
      try {
        const data = await getIssuers();
        setIssuers(data);
      } catch (err) {
        console.error(err);
        alert("Error loading issuers");
      }
    };
    loadIssuers();
  }, []);

  const renderIssuerDropdown = (
    value: string,
    onChange: (val: string) => void
  ) => (
    <div className="issuer-dropdown">
      <label className="issuer-label">Select Issuer:</label>
      <select
        className="issuer-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  );

  const [rootData, setRootData] = useState<X500Data & { ttlDays: number }>({
    cn: "",
    ttlDays: 365,
  });
  const [intData, setIntData] = useState<
    X500Data & { issuerId: string; ttlDays: number }
  >({ issuerId: "", cn: "", ttlDays: 365 });
  const [eeAutoData, setEeAutoData] = useState<
    X500Data & { issuerId: string; ttlDays: number; storePrivateKey: boolean }
  >({ issuerId: "", cn: "", ttlDays: 365, storePrivateKey: false });
  const [eeCsrData, setEeCsrData] = useState<{
    issuerId: string;
    ttlDays: number;
    csr: File | null;
  }>({ issuerId: "", ttlDays: 365, csr: null });

  // Per-form extensions (sent to backend)
  const [rootExt, setRootExt] = useState<Record<string, string>>({});
  const [intExt, setIntExt] = useState<Record<string, string>>({});
  const [eeAutoExt, setEeAutoExt] = useState<Record<string, string>>({});

  // DN helpers
  const escapeDnValue = (val: string) => val.replace(/[,+=<>;"\\]/g, "\\$&");
  const buildCn = (x500: X500Data) => {
    const parts = [
      x500.cn && `CN=${escapeDnValue(x500.cn)}`,
      x500.ou && `OU=${escapeDnValue(x500.ou)}`,
      x500.o && `O=${escapeDnValue(x500.o)}`,
      x500.l && `L=${escapeDnValue(x500.l)}`,
      x500.st && `ST=${escapeDnValue(x500.st)}`,
      x500.c && `C=${escapeDnValue(x500.c)}`,
    ].filter(Boolean);
    return parts.join(", ");
  };

  // Cleanup: drop empty OIDs and (for EE) strip CA-only KU flags
  const cleanupExtensions = (ext: Record<string, string>, isCa: boolean) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(ext)) {
      const val = (v ?? "").trim();
      if (!val) continue;
      if (k === "2.5.29.15") {
        const items = val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const filtered = isCa
          ? Array.from(new Set([...items, "keyCertSign", "cRLSign"])) // ensure present
          : items.filter((f) => f !== "keyCertSign" && f !== "cRLSign"); // ensure absent
        if (filtered.length) out[k] = filtered.join(",");
      } else {
        out[k] = val;
      }
    }
    return out;
  };

  // ----------------- Submit handlers -----------------
  const handleRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cn = buildCn(rootData);
      const extensions = cleanupExtensions(rootExt, true);
      // TODO: ensure createRoot accepts (cn, ttlDays, extensions)
      const id = await createRoot(cn, rootData.ttlDays, extensions as any);
      alert(`Root CA created`);
      setRootExt({});
    } catch (err: any) {
      alert(err.response?.data?.message || "Unknown error occurred");
    }
  };

  const handleIntSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cn = buildCn(intData);
      const extensions = cleanupExtensions(intExt, true);
      // TODO: ensure createIntermediate accepts (issuerId, cn, ttlDays, extensions)
      const id = await createIntermediate(
        Number(intData.issuerId),
        cn,
        intData.ttlDays,
        extensions as any
      );
      alert(`Intermediate CA created`);
      setIntExt({});
    } catch (err: any) {
      alert(err.response?.data?.message || "Unknown error occurred");
    }
  };

  const handleEeAutoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cn = buildCn(eeAutoData);
      const extensions = cleanupExtensions(eeAutoExt, false);
      // TODO: ensure issueEeAutogen accepts (issuerId, cn, ttlDays, storePrivateKey, extensions)
      const id = await issueEeAutogen(
        Number(eeAutoData.issuerId),
        cn,
        eeAutoData.ttlDays,
        eeAutoData.storePrivateKey,
        extensions as any
      );
      alert(`EE Certificate created`);
      setEeAutoExt({});
    } catch (err: any) {
      alert(err.response?.data?.message || "Unknown error occurred");
    }
  };

  const handleEeCsrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eeCsrData.csr) return alert("Please upload a CSR file");
    try {
      // CSR path: extensions come from CSR, so no panel used here
      const id = await issueEeFromCsr(
        Number(eeCsrData.issuerId),
        eeCsrData.ttlDays,
        eeCsrData.csr
      );
      alert(`EE Certificate created from CSR`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Unknown error occurred");
    }
  };

  // --------------- Render X500 inputs ----------------
  const renderX500Inputs = (
    data: X500Data,
    setData: React.Dispatch<React.SetStateAction<any>>
  ) => (
    <>
      <input
        type="text"
        placeholder="Common Name (CN)"
        value={data.cn}
        onChange={(e) => setData({ ...data, cn: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Organizational Unit (OU)"
        value={data.ou || ""}
        onChange={(e) => setData({ ...data, ou: e.target.value })}
      />
      <input
        type="text"
        placeholder="Organization (O)"
        value={data.o || ""}
        onChange={(e) => setData({ ...data, o: e.target.value })}
      />
      <input
        type="text"
        placeholder="Locality (L)"
        value={data.l || ""}
        onChange={(e) => setData({ ...data, l: e.target.value })}
      />
      <input
        type="text"
        placeholder="State (ST)"
        value={data.st || ""}
        onChange={(e) => setData({ ...data, st: e.target.value })}
      />
      <input
        type="text"
        placeholder="Country (C)"
        value={data.c || ""}
        onChange={(e) => setData({ ...data, c: e.target.value })}
      />
    </>
  );
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  useEffect(() => {
    if (!selectedTemplateId) return;

    const tmpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tmpl) return;

    // Example: fill intermediate CA fields
    setIntData({
      ...intData,
      issuerId: tmpl.issuerId.toString(),
      ttlDays: tmpl.ttlDays,
    });

    setIntExt({
      "2.5.29.15": tmpl.keyUsage,
      "2.5.29.37": tmpl.extendedKeyUsage,
      "2.5.29.17": tmpl.sanRegex,
    });
  }, [selectedTemplateId]);

  useEffect(() => {
    if (role === "USER") return; // USERS don't need templates
    const loadTemplates = async () => {
      const data = await getTemplates();
      setTemplates(data);
    };
    loadTemplates();
  }, []);

  return (
    <div className="certificate-forms">
      {role === "ADMIN" && (
        <form onSubmit={handleRootSubmit}>
          <h2>Root CA</h2>
          {renderX500Inputs(rootData, setRootData)}
          <input
            type="number"
            min="1"
            value={rootData.ttlDays}
            onChange={(e) =>
              setRootData({ ...rootData, ttlDays: Number(e.target.value) })
            }
            required
          />
          {/* Root: CA mode */}
          <ExtensionsPanel value={rootExt} onChange={setRootExt} isCa />
          <button type="submit">Create Root CA</button>
        </form>
      )}

      {(role === "ADMIN" || role === "CA_USER") && (
        <form onSubmit={handleIntSubmit}>
          <h2>Intermediate CA</h2>

          <div className="template-dropdown">
            <label>Select Template:</label>
            <select
              value={selectedTemplateId ?? ""}
              onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
            >
              <option value="">— None —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {renderIssuerDropdown(intData.issuerId, (val) =>
            setIntData({ ...intData, issuerId: val })
          )}
          {renderX500Inputs(intData, setIntData)}
          <input
            type="number"
            min="1"
            value={intData.ttlDays}
            onChange={(e) =>
              setIntData({ ...intData, ttlDays: Number(e.target.value) })
            }
            required
          />
          {/* Intermediate: CA mode */}
          <ExtensionsPanel value={intExt} onChange={setIntExt} isCa />
          <button type="submit">Create Intermediate CA</button>
        </form>
      )}

      <form onSubmit={handleEeAutoSubmit}>
        <h2>EE Certificate (Auto-generated)</h2>
        {renderIssuerDropdown(eeAutoData.issuerId, (val) =>
          setEeAutoData({ ...eeAutoData, issuerId: val })
        )}
        {renderX500Inputs(eeAutoData, setEeAutoData)}
        <input
          type="number"
          min="1"
          value={eeAutoData.ttlDays}
          onChange={(e) =>
            setEeAutoData({ ...eeAutoData, ttlDays: Number(e.target.value) })
          }
          required
        />
        <label>
          Store Private Key
          <input
            type="checkbox"
            checked={eeAutoData.storePrivateKey}
            onChange={(e) =>
              setEeAutoData({
                ...eeAutoData,
                storePrivateKey: e.target.checked,
              })
            }
          />
        </label>
        {/* EE: non-CA mode */}
        <ExtensionsPanel value={eeAutoExt} onChange={setEeAutoExt} />
        <button type="submit">Generate EE Certificate</button>
      </form>

      <form onSubmit={handleEeCsrSubmit} encType="multipart/form-data">
        <h2>EE Certificate (From CSR)</h2>
        {renderIssuerDropdown(eeCsrData.issuerId, (val) =>
          setEeCsrData({ ...eeCsrData, issuerId: val })
        )}
        <input
          type="number"
          min="1"
          value={eeCsrData.ttlDays}
          onChange={(e) =>
            setEeCsrData({ ...eeCsrData, ttlDays: Number(e.target.value) })
          }
          required
        />
        <input
          type="file"
          accept=".csr, .pem"
          onChange={(e) =>
            setEeCsrData({ ...eeCsrData, csr: e.target.files?.[0] ?? null })
          }
          required
        />
        {/* CSR path: extensions come from CSR */}
        <button type="submit">Generate EE from CSR</button>
      </form>
    </div>
  );
};

export default CertificateForm;
