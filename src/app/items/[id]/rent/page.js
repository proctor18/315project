"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

function fmtPrice(v) {
  const n = Number(v);
  if (!isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function getDays(start, end) {
  if (!start || !end) return 0;
  return Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000));
}
function genId() { return "R" + Date.now().toString().slice(-6); }

export default function RentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [returnDate, setReturnDate] = useState("");
  const [rentalType, setRentalType] = useState("daily");
  const [pickupLoc, setPickupLoc] = useState("");
  const [returnLoc, setReturnLoc] = useState("");
  const [payMethod, setPayMethod] = useState("credit_card");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("items").select("*").eq("id", id).maybeSingle(),
      supabase.from("locations").select("*").eq("status", "active"),
    ]).then(([ir, lr]) => {
      setItem(ir.data ?? null);
      const locs = lr.data ?? [];
      setLocations(locs);
      if (ir.data?.location_id) { setPickupLoc(ir.data.location_id); setReturnLoc(ir.data.location_id); }
      setLoaded(true);
    });
  }, [id]);

  const days = getDays(startDate, returnDate);
  let basePrice = 0;
  if (item) {
    if (rentalType === "daily") basePrice = Number(item.daily_rate || 0) * days;
    else if (rentalType === "weekly") basePrice = Number(item.weekly_rate || 0) * Math.ceil(days / 7);
    else basePrice = Number(item.semester_rate || 0);
  }
  const deposit = Number(item?.deposit_amount || 0);
  const locationFee = pickupLoc && returnLoc && pickupLoc !== returnLoc ? 10 : 0;
  const total = basePrice + deposit + locationFee;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }
    if (!returnDate || new Date(returnDate) <= new Date(startDate)) {
      setMessage("Return date must be after start date."); return;
    }
    setSaving(true); setMessage("");
    try {
      const rentalId = genId();
      const { error } = await supabase.from("rental_transactions").insert({
        id: rentalId, renter_id: user.id, item_id: item.id,
        pickup_location_id: pickupLoc, return_location_id: returnLoc || pickupLoc,
        start_date: startDate, expected_return_date: returnDate,
        rental_type: rentalType, num_days: days, base_price: basePrice,
        deposit_amount: deposit, location_change_fee: locationFee,
        total_cost: total, payment_method: payMethod,
        status: "pending", // ← pending until seller approves
      });
      if (error) throw error;

      // Send an automatic message to the seller notifying them of the request
      await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: item.owner_id,
        body: `📦 Rental request for "${item.name}" (ID: ${rentalId}) from ${startDate} to ${returnDate}. Please go to My Listed Items → Rental Requests to approve or decline.`,
      });

      router.push(`/rentals/${rentalId}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to submit.");
      setSaving(false);
    }
  }

  if (!loaded) return <div><Header /><div className="container"><div className="centerNotice" style={{ marginTop: 24 }}>Loading...</div></div></div>;
  if (!item) return <div><Header /><div className="container"><div className="centerNotice" style={{ marginTop: 24 }}>Item not found.</div></div></div>;

  return (
    <div>
      <Header />
      <div className="container" style={{ paddingTop: 24 }}>
        <Link href={`/items/${id}`} style={{ fontSize: 13, color: "var(--text-muted)" }}>← Back to item</Link>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: 24, marginTop: 20, alignItems: "start" }}>
          {/* Item Summary */}
          <div>
            {item.photo_url
              ? <img src={item.photo_url} alt={item.name} style={{ width: "100%", borderRadius: 14, border: "1px solid var(--line)", aspectRatio: "4/3", objectFit: "cover" }} />
              : <div style={{ width: "100%", aspectRatio: "4/3", background: "#f1f5f9", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>No image</div>}
          </div>

          {/* Form */}
          <div>
            <div className="rentFormCard">
              <div className="rentFormHeader">Rent Item Details</div>
              <div className="rentFormBody">
                {/* Item summary */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{item.name}</p>
                  <p className="meta">Condition: {item.condition?.replace("_"," ") ?? "—"}</p>
                  <p className="meta">Seller: {item.owner_name || item.owner_email}</p>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Required fields notice */}
                  <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 14px" }}>Required fields must be filled out</p>

                  {/* Rental Period */}
                  <div className="rentFormSection">
                    <p className="rentFormSectionTitle">Rental Period</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div className="field">
                        <label className="label">Start Date</label>
                        <input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} required />
                      </div>
                      <div className="field">
                        <label className="label">Expected Return</label>
                        <input type="date" value={returnDate} min={startDate} onChange={(e) => setReturnDate(e.target.value)} required />
                      </div>
                    </div>
                    <div className="field">
                      <label className="label">Rental Type</label>
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        {["daily","weekly","monthly","semester"].map((t) => (
                          <label key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
                            <input type="radio" name="type" value={t} checked={rentalType === t} onChange={() => setRentalType(t)} style={{ width: 16, height: 16, margin: 0, padding: 0, flexShrink: 0 }} />
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>
                    {returnDate && <p className="meta">How many days: <strong>{days}</strong></p>}
                  </div>

                  {/* Locations */}
                  <div className="rentFormSection">
                    <p className="rentFormSectionTitle">Locations</p>
                    <div className="field">
                      <label className="label">Pickup Location</label>
                      <select value={pickupLoc} onChange={(e) => setPickupLoc(e.target.value)} required>
                        <option value="">Select location</option>
                        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="label">Return Location</label>
                      <select value={returnLoc} onChange={(e) => setReturnLoc(e.target.value)} required>
                        <option value="">Select location</option>
                        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                      {locationFee > 0 && <p className="meta" style={{ color: "var(--warning)", marginTop: 4 }}>⚠ $10 cross-location fee applies</p>}
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="rentFormSection">
                    <p className="rentFormSectionTitle">Cost Breakdown</p>
                    <div className="costRow"><span>Base Cost ({rentalType}{rentalType==="daily"?` × ${days}d`:""})</span><span>{fmtPrice(basePrice)}</span></div>
                    <div className="costRow"><span>Deposit (Refundable)</span><span>{fmtPrice(deposit)}</span></div>
                    <div className="costRow"><span>Location Change Fee</span><span>{fmtPrice(locationFee)}</span></div>
                    <div className="costRowTotal"><span>Total</span><span>{fmtPrice(total)}</span></div>
                  </div>

                  <div className="rentFormSection">
                    <p className="rentFormSectionTitle">Payment Method</p>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      {[["credit_card","Credit Card"],["debit_card","Debit Card"],["paypal","PayPal"]].map(([v, l]) => (
                        <label key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
                          <input type="radio" name="pay" value={v} checked={payMethod === v} onChange={() => setPayMethod(v)} style={{ width: 16, height: 16, margin: 0, padding: 0, flexShrink: 0 }} />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn btnPrimary" style={{ width: "100%" }} disabled={saving || !user}>
                    {saving ? "Processing..." : "Request to Rent"}
                  </button>
                  {!user && <p className="meta" style={{ color: "var(--danger)", marginTop: 8, textAlign: "center" }}>
                    Please <Link href="/login">log in</Link> to rent.
                  </p>}
                  {message && <p className="messageText errorText" style={{ marginTop: 8 }}>{message}</p>}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
