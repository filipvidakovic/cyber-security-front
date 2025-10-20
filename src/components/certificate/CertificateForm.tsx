

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

/** ----------------- Helpers ----------------- */
type Extensions = Record<string, string>;

type TemplateLocks = {
  ku?: Set<string>;
  eku?: Set<string>;
  // SAN is never locked; only validated via regex if provided.
};

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

// Parse template regex: supports "abc" or "/abc/i"
const toRegExp = (raw?: string): RegExp | null => {
  if (!raw || !raw.trim()) return null;
  try {
    const m = raw.match(/^\/(.+)\/([gimsuy]*)$/);
    return m ? new RegExp(m[1], m[2]) : new RegExp(raw);
  } catch {
    return null;
  }
};

/** ----------------- ExtensionsPanel ----------------- */
const ExtensionsPanel: React.FC<{
  value: Extensions;
  onChange: (next: Extensions) => void;
  isCa?: boolean;
  templateLocks?: TemplateLocks;
  sanRegex?: string; // template-provided regex to validate SAN (optional)
}> = ({ value, onChange, isCa, templateLocks, sanRegex }) => {
  const kuSel = (value["2.5.29.15"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ekuSel = (value["2.5.29.37"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const san = value["2.5.29.17"] ?? "";

  const [sanError, setSanError] = useState<string>("");

  // Enforce CA/EE policy when isCa changes
  useEffect(() => {
    const set = new Set(kuSel);
    if (isCa) {
      LOCKED_CA.forEach((f) => set.add(f)); // CA: must include keyCertSign/cRLSign
    } else {
      FORBIDDEN_EE.forEach((f) => set.delete(f)); // EE: must exclude them
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

  // SAN validation (live)
  useEffect(() => {
  const re = toRegExp(sanRegex);
  if (!re) {
    // If a non-empty regex string exists but can't compile, show it
    setSanError(sanRegex && sanRegex.trim() ? `Invalid SAN regex in template: ${sanRegex}` : "");
    return;
  }
  if (!san) {
    setSanError(""); // empty SAN is OK
    return;
  }
  setSanError(re.test(san) ? "" : `SAN does not match pattern: ${sanRegex}`);
}, [san, sanRegex]);

  const isKuDisabled = (f: (typeof kuFlags)[number]) => {
    const lockedByRole = (isCa && LOCKED_CA.has(f)) || (!isCa && FORBIDDEN_EE.has(f));
    const lockedByTemplate = templateLocks?.ku?.has(f) ?? false;
    return lockedByRole || lockedByTemplate;
  };

  const isKuChecked = (f: (typeof kuFlags)[number]) =>
    isCa && LOCKED_CA.has(f)
      ? true
      : !isCa && FORBIDDEN_EE.has(f)
      ? false
      : kuSel.includes(f);

  const toggleKu = (flag: (typeof kuFlags)[number]) => {
    if (isKuDisabled(flag)) return;
    const set = new Set(kuSel);
    set.has(flag) ? set.delete(flag) : set.add(flag);
    if (isCa) LOCKED_CA.forEach((f) => set.add(f));
    if (!isCa) FORBIDDEN_EE.forEach((f) => set.delete(f));
    const next = Array.from(set).join(",");
    onChange({
      ...value,
      ...(next ? { ["2.5.29.15"]: next } : { "2.5.29.15": "" }),
    });
  };

  const isEkuDisabled = (p: (typeof ekuOptions)[number]) =>
    templateLocks?.eku?.has(p) ?? false;

  const toggleEku = (p: (typeof ekuOptions)[number]) => {
    if (isEkuDisabled(p)) return;
    const set = new Set(ekuSel);
    set.has(p) ? set.delete(p) : set.add(p);
    const next = Array.from(set).join(",");
    onChange({
      ...value,
      ...(next ? { ["2.5.29.37"]: next } : { "2.5.29.37": "" }),
    });
  };

  const updateSan = (s: string) => {
    // Keep user’s typing intact; no trimming here
    const val = s;
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
              className={`ext-checkbox ${isKuDisabled(f) ? "ext-disabled" : ""}`}
              title={isKuDisabled(f) ? "Locked by template/policy" : undefined}
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
            <label
              key={p}
              className={`ext-checkbox ${isEkuDisabled(p) ? "ext-disabled" : ""}`}
              title={isEkuDisabled(p) ? "Locked by template" : undefined}
            >
              <input
                type="checkbox"
                checked={ekuSel.includes(p)}
                onChange={() => toggleEku(p)}
                disabled={isEkuDisabled(p)}
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
          className={`ext-input ${sanError ? "ext-input-error" : ""}`}
          placeholder="DNS:example.com, DNS:www.example.com, IP:10.0.0.5, EMAIL:ops@example.com"
          value={san}
          onChange={(e) => updateSan(e.target.value)}
          aria-invalid={!!sanError}
        />
        {sanError && (
          <div className="ext-error" role="alert">
            {sanError}
          </div>
        )}
        <small className="ext-help">
          Comma-separated. Supported: DNS, IP, EMAIL, URI.
          {sanRegex ? " (Template regex enforced.)" : ""}
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

  // Template locks (Intermediate only): KU/EKU
  const [intLocked, setIntLocked] = useState<{ ku: Set<string>; eku: Set<string> }>({
    ku: new Set(),
    eku: new Set(),
  });

  // Template regexes (Intermediate only)
  const [intCnRegex, setIntCnRegex] = useState<string>("");
  const [intSanRegex, setIntSanRegex] = useState<string>("");

  // Inline CN error (Intermediate only)
  const [intCnError, setIntCnError] = useState<string>("");

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

  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // When a template is selected, populate fields + set locks + set regexes
  useEffect(() => {
    if (!selectedTemplateId) {
      // clear locks and regexes when no template selected
      setIntLocked({ ku: new Set(), eku: new Set() });
      setIntCnRegex("");
      setIntSanRegex("");
      setIntCnError("");
      return;
    }
    const tmpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tmpl) return;

    // Fill intermediate CA fields
    setIntData((prev) => ({
      ...prev,
      issuerId: String(tmpl.issuerId ?? prev.issuerId),
      ttlDays: tmpl.ttlDays ?? prev.ttlDays,
    }));

    // Set KU/EKU from template; keep SAN empty (regex validates only)
    setIntExt({
      "2.5.29.15": tmpl.keyUsage ?? "",
      "2.5.29.37": tmpl.extendedKeyUsage ?? "",
      "2.5.29.17": "",
    });

    // Locks for KU/EKU only
    const kuSet = new Set(
      (tmpl.keyUsage ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const ekuSet = new Set(
      (tmpl.extendedKeyUsage ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    setIntLocked({ ku: kuSet, eku: ekuSet });

    // Store regexes separately for validation
    setIntCnRegex((tmpl as any).cnRegex ?? "");   // optional in your model
    setIntSanRegex(tmpl.sanRegex ?? "");
    setIntCnError(""); // clear previous error
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (role === "USER") return; // USERS don't need templates
    const loadTemplates = async () => {
      const data = await getTemplates();
      setTemplates(data);
    };
    loadTemplates();
  }, [role]);

  // ----------------- Submit handlers -----------------
  const handleRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cn = buildCn(rootData);
      const extensions = cleanupExtensions(rootExt, true);
      await createRoot(cn, rootData.ttlDays, extensions as any);
      alert(`Root CA created`);
      setRootExt({});
    } catch (err: any) {
      alert(err.response?.data?.message || "Unknown error occurred");
    }
  };

  const handleIntSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate CN against template regex (if provided); write inline error
    const reCN = toRegExp(intCnRegex);
    if (reCN) {
    if (!intData.cn || !reCN.test(intData.cn)) {
      setIntCnError(`CN does not match pattern: ${intCnRegex}`);
      return;
    }
    setIntCnError("");
  } else if (intCnRegex && intCnRegex.trim()) {
    setIntCnError(`Invalid CN regex in template: ${intCnRegex}`);
    return;
  } else {
    setIntCnError("");
  }


    // Validate SAN against template regex (if provided) — block submit if not matching
    const reSAN = toRegExp(intSanRegex);
    if (reSAN && (intExt["2.5.29.17"] ?? "").trim()) {
      if (!reSAN.test(intExt["2.5.29.17"])) {
        // ExtensionsPanel already shows inline error; also block submit here
        alert(`SAN does not match pattern: ${intSanRegex}`);
        return;
      }
    } else if (!reSAN && intSanRegex && intSanRegex.trim()) {
      alert(`Invalid SAN regex in template: ${intSanRegex}`);
      return;
    }

    try {
      const cn = buildCn(intData);
      const extensions = cleanupExtensions(intExt, true);
      await createIntermediate(
        Number(intData.issuerId),
        cn,
        intData.ttlDays,
        extensions as any
      );
      alert(`Intermediate CA created`);
      setIntExt({});
      setSelectedTemplateId(null);
      setIntLocked({ ku: new Set(), eku: new Set() });
      setIntCnRegex("");
      setIntSanRegex("");
      setIntCnError("");
    } catch (err: any) {
      alert(err.response?.data?.message || "Unknown error occurred");
    }
  };

  const handleEeAutoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cn = buildCn(eeAutoData);
      const extensions = cleanupExtensions(eeAutoExt, false);
      await issueEeAutogen(
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
      await issueEeFromCsr(
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
    setData: React.Dispatch<React.SetStateAction<any>>,
    opts?: { cnRegex?: string; cnError?: string } // optional CN regex + inline error
  ) => {
    return (
      <>
        <input
          type="text"
          placeholder="Common Name (CN)"
          value={data.cn}
          onChange={(e) => {
            setData({ ...data, cn: e.target.value });
            // live CN validation + inline error
            const re = toRegExp(opts?.cnRegex);
            if (opts?.cnRegex && opts.cnRegex.trim()) {
              if (!re) {
                setIntCnError(`Invalid CN regex in template: ${opts?.cnRegex}`);
              } else if (e.target.value && !re.test(e.target.value)) {
                setIntCnError(`CN does not match pattern: ${opts?.cnRegex}`);
              } else {
                setIntCnError("");
              }

            } else {
              setIntCnError("");
            }
          }}
          required
          className={`ext-input ${opts?.cnError ? "ext-input-error" : ""}`}
          aria-invalid={!!opts?.cnError}
        />
        {opts?.cnError && (
          <div className="ext-error" role="alert">
            {opts.cnError}
          </div>
        )}

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
  };

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
              onChange={(e) =>
                setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)
              }
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

          {/* CN respects template CN regex (if any) and shows inline error */}
          {renderX500Inputs(intData, setIntData, { cnRegex: intCnRegex, cnError: intCnError })}

          <input
            type="number"
            min="1"
            value={intData.ttlDays}
            onChange={(e) =>
              setIntData({ ...intData, ttlDays: Number(e.target.value) })
            }
            required
          />

          {/* Intermediate: CA mode with KU/EKU locks; SAN validated by regex (not locked) */}
          <ExtensionsPanel
            value={intExt}
            onChange={setIntExt}
            isCa
            templateLocks={intLocked}
            sanRegex={intSanRegex}
          />

          <button type="submit" disabled={!!intCnError}>
            Create Intermediate CA
          </button>
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


