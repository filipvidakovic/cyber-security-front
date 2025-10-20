export interface CertificateTemplate {
  id?: number;
  name: string;
  issuerId: number;
  cnRegex: string;
  sanRegex: string;
  ttlDays: number;
  keyUsage: string;
  extendedKeyUsage: string;
}