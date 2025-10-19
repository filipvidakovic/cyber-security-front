import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL + "cert";

const getAuthHeader = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const pruneExtensions = (ext?: Record<string, string>) => {
  if (!ext) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(ext)) {
    const val = (v ?? "").trim();
    if (val) out[k] = val;
  }
  return Object.keys(out).length ? out : undefined;
};

export async function createRoot(
  cn: string,
  ttlDays: number,
  extensions?: Record<string, string>
): Promise<number> {
  const reqBody = { cn, ttlDays, extensions: pruneExtensions(extensions) };
  const res = await axios.post(`${API_URL}/root`, reqBody, {
    headers: getAuthHeader(),
  });
  return res.data as number;
}

export async function createIntermediate(
  issuerId: number,
  cn: string,
  ttlDays: number,
  extensions?: Record<string, string>
) {
  const res = await axios.post(
    `${API_URL}/intermediate`,
    { issuerId, cn, ttlDays, extensions: pruneExtensions(extensions) },
    { headers: getAuthHeader() }
  );
  return res.data;
}

export async function issueEeAutogen(
  issuerId: number,
  cn: string,
  ttlDays: number,
  storePrivateKey: boolean,
  extensions?: Record<string, string>
) {
  const res = await axios.post(
    `${API_URL}/ee/autogen`,
    {
      issuerId,
      cn,
      ttlDays,
      storePrivateKey,
      extensions: pruneExtensions(extensions),
    },
    { headers: getAuthHeader() }
  );
  return res.data;
}

export async function issueEeFromCsr(
  issuerId: number,
  ttlDays: number,
  csrFile: File
) {
  const formData = new FormData();
  formData.append("csr", csrFile);
  formData.append("issuerId", String(issuerId));
  formData.append("ttlDays", String(ttlDays));
  const res = await axios.post(`${API_URL}/ee/from-csr`, formData, {
    headers: { "Content-Type": "multipart/form-data", ...getAuthHeader() },
  });
  return res.data;
}

export async function downloadP12(id: number, password: string) {
  const res = await axios.get(`${API_URL}/${id}/download.p12`, {
    responseType: "blob",
    headers: { "X-P12-Password": password, ...getAuthHeader() },
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = `cert-${id}.p12`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function getAllCertificates() {
  const res = await axios.get(`${API_URL}/admin`, { headers: getAuthHeader() });
  return res.data;
}

export async function getUserCertificates() {
  const res = await axios.get(`${API_URL}/user`, { headers: getAuthHeader() });
  return res.data;
}

export async function getIssuers() {
  const res = await axios.get(`${API_URL}/issuers`, { headers: getAuthHeader() });
  return res.data;
}
