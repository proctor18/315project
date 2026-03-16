"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}
function fmtPrice(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v) || 0);
}

export default function RentalReceiptPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [rental, setRental] = useState(null);
  const [item, setItem] = useState(null);
  const [pickupLoc, setPickupLoc] = useState(null);
  const [returnLoc, setReturnLoc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    supabase.from("rental_transactions").select("*").eq("id", id).eq("renter_id", user.id).maybeSingle()
      .then(async ({ data: r }) => {
        if (!r) { setLoaded(true); return; }
        setRental(r);
        const [ir, pl, rl] = await Promise.all([
          supabase.from("items").select("*").eq("id", r.item_id).maybeSingle(),
          supabase.from("locations").select("*").eq("id", r.pickup_location_id).maybeSingle(),
          supabase.from("locations").select("*").eq("id", r.return_location_id ?? "").maybeSingle(),
        ]);
        setItem(ir.data); setPickupLoc(pl.data); setReturnLoc(rl.data);
        setLoaded(true);
      });
  }, [id, user]);

  useEffect(() => {
    if (!rental || rental.status !== "pending") return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("rental_transactions").select("status").eq("id", id).maybeSingle();
      if (data && data.status !== "pending") {
        setRental((prev) => ({ ...prev, status: data.status }));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [rental?.status, id]);

  if (!loaded) return <div><Header /><div className="container"><div className="centerNotice containerPt24">Loading...</div></div></div>;
  if (!rental) return <div><Header /><div className="container"><div className="centerNotice containerPt24">Rental not found.</div></div></div>;

  const pmLabel = { credit_card: "Credit Card", debit_card: "Debit Card", paypal: "PayPal" }[rental.payment_method] ?? rental.payment_method;

  // ── PENDING STATE ──────────────────────────────────────────────────
  if (rental.status === "pending") {
    return (
      <div>
        <Header />
        <div className="container containerPt32">
          <div className="receiptPageCenter">
            <div className="receiptStatusIcon receiptStatusIconPending">⏳</div>
            <h1 className="receiptStatusH1">Request Sent!</h1>
            <p className="receiptStatusSub">
              Your rental request for <strong>{item?.name}</strong> has been sent to the seller. This page will update automatically once they respond.
            </p>
            <div className="receiptDetailsBox">
              <p className="receiptDetailsTitle">Request Details</p>
              <p className="receiptDetailsMeta">Rental ID: <strong>{rental.id}</strong></p>
              <p className="receiptDetailsMeta">Item: <strong>{item?.name}</strong></p>
              <p className="receiptDetailsMeta">Period: <strong>{fmtDate(rental.start_date)} → {fmtDate(rental.expected_return_date)}</strong></p>
              <p className="receiptDetailsMetaLast">Total: <strong>{fmtPrice(rental.total_cost)}</strong></p>
            </div>
            <p className="receiptPolling">
              Waiting for seller response... <span className="receiptPollingDot">●</span>
            </p>
            <div className="actions receiptActionsCenter">
              <Link href="/messages" className="btn btnGhost">Message Seller</Link>
              <Link href="/my-rentals" className="btn btnGhost">My Rentals</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DENIED STATE ───────────────────────────────────────────────────
  if (rental.status === "cancelled" || rental.status === "denied") {
    return (
      <div>
        <Header />
        <div className="container containerPt32">
          <div className="receiptPageCenter">
            <div className="receiptStatusIcon receiptStatusIconDenied">✕</div>
            <h1 className="receiptStatusH1">Request Declined</h1>
            <p className="receiptStatusSub">
              Unfortunately the seller declined your rental request for <strong>{item?.name}</strong>. No payment has been taken.
            </p>
            <div className="actions receiptActionsCenter">
              <Link href={`/items/${rental.item_id}`} className="btn btnPrimary">Back to Item</Link>
              <Link href="/items" className="btn btnGhost">Browse More</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CONFIRMED/ACTIVE STATE ─────────────────────────────────────────
  return (
    <div>
      <Header />
      <div className="container containerPt32">
        {/* Confirmation banner */}
        <div className="receiptConfirmBanner">
          <div className="receiptStatusIconConfirmed">✓</div>
          <h1 className="receiptConfirmH1">Rental Confirmed!</h1>
          <p className="receiptConfirmSub">
            Rental confirmation has been sent to {user?.email}
          </p>
        </div>

        <div className="receiptCard">
          <div className="receiptHeader">
            <p className="receiptTitle">Rental Receipt</p>
            <p className="receiptSub">Rental ID: {rental.id}</p>
          </div>
          <div className="receiptBody">
            <div className="receiptSection">
              <div className="receiptRow"><span className="receiptLabel">Rental ID:</span><strong className="receiptVal">{rental.id}</strong></div>
              <div className="receiptRow"><span className="receiptLabel">Date:</span><span className="receiptVal">{fmtDate(rental.created_at)}</span></div>
            </div>

            {item && (
              <div className="receiptSection">
                <p className="receiptSectionTitle">Item</p>
                <div className="receiptRow"><span className="receiptLabel">Item:</span><strong className="receiptVal">{item.name}</strong></div>
                <div className="receiptRow"><span className="receiptLabel">Category:</span><span className="receiptVal">{item.category_id ?? "—"}</span></div>
              </div>
            )}

            <div className="receiptSection">
              <p className="receiptSectionTitle">Rental Period</p>
              <div className="receiptRow"><span className="receiptLabel">Start:</span><strong className="receiptVal">{fmtDate(rental.start_date)}</strong></div>
              <div className="receiptRow"><span className="receiptLabel">Return:</span><strong className="receiptVal">{fmtDate(rental.expected_return_date)}</strong></div>
              <div className="receiptRow"><span className="receiptLabel">Type:</span><span className="receiptVal receiptTypeVal">{rental.rental_type}</span></div>
              <div className="receiptRow"><span className="receiptLabel">Number of days:</span><span className="receiptVal">{rental.num_days} {rental.num_days === 1 ? "Day" : "Days"}</span></div>
            </div>

            {pickupLoc && (
              <div className="receiptSection">
                <p className="receiptSectionTitle">Pickup Location</p>
                <div className="receiptRow"><span className="receiptLabel">Location:</span><span className="receiptVal">{pickupLoc.name}</span></div>
                <div className="receiptRow"><span className="receiptLabel">Address:</span><span className="receiptVal">{pickupLoc.building}</span></div>
                <div className="receiptRow"><span className="receiptLabel">Hours:</span><span className="receiptVal">{pickupLoc.hours}</span></div>
              </div>
            )}
            {returnLoc && (
              <div className="receiptSection">
                <p className="receiptSectionTitle">Return Location</p>
                <div className="receiptRow"><span className="receiptLabel">Location:</span><span className="receiptVal">{returnLoc.name}</span></div>
              </div>
            )}

            <div className="receiptSection">
              <p className="receiptSectionTitle">Cost Summary</p>
              <div className="costRow receiptCostRow"><span>Base Cost</span><span>{fmtPrice(rental.base_price)}</span></div>
              <div className="costRow receiptCostRow"><span>Deposit (Refundable)</span><span>{fmtPrice(rental.deposit_amount)}</span></div>
              <div className="costRow receiptCostRow"><span>Location Change Fee:</span><span>{fmtPrice(rental.location_change_fee)}</span></div>
              <div className="costRowTotal"><span>Total Paid:</span><span>{fmtPrice(rental.total_cost)}</span></div>
            </div>

            <div className="receiptSection">
              <p className="receiptSectionTitle">Payment Method</p>
              <p className="receiptPaymentLabel">{pmLabel}</p>
            </div>

            <div className="receiptImportantBox">
              <p className="receiptImportantTitle">Important Information:</p>
              <ul className="receiptImportantList">
                <li>Please bring your student ID when picking up the item</li>
                <li>Late returns incur 1.5× daily rate per day late</li>
                <li>Returns &gt;15 days late may result in account suspension</li>
                <li>Deposit will be refunded upon return in good condition</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="actions receiptActionsMt">
          <Link href="/my-rentals" className="btn btnPrimary">View My Rentals</Link>
          <Link href="/items" className="btn btnGhost">Browse More Items</Link>
        </div>
      </div>
    </div>
  );
}
