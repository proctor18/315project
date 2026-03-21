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
  const { user, isBanned } = useAuth();

  const [item, setItem] = useState(null);
  const [locations, setLocations] = useState([]);
  const [savedCards, setSavedCards] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [returnDate, setReturnDate] = useState("");
  const [rentalType, setRentalType] = useState("daily");
  const [pickupLoc, setPickupLoc] = useState("");
  const [returnLoc, setReturnLoc] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      supabase.from("items").select("*").eq("id", id).maybeSingle(),
      supabase.from("locations").select("*").eq("status", "active"),
      supabase.from("payment_methods").select("*").eq("user_id", user.id),
    ]).then(([ir, lr, pr]) => {
      setItem(ir.data ?? null);
      const locs = lr.data ?? [];
      setLocations(locs);
      if (ir.data?.location_id) {
        setPickupLoc(ir.data.location_id);
        setReturnLoc(ir.data.location_id);
      }
      const cards = pr.data ?? [];
      setSavedCards(cards);
      if (cards.length > 0) setSelectedCardId(cards[0].id);
      setLoaded(true);
    });
  }, [id, user]);

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
    if (isBanned) { setMessage("Your account has been suspended and cannot place rentals. Please contact support."); return; }
    if (!returnDate || new Date(returnDate) <= new Date(startDate)) {
      setMessage("Return date must be after start date."); return;
    }
    if (!selectedCardId) {
      setMessage("Please select a payment method. You can add one in Payment Methods."); return;
    }
    setSaving(true); setMessage("");
    try {
      const rentalId = genId();
      const { error } = await supabase.from("rental_transactions").insert({
        id: rentalId,
        renter_id: user.id,
        item_id: item.id,
        pickup_location_id: pickupLoc,
        return_location_id: returnLoc || pickupLoc,
        start_date: startDate,
        expected_return_date: returnDate,
        rental_type: rentalType,
        num_days: days,
        base_price: basePrice,
        deposit_amount: deposit,
        location_change_fee: locationFee,
        total_cost: total,
        payment_method_id: selectedCardId,
        status: "pending",
      });
      if (error) throw error;
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

  if (!loaded) return <div><Header /><div className="container"><div className="centerNotice containerPt24">Loading...</div></div></div>;
  if (!item) return <div><Header /><div className="container"><div className="centerNotice containerPt24">Item not found.</div></div></div>;

  return (
    <div>
      <Header />
      <div className="container containerPt24">
        <Link href={`/items/${id}`} className="backLink">← Back to item</Link>

        <div className="rentPageGrid">
          {/* Item Image */}
          <div>
            {item.photo_url
              ? <img src={item.photo_url} alt={item.name} className="rentItemImg" />
              : <div className="rentItemNoImg">No image</div>}
          </div>

          {/* Form */}
          <div>
            <div className="rentFormCard">
              <div className="rentFormHeader">Rent Item Details</div>
              <div className="rentFormBody">
                {/* Item summary */}
                <div className="rentItemSummary">
                  <p className="rentItemName">{item.name}</p>
                  <p className="meta">Condition: {item.condition?.replace("_", " ") ?? "—"}</p>
                  <p className="meta">Seller: {item.owner_name || item.owner_email}</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <p className="rentRequiredNote">Required fields must be filled out</p>

                  {/* Rental Period */}
                  <div className="rentFormSection">
                    <p className="rentFormSectionTitle">Rental Period</p>
                    <div className="rentDateGrid">
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
                      <div className="rentTypeRow">
                        {["daily", "weekly", "monthly", "semester"].map((t) => (
                          <label key={t} className="rentTypeLabel">
                            <input type="radio" name="type" value={t} checked={rentalType === t} onChange={() => setRentalType(t)} className="rentTypeRadio" />
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
                      {locationFee > 0 && <p className="meta rentLocationWarning">⚠ $10 cross-location fee applies</p>}
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="rentFormSection">
                    <p className="rentFormSectionTitle">Cost Breakdown</p>
                    <div className="costRow"><span>Base Cost ({rentalType}{rentalType === "daily" ? ` × ${days}d` : ""})</span><span>{fmtPrice(basePrice)}</span></div>
                    <div className="costRow"><span>Deposit (Refundable)</span><span>{fmtPrice(deposit)}</span></div>
                    <div className="costRow"><span>Location Change Fee</span><span>{fmtPrice(locationFee)}</span></div>
                    <div className="costRowTotal"><span>Total</span><span>{fmtPrice(total)}</span></div>
                  </div>

                  {/* Payment Method */}
                  <div className="rentFormSection">
                    <p className="rentFormSectionTitle">Payment Method</p>
                    {savedCards.length === 0 ? (
                      <p className="meta rentNoCardWarning">
                        No saved cards. <Link href="/payment-methods">Add a payment method</Link> before renting.
                      </p>
                    ) : (
                      <>
                        {savedCards.map((card) => (
                          <label
                            key={card.id}
                            className={`rentCardLabel ${selectedCardId === card.id ? "rentCardLabelSelected" : "rentCardLabelUnselected"}`}
                          >
                            <input
                              type="radio"
                              name="paymentCard"
                              value={card.id}
                              checked={selectedCardId === card.id}
                              onChange={() => setSelectedCardId(card.id)}
                              className="rentCardRadio"
                            />
                            <span>
                              <strong>{card.card_type}</strong> ending in {card.card_number?.slice(-4)}
                              <span className="rentCardExpiry">Exp: {card.expiry}</span>
                            </span>
                          </label>
                        ))}
                        <Link href="/payment-methods" className="rentManageLink">
                          + Manage payment methods
                        </Link>
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btnPrimary rentSubmitBtn"
                    disabled={saving || !user || savedCards.length === 0 || isBanned}
                  >
                    {saving ? "Processing..." : isBanned ? "Account Suspended" : "Request to Rent"}
                  </button>
                  {isBanned && (
                    <p className="messageText errorText actionsMt8">
                      Your account has been suspended. Please contact support.
                    </p>
                  )}
                  {!user && (
                    <p className="meta rentLoginNote">
                      Please <Link href="/login">log in</Link> to rent.
                    </p>
                  )}
                  {message && <p className="messageText errorText actionsMt8">{message}</p>}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
    
  );
}
