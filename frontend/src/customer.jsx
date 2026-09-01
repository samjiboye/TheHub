import React, { useState, useRef, useEffect } from "react";
import {
  Loader2, Upload, UserCircle, Wallet,
} from "lucide-react";
import { NIGERIA_LOCATIONS } from "./nigeriaLocations";
import { API_BASE, apiFetch } from "./api";
import { Header } from "./shared";
import { FONT_DISPLAY, NEUTRAL_HERO_GRADIENT, colors, inputStyle } from "./theme";

function CustomerProfileView({ token, onBack }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    apiFetch("/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setAddressState(data.address_state || "");
        setAddressCity(data.address_city || "");
        setAddressStreet(data.address_street || "");
      })
      .catch(() => {});
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const data = await apiFetch("/users/me", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone, address_state: addressState, address_city: addressCity, address_street: addressStreet }),
      });
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/users/me/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setProfile((prev) => ({ ...prev, profile_photo_url: data.profile_photo_url }));
    } catch (err) {
      setError(err.message || "Couldn't upload that photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!profile) {
    return (
      <div className="pb-8" style={{ background: NEUTRAL_HERO_GRADIENT, minHeight: "100vh" }}>
        <Header title="My Profile" onBack={onBack} />
        <div className="flex justify-center mt-10"><Loader2 size={24} className="animate-spin" color={colors.hairline} /></div>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="My Profile" onBack={onBack} />
      <div className="px-4 mt-4 flex flex-col gap-3 max-w-xl mx-auto w-full">

        <div className="flex flex-col items-center py-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: colors.panelLight, border: `3px solid ${colors.hairline}` }}
          >
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle size={48} color={colors.hairline} />
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="mt-3 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2"
            style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
          >
            {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploadingPhoto ? "Uploading..." : "Change photo"}
          </button>
        </div>

        <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
          <h3 className="text-lg mb-3" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>Your details</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full pb-2 mb-3 text-base outline-none"
            style={inputStyle}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full pb-2 mb-1 text-base outline-none"
            style={inputStyle}
          />
          <p className="text-xs mt-3" style={{ color: colors.creamDim }}>Email</p>
          <p className="text-sm" style={{ color: colors.cream }}>{profile.email}</p>
        </div>

        <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
          <h3 className="text-lg mb-1" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>Home address</h3>
          <p className="text-xs mb-3" style={{ color: colors.creamDim }}>
            Save this once so you don't have to retype it every time you book a home-service appointment.
          </p>
          <select
            value={addressState}
            onChange={(e) => { setAddressState(e.target.value); setAddressCity(""); }}
            className="w-full pb-2 mb-3 text-base outline-none"
            style={inputStyle}
          >
            <option value="">Select state</option>
            {NIGERIA_LOCATIONS.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
          </select>
          <select
            value={addressCity}
            onChange={(e) => setAddressCity(e.target.value)}
            disabled={!addressState}
            className="w-full pb-2 mb-3 text-base outline-none"
            style={inputStyle}
          >
            <option value="">Select city</option>
            {(NIGERIA_LOCATIONS.find((s) => s.state === addressState)?.cities || []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            value={addressStreet}
            onChange={(e) => setAddressStreet(e.target.value)}
            placeholder="Street address"
            className="w-full pb-2 text-base outline-none"
            style={inputStyle}
          />
        </div>

        {error && <p className="text-sm" style={{ color: "#E07A5F" }}>{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: colors.hairline, color: "#FFFFFF" }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>

        <div className="rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}>
          <p className="text-sm font-bold mb-1" style={{ color: colors.cream }}>👥 Invite friends, earn points</p>
          <p className="text-xs mb-3" style={{ color: colors.creamDim }}>
            You earn 60 points and they earn 30 once their first booking is complete.
          </p>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex-1 px-4 py-3 rounded-xl text-base font-bold text-center tracking-wide"
              style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
            >
              {profile.referral_code}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile.referral_code).then(() => {
                  setReferralCopied(true);
                  setTimeout(() => setReferralCopied(false), 2000);
                });
              }}
              className="px-4 py-3 rounded-xl text-sm font-bold shrink-0"
              style={{ background: colors.hairline, color: "#FFFFFF" }}
            >
              {referralCopied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(referralLink).then(() => {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              });
            }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: `2px solid ${colors.hairline}`, color: colors.cream }}
          >
            {linkCopied ? "Link copied!" : "Copy shareable link instead"}
          </button>
        </div>
      </div>
    </div>
  );
}


