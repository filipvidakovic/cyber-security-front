import React, { useState } from 'react';
import {
  createRoot,
  createIntermediate,
  issueEeAutogen,
  issueEeFromCsr,
} from '../../services/CertificateService'; 
import './CertificateForm.css';

interface CertificateFormsProps {
  role: 'ADMIN' | 'CA_USER' | 'USER' | null;
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

  const [rootData, setRootData] = useState<X500Data & { ttlDays: number }>({ cn: '', ttlDays: 365 });
  const [intData, setIntData] = useState<X500Data & { issuerId: string; ttlDays: number }>({ issuerId: '', cn: '', ttlDays: 365 });
  const [eeAutoData, setEeAutoData] = useState<X500Data & { issuerId: string; ttlDays: number; storePrivateKey: boolean }>({ issuerId: '', cn: '', ttlDays: 365, storePrivateKey: false });
  const [eeCsrData, setEeCsrData] = useState<{ issuerId: string; ttlDays: number; csr: File | null }>({ issuerId: '', ttlDays: 365, csr: null });

  const escapeDnValue = (val: string) => {
  return val.replace(/[,+=<>;"\\]/g, '\\$&');
};

const buildCn = (x500: X500Data) => {
  const parts = [
    x500.cn && `CN=${escapeDnValue(x500.cn)}`,
    x500.ou && `OU=${escapeDnValue(x500.ou)}`,
    x500.o && `O=${escapeDnValue(x500.o)}`,
    x500.l && `L=${escapeDnValue(x500.l)}`,
    x500.st && `ST=${escapeDnValue(x500.st)}`,
    x500.c && `C=${escapeDnValue(x500.c)}`,
  ].filter(Boolean);
  return parts.join(', ');
};


  const handleRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const cn = buildCn(rootData); // concatenated X500 string
        const id = await createRoot(cn, rootData.ttlDays); // pass string directly
        alert(`Root CA created with ID ${id}`);
    } catch (err: any) {
        alert(err.response?.data || err.message || 'Unknown error occurred');
    }
    };


  const handleIntSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cn = buildCn(intData);
      const id = await createIntermediate(Number(intData.issuerId), cn, intData.ttlDays);
      alert(`Intermediate CA created with ID ${id}`);
    } catch (err: any) {
      alert(err.response?.data || err.message || 'Unknown error occurred');
    }
  };

  const handleEeAutoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cn = buildCn(eeAutoData);
      const id = await issueEeAutogen(Number(eeAutoData.issuerId), cn, eeAutoData.ttlDays, eeAutoData.storePrivateKey);
      alert(`EE Certificate created with ID ${id}`);
    } catch (err: any) {
      alert(err.response?.data || err.message || 'Unknown error occurred');
    }
  };

  const handleEeCsrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eeCsrData.csr) return alert('Please upload a CSR file');
    try {
      const id = await issueEeFromCsr(Number(eeCsrData.issuerId), eeCsrData.ttlDays, eeCsrData.csr);
      alert(`EE Certificate created from CSR with ID ${id}`);
    } catch (err: any) {
      alert(err.response?.data || err.message || 'Unknown error occurred');
    }
  };

  const renderX500Inputs = (data: X500Data, setData: React.Dispatch<React.SetStateAction<any>>) => (
    <>
      <input type="text" placeholder="Common Name (CN)" value={data.cn} onChange={e => setData({ ...data, cn: e.target.value })} required />
      <input type="text" placeholder="Organizational Unit (OU)" value={data.ou || ''} onChange={e => setData({ ...data, ou: e.target.value })} />
      <input type="text" placeholder="Organization (O)" value={data.o || ''} onChange={e => setData({ ...data, o: e.target.value })} />
      <input type="text" placeholder="Locality (L)" value={data.l || ''} onChange={e => setData({ ...data, l: e.target.value })} />
      <input type="text" placeholder="State (ST)" value={data.st || ''} onChange={e => setData({ ...data, st: e.target.value })} />
      <input type="text" placeholder="Country (C)" value={data.c || ''} onChange={e => setData({ ...data, c: e.target.value })} />
    </>
  );

  return (
    <div className="certificate-forms">
      {role === 'ADMIN' && (
        <form onSubmit={handleRootSubmit}>
          <h2>Root CA</h2>
          {renderX500Inputs(rootData, setRootData)}
          <input type="number" min="1" value={rootData.ttlDays} onChange={e => setRootData({ ...rootData, ttlDays: Number(e.target.value) })} required />
          <button type="submit">Create Root CA</button>
        </form>
      )}

      {(role === 'ADMIN' || role === 'CA_USER') && (
        <form onSubmit={handleIntSubmit}>
          <h2>Intermediate CA</h2>
          <input type="number" placeholder="Issuer CA ID" value={intData.issuerId} onChange={e => setIntData({ ...intData, issuerId: e.target.value })} required />
          {renderX500Inputs(intData, setIntData)}
          <input type="number" min="1" value={intData.ttlDays} onChange={e => setIntData({ ...intData, ttlDays: Number(e.target.value) })} required />
          <button type="submit">Create Intermediate CA</button>
        </form>
      )}

      <form onSubmit={handleEeAutoSubmit}>
        <h2>EE Certificate (Auto-generated)</h2>
        <input type="number" placeholder="Issuer CA ID" value={eeAutoData.issuerId} onChange={e => setEeAutoData({ ...eeAutoData, issuerId: e.target.value })} required />
        {renderX500Inputs(eeAutoData, setEeAutoData)}
        <input type="number" min="1" value={eeAutoData.ttlDays} onChange={e => setEeAutoData({ ...eeAutoData, ttlDays: Number(e.target.value) })} required />
        <label>
          Store Private Key
          <input type="checkbox" checked={eeAutoData.storePrivateKey} onChange={e => setEeAutoData({ ...eeAutoData, storePrivateKey: e.target.checked })} />
        </label>
        <button type="submit">Generate EE Certificate</button>
      </form>

      <form onSubmit={handleEeCsrSubmit} encType="multipart/form-data">
        <h2>EE Certificate (From CSR)</h2>
        <input type="number" placeholder="Issuer CA ID" value={eeCsrData.issuerId} onChange={e => setEeCsrData({ ...eeCsrData, issuerId: e.target.value })} required />
        <input type="number" min="1" value={eeCsrData.ttlDays} onChange={e => setEeCsrData({ ...eeCsrData, ttlDays: Number(e.target.value) })} required />
        <input type="file" accept=".csr, .pem" onChange={e => setEeCsrData({ ...eeCsrData, csr: e.target.files?.[0] ?? null })} required />
        <button type="submit">Generate EE from CSR</button>
      </form>
    </div>
  );
};

export default CertificateForm;
