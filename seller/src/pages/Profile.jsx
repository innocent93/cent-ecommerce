import React, { useState } from "react";
import { toast } from "react-toastify";
import api from "../utils/api";
import StatusTag from "../components/StatusTag";

const Profile = ({ seller, onSellerUpdated }) => {
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/seller/bank-details", { accountNumber, bankCode, accountName });
      if (data.success) {
        toast.success("Bank details saved");
        onSellerUpdated(data.seller);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't save your bank details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-500">Business profile</h1>
      <p className="mt-1 text-sm text-muted">Your account details and where payouts are sent.</p>

      <div className="mt-6 panel p-6">
        <h2 className="font-display text-lg text-ink-500">Business verification</h2>
        <p className="mt-1 text-sm text-muted">Upload your CAC/business certificate. UrbanStep must approve it before you can sell.</p>
        <div className="mt-4 rounded border border-ink-100 bg-paper p-4 text-sm">
          <div className="flex items-center justify-between gap-3"><span>Current document</span>{seller?.certificate?.url ? <a href={seller.certificate.url} target="_blank" rel="noreferrer" className="underline">View certificate</a> : <span className="text-muted">Not uploaded</span>}</div>
          <input className="field-input mt-4" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/avif" onChange={(e)=>setCertificate(e.target.files?.[0]||null)} />
          <button type="button" disabled={!certificate||uploadingCertificate} onClick={async()=>{ if(certificate.size>5*1024*1024){toast.error("Certificate must be 5MB or smaller");return;} setUploadingCertificate(true); try{const fd=new FormData();fd.append("businessCertificate",certificate);const {data}=await api.post("/api/seller/business-certificate",fd,{headers:{"Content-Type":"multipart/form-data"}}); if(data.success){toast.success("Certificate uploaded");onSellerUpdated(data.seller);setCertificate(null)}}catch(error){toast.error(error.response?.data?.message||"Upload failed")}finally{setUploadingCertificate(false)}}} className="btn-ochre mt-3">{uploadingCertificate?"Uploading…":"Upload certificate"}</button>
          <p className="mt-2 text-xs text-muted">PDF/JPG/PNG/WEBP · maximum 5MB.</p>
        </div>
      </div>
      <div className="mt-6 panel p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink-500">{seller?.businessName}</h2>
          <StatusTag status={seller?.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted">Owner</dt>
            <dd className="mt-0.5 text-ink-500">{seller?.ownerName}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="mt-0.5 text-ink-500">{seller?.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Phone</dt>
            <dd className="mt-0.5 text-ink-500">{seller?.phone || "\u2014"}</dd>
          </div>
          <div>
            <dt className="text-muted">Bank details</dt>
            <dd className="mt-0.5 text-ink-500">{seller?.hasBankDetails ? "On file" : "Not added yet"}</dd>
          </div>
        </dl>
        {seller?.status === "pending" && (
          <p className="mt-4 rounded border border-ochre-500 bg-ochre-50 px-4 py-3 text-sm text-ink-600">
            Your account is awaiting admin approval. You can add your bank details now, but product
            listings will stay off until you're approved.
          </p>
        )}
      </div>

      <div className="mt-6 panel p-6">
        <h2 className="font-display text-lg text-ink-500">Payout bank account</h2>
        <p className="mt-1 text-sm text-muted">
          Used by UrbanStep to send your payouts via Paystack transfer.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 max-w-sm space-y-4">
          <div>
            <label className="field-label" htmlFor="accountNumber">Account number</label>
            <input id="accountNumber" required className="field-input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="bankCode">Bank code</label>
            <input id="bankCode" required className="field-input" value={bankCode} onChange={(e) => setBankCode(e.target.value)} placeholder="e.g. 058 for GTBank" />
            <p className="mt-1 text-xs text-muted">
              Paystack's bank codes list is at{" "}
              <a href="https://paystack.com/docs/payments/payment-channels/#bank-transfer" target="_blank" rel="noreferrer" className="underline">
                paystack.com
              </a>.
            </p>
          </div>
          <div>
            <label className="field-label" htmlFor="accountName">Account name</label>
            <input id="accountName" required className="field-input" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Must match your bank account exactly" />
          </div>
          <button type="submit" disabled={submitting} className="btn-ochre w-full">
            {submitting ? "Saving\u2026" : "Save bank details"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