function WalletView({ token, onBack }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState(null);
  const [loyaltyCount, setLoyaltyCount] = useState(0);
  const [loyaltyGoal, setLoyaltyGoal] = useState(5);
  const [loyaltyReward, setLoyaltyReward] = useState(1000);
  const [referralCode, setReferralCode] = useState("");
  const [referralsCompleted, setReferralsCompleted] = useState(0);
  const [referralCopied, setReferralCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch("/wallet/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setBalance(data.balance || 0);
        setTransactions(data.transactions || []);
        setLoyaltyCount(data.loyaltyCount || 0);
        setLoyaltyGoal(data.loyaltyGoal || 5);
        setLoyaltyReward(data.loyaltyReward || 1000);
        setReferralCode(data.referralCode || "");
        setReferralsCompleted(data.referralsCompleted || 0);
        setError(null);
      })
      .catch(() => setError("Couldn't load your wallet."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleFund = async () => {
    const amount = parseFloat(fundAmount);
    if (!amount || amount <= 0) {
      setFundError("Enter a valid amount.");
      return;
    }
    setFunding(true);
    setFundError(null);
    try {
      const { url } = await apiFetch("/wallet/fund", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      window.location.href = url;
    } catch (e) {
      setFundError(e.message || "Couldn't start funding — try again.");
      setFunding(false);
    }
  };

  const TX_LABELS = { fund: "Wallet top-up", debit: "Booking payment", refund: "Refund", reward: "Loyalty reward" };

  return (
    <div className="pb-8 transition-[background] duration-500" style={{ background: NEUTRAL_HERO_GRADIENT }}>
      <Header title="Wallet" onBack={onBack} />
      <div className="px-4 max-w-xl mx-auto w-full">
        <div className="mt-2 rounded-2xl px-5 py-6 text-center" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <p className="text-sm" style={{ color: colors.creamDim }}>Wallet balance</p>
          <p className="text-4xl mt-1" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 800 }}>
            ₦{Number(balance).toLocaleString()}
          </p>
        </div>

        <div className="mt-4 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold" style={{ color: colors.cream }}>🎁 Loyalty reward</p>
            <p className="text-xs" style={{ color: colors.creamDim }}>{loyaltyCount}/{loyaltyGoal} points</p>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ background: colors.panelLight, height: 10 }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (loyaltyCount / loyaltyGoal) * 100)}%`, background: colors.hairline }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: colors.creamDim }}>
            {loyaltyGoal - loyaltyCount > 0
              ? `Earn 1 point per ₦100 you spend through TheHub. ${loyaltyGoal - loyaltyCount} more points unlocks ₦${Number(loyaltyReward).toLocaleString()} in your wallet.`
              : `Reward unlocked on your next completed booking!`}
          </p>
        </div>

        {referralCode && (
          <div className="mt-4 rounded-2xl px-4 py-4" style={{ background: colors.panel, border: `3px solid ${colors.hairline}` }}>
            <p className="text-sm font-bold mb-1" style={{ color: colors.cream }}>👥 Invite friends, earn points</p>
            <p className="text-xs mb-3" style={{ color: colors.creamDim }}>
              You earn 60 points and they earn 30 once their first booking is complete.
              {referralsCompleted > 0 ? ` ${referralsCompleted} friend${referralsCompleted === 1 ? '' : 's'} joined so far.` : ""}
            </p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-4 py-3 rounded-xl text-base font-bold text-center tracking-wide"
                style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
              >
                {referralCode}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralCode).then(() => {
                    setReferralCopied(true);
                    setTimeout(() => setReferralCopied(false), 2000);
                  });
                }}
                className="px-4 py-3 rounded-xl text-sm font-bold shrink-0"
                style={{ background: colors.hairline, color: "#FFFFFF" }}
              >
                {referralCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <h3 className="mt-6 mb-3 text-lg" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>
          Top up
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            placeholder="Amount in ₦"
            className="flex-1 px-4 py-3 rounded-xl text-base outline-none"
            style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
          />
          <button
            onClick={handleFund}
            disabled={funding}
            className="px-5 py-3 rounded-xl text-base tap-glass"
            style={{ background: colors.hairline, color: "#FFFFFF", fontWeight: 700 }}
          >
            {funding ? <Loader2 size={18} className="animate-spin" /> : "Fund"}
          </button>
        </div>
        {fundError && <p className="text-sm mt-2" style={{ color: colors.creamDim }}>{fundError}</p>}

        <h3 className="mt-8 mb-3 text-lg" style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }}>
          History
        </h3>
        {loading && (
          <div className="flex justify-center pt-4">
            <Loader2 size={24} className="animate-spin" color={colors.creamDim} />
          </div>
        )}
        {error && <p className="text-sm text-center mt-4" style={{ color: colors.creamDim }}>{error}</p>}
        {!loading && !error && transactions.length === 0 && (
          <p className="text-sm py-4" style={{ color: colors.creamDim }}>No wallet activity yet.</p>
        )}
        <div className="flex flex-col gap-2 mt-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: colors.panel, border: `2px solid ${colors.hairline}` }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: colors.cream }}>{TX_LABELS[tx.type] || tx.type}</p>
                <p className="text-xs" style={{ color: colors.creamDim }}>
                  {new Date(tx.created_at).toLocaleDateString()} · {tx.status}
                </p>
              </div>
              <p className="text-base" style={{ color: tx.type === "debit" ? "#E07A5F" : colors.cream, fontWeight: 700 }}>
                {tx.type === "debit" ? "-" : "+"}₦{Number(tx.amount).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { CustomerProfileView, WalletView };