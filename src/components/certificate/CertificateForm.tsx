import React, { useState } from 'react';
import axios from 'axios';
import './CertificateForm.css';


interface CertificateFormsProps {
  role: 'ADMIN' | 'CA_USER' | 'USER' | null;
}

const  CertificateForm: React.FC<CertificateFormsProps> = ({ role }) => {
    if (!role) {
    return <p>Please log in</p>; // or render nothing
  }
  const [rootData, setRootData] = useState({ cn: '', ttlDays: 365 });
  const [intData, setIntData] = useState({ issuerId: '', cn: '', ttlDays: 365 });
  const [eeAutoData, setEeAutoData] = useState({ issuerId: '', cn: '', ttlDays: 365, storePrivateKey: false });
  const [eeCsrData, setEeCsrData] = useState<{
  issuerId: string;
  ttlDays: number;
  csr: File | null; // ✅ now csr can be a File or null
}>({ issuerId: '', ttlDays: 365, csr: null });

  const handleRootSubmit = async (e : React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/cert/root', rootData);
      alert(`Root CA created with ID ${res.data}`);
    } catch (err) {
        if (axios.isAxiosError(err)) {
            // err is now typed as AxiosError
            alert(err.response?.data || err.message);
        } else if (err instanceof Error) {
            // generic JS error
            alert(err.message);
        } else {
            alert('Unknown error occurred');
        }
    }
  };

  const handleIntSubmit = async (e : React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/cert/intermediate', intData);
      alert(`Intermediate CA created with ID ${res.data}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        // err is now typed as AxiosError
        alert(err.response?.data || err.message);
    } else if (err instanceof Error) {
        // generic JS error
        alert(err.message);
    } else {
        alert('Unknown error occurred');
    }
    }
  };

  const handleEeAutoSubmit = async (e : React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/cert/ee/autogen', eeAutoData);
      alert(`EE Certificate created with ID ${res.data}`);
    } catch (err) {
     if (axios.isAxiosError(err)) {
    // err is now typed as AxiosError
    alert(err.response?.data || err.message);
  } else if (err instanceof Error) {
    // generic JS error
    alert(err.message);
  } else {
    alert('Unknown error occurred');
  }
    }
  };

  const handleEeCsrSubmit = async (e : React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('issuerId', eeCsrData.issuerId);
      formData.append('ttlDays', eeCsrData.ttlDays.toString());
        if (eeCsrData.csr) {
            formData.append('csr', eeCsrData.csr); // csr is File, which is Blob
        } else {
            alert('Please upload a CSR file');
            return;
        }
      const res = await axios.post('/api/cert/ee/from-csr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert(`EE Certificate created from CSR with ID ${res.data}`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
    // err is now typed as AxiosError
    alert(err.response?.data || err.message);
  } else if (err instanceof Error) {
    // generic JS error
    alert(err.message);
  } else {
    alert('Unknown error occurred');
  }
    }
  };

  return (
    <div className="certificate-forms">
      {role === 'ADMIN' && (
        <form onSubmit={handleRootSubmit}>
          <h2>Root CA</h2>
          <input
            type="text"
            placeholder="Common Name (CN)"
            value={rootData.cn}
            onChange={(e) => setRootData({ ...rootData, cn: e.target.value })}
            required
          />
          <input
            type="number"
            min="1"
            value={rootData.ttlDays}
            onChange={(e) => setRootData({ ...rootData, ttlDays: Number(e.target.value) })}
            required
          />
          <button type="submit">Create Root CA</button>
        </form>
      )}

      {(role === 'ADMIN' || role === 'CA_USER') && (
        <form onSubmit={handleIntSubmit}>
          <h2>Intermediate CA</h2>
          <input
            type="number"
            placeholder="Issuer CA ID"
            value={intData.issuerId}
            onChange={(e) => setIntData({ ...intData, issuerId: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Common Name (CN)"
            value={intData.cn}
            onChange={(e) => setIntData({ ...intData, cn: e.target.value })}
            required
          />
          <input
            type="number"
            min="1"
            value={intData.ttlDays}
            onChange={(e) => setIntData({ ...intData, ttlDays: Number(e.target.value) })}
            required
          />
          <button type="submit">Create Intermediate CA</button>
        </form>
      )}

      <form onSubmit={handleEeAutoSubmit}>
        <h2>EE Certificate (Auto-generated)</h2>
        <input
          type="number"
          placeholder="Issuer CA ID"
          value={eeAutoData.issuerId}
          onChange={(e) => setEeAutoData({ ...eeAutoData, issuerId: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Common Name (CN)"
          value={eeAutoData.cn}
          onChange={(e) => setEeAutoData({ ...eeAutoData, cn: e.target.value })}
          required
        />
        <input
          type="number"
          min="1"
          value={eeAutoData.ttlDays}
          onChange={(e) => setEeAutoData({ ...eeAutoData, ttlDays: Number(e.target.value)})}
          required
        />
        <label>
          Store Private Key
          <input
            type="checkbox"
            checked={eeAutoData.storePrivateKey}
            onChange={(e) => setEeAutoData({ ...eeAutoData, storePrivateKey: e.target.checked })}
          />
        </label>
        <button type="submit">Generate EE Certificate</button>
      </form>

      <form onSubmit={handleEeCsrSubmit} encType="multipart/form-data">
        <h2>EE Certificate (From CSR)</h2>
        <input
          type="number"
          placeholder="Issuer CA ID"
          value={eeCsrData.issuerId}
          onChange={(e) => setEeCsrData({ ...eeCsrData, issuerId: e.target.value })}
          required
        />
        <input
          type="number"
          min="1"
          value={eeCsrData.ttlDays}
          onChange={(e) => setEeCsrData({ ...eeCsrData, ttlDays: Number(e.target.value) })}
          required
        />
        <input
          type="file"
          accept=".csr"
          onChange={(e) =>
  setEeCsrData({ ...eeCsrData, csr: e.target.files?.[0] ?? null })
}
          required
        />
        <button type="submit">Generate EE from CSR</button>
      </form>
    </div>
  );
};

export default CertificateForm;
