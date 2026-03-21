"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdminLayout } from "../page.js";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}
function fmtPrice(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v) || 0);
}

const EMPTY_RETURN = {
  rental: null,
  goodCondition: null,   // true | false | null (unanswered)
  damageFee: "",
  lateDays: "",
};

export default function AdminRentalsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rentals, setRentals] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState({ text: "", type: "success" });
  const [returning, setReturning] = useState(EMPTY_RETURN);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/");
  }, [authLoading, user, isAdmin, router]);

  if (authLoading) return <div><Header /><div className="container"><div className="centerNotice containerPt24">Loading...</div></div></div>;
  if (!isAdmin) return null;

  async function load() {
    setLoaded(false);
    let q = supabase.from("rental_transactions").select("*").order("created_at", { ascending: false });
    if (statusFilter) q = q.eq("status", statusFilter);
    const { data } = await q;
    setRentals(data ?? []);
    setLoaded(true);
  }

  function showMsg(text, type = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "success" }), 6000);
  }

  function openReturnModal(r) {
    setReturning({ ...EMPTY_RETURN, rental: r });
  }

  function closeModal() {
    if (saving) return;
    setReturning(EMPTY_RETURN);
  }

  const r = returning.rental;
  const lateDays = Math.max(0, Number(returning.lateDays) || 0);
  const damageFee = Math.max(0, Number(returning.damageFee) || 0);
  const dailyRate = r ? Number(r.base_price) / Math.max(1, Number(r.num_days)) : 0;
  const lateFee = lateDays * dailyRate * 1.5;
  const depositAmount = r ? Number(r.deposit_amount || 0) : 0;
  const depositRefunded = returning.goodCondition === true;
  // Good condition = full deposit back; bad = forfeit deposit (keep it), still charge damage
  const totalOwed = lateFee + (returning.goodCondition === false ? damageFee : 0);
  const canSubmit = returning.goodCondition !== null;

  async function confirmReturn() {
    if (!r || !canSubmit) return;
    setSaving(true);
    try {
      const { error: rentalErr } = await supabase.from("rental_transactions").update({
        status: "returned",
        actual_return_date: new Date().toISOString().split("T")[0],
        late_fee: lateFee,
        damage_fee: returning.goodCondition === false ? damageFee : 0,
        deposit_refunded: depositRefunded,
      }).eq("id", r.id);

      if (rentalErr) throw rentalErr;

      await supabase.from("items")
        .update({ item_status: "available", available_quantity: 1 })
        .eq("id", r.item_id);

      if (lateDays > 15) {
        await supabase.from("profiles").update({ is_banned: true }).eq("id", r.renter_id);
        showMsg(`Return processed. User suspended — ${lateDays} days late.`, "error");
      } else {
        const depositMsg = depositRefunded ? "Deposit refunded." : "Deposit forfeited.";
        showMsg(`Return processed for rental ${r.id}. ${depositMsg}`, "success");
      }

      setReturning(EMPTY_RETURN);
      load();
    } catch (err) {
      showMsg("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Header />
      <AdminLayout>
        <div className="pageHead">
          <h1 className="adminPageH1">Manage Rentals</h1>
          <div className="adminStatusFilterRow">
            {["", "active", "overdue", "returned", "cancelled"].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`btn btnSm ${statusFilter === s ? "btnPrimary" : "btnGhost"}`}>
                {s || "All"}
              </button>
            ))}
          </div>
        </div>

        {message.text && (
          <p className="messageText" style={{
            color: message.type === "error" ? "var(--danger, #dc2626)" : "var(--success, #16a34a)",
            marginBottom: "16px",
          }}>
            {message.text}
          </p>
        )}

        <div className="card adminTableCard">
          <table className="table">
            <thead>
              <tr>
                <th>Rental ID</th>
                <th>Item</th>
                <th>Start</th>
                <th>Expected Return</th>
                <th>Type</th>
                <th>Total</th>
                <th>Deposit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loaded ? (
                <tr><td colSpan={9} className="adminTableEmpty">Loading...</td></tr>
              ) : rentals.length === 0 ? (
                <tr><td colSpan={9} className="adminTableEmpty">No rentals.</td></tr>
              ) : rentals.map((rental) => {
                const overdue = rental.status === "active" && new Date(rental.expected_return_date) < new Date();
                return (
                  <tr key={rental.id} className={overdue ? "adminTrOverdue" : ""}>
                    <td className="adminTdBold">{rental.id}</td>
                    <td>#{rental.item_id}</td>
                    <td>{fmtDate(rental.start_date)}</td>
                    <td>{fmtDate(rental.expected_return_date)}</td>
                    <td className="adminTdCapitalize">{rental.rental_type}</td>
                    <td>{fmtPrice(rental.total_cost)}</td>
                    <td>
                      {rental.status === "returned"
                        ? <span className={`badge ${rental.deposit_refunded ? "badgeGreen" : "badgeRed"}`}>
                            {rental.deposit_refunded ? "Refunded" : "Forfeited"}
                          </span>
                        : fmtPrice(rental.deposit_amount)}
                    </td>
                    <td>
                      <span className={`badge ${overdue ? "badgeRed" : rental.status === "returned" ? "badgeGreen" : rental.status === "cancelled" ? "badgeGray" : "badgeBlue"}`}>
                        {overdue ? "overdue" : rental.status}
                      </span>
                    </td>
                    <td>
                      {rental.status === "active" && (
                        <button className="btn btnGhost btnSm" onClick={() => openReturnModal(rental)}>
                          Process Return
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Return */}
        {returning.rental && (
          <div className="returnModalOverlay" onClick={closeModal}>
            <div className="returnModalBox" onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="returnModalHeader">
                <div>
                  <h2 className="returnModalTitle">Process Return</h2>
                  <p className="returnModalSub">Rental {r.id} · Item #{r.item_id}</p>
                </div>
                <button className="returnModalClose" onClick={closeModal} disabled={saving}>✕</button>
              </div>

              {/* Step 1: Condition */}
              <div className="returnSection">
                <p className="returnSectionTitle">1. Item Condition</p>
                <p className="returnSectionDesc">Did the item come back in good condition?</p>
                <div className="returnConditionRow">
                  <button
                    type="button"
                    className={`returnConditionBtn ${returning.goodCondition === true ? "returnConditionBtnGood" : "returnConditionBtnIdle"}`}
                    onClick={() => setReturning((p) => ({ ...p, goodCondition: true, damageFee: "" }))}
                  >
                    ✓ Good Condition
                    <span className="returnConditionSub">Deposit refunded to renter</span>
                  </button>
                  <button
                    type="button"
                    className={`returnConditionBtn ${returning.goodCondition === false ? "returnConditionBtnBad" : "returnConditionBtnIdle"}`}
                    onClick={() => setReturning((p) => ({ ...p, goodCondition: false }))}
                  >
                    ✕ Damaged / Poor
                    <span className="returnConditionSub">Deposit forfeited + damage fee</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Damage fee — only if bad condition */}
              {returning.goodCondition === false && (
                <div className="returnSection">
                  <p className="returnSectionTitle">2. Damage Fee</p>
                  <p className="returnSectionDesc">
                    The {fmtPrice(depositAmount)} deposit will be forfeited. Enter any additional damage charge:
                  </p>
                  <div className="returnFieldRow">
                    <label className="label">Additional Damage Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={returning.damageFee}
                      onChange={(e) => setReturning((p) => ({ ...p, damageFee: e.target.value }))}
                      className="returnInput"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Late days */}
              <div className="returnSection">
                <p className="returnSectionTitle">{returning.goodCondition === false ? "3." : "2."} Late Return</p>
                <p className="returnSectionDesc">
                  Expected back <strong>{fmtDate(r.expected_return_date)}</strong>. How many days late?
                </p>
                <div className="returnFieldRow">
                  <label className="label">Days Late (0 if on time)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={returning.lateDays}
                    onChange={(e) => setReturning((p) => ({ ...p, lateDays: e.target.value }))}
                    className="returnInput"
                  />
                </div>
                {lateDays > 15 && (
                  <p className="returnLateWarning">
                    ⚠ {lateDays} days late — renter will be suspended on confirmation.
                  </p>
                )}
              </div>

              {/* Summary */}
              {canSubmit && (
                <div className="returnSummary">
                  <p className="returnSummaryTitle">Summary</p>
                  <div className="returnSummaryRow">
                    <span>Deposit ({depositRefunded ? "refunded" : "forfeited"})</span>
                    <span className={depositRefunded ? "returnSummaryGreen" : "returnSummaryRed"}>
                      {depositRefunded ? `+${fmtPrice(depositAmount)} back` : `−${fmtPrice(depositAmount)}`}
                    </span>
                  </div>
                  {lateFee > 0 && (
                    <div className="returnSummaryRow">
                      <span>Late fee ({lateDays}d × {fmtPrice(dailyRate)}/d × 1.5)</span>
                      <span className="returnSummaryRed">+{fmtPrice(lateFee)}</span>
                    </div>
                  )}
                  {returning.goodCondition === false && damageFee > 0 && (
                    <div className="returnSummaryRow">
                      <span>Additional damage fee</span>
                      <span className="returnSummaryRed">+{fmtPrice(damageFee)}</span>
                    </div>
                  )}
                  {totalOwed > 0 && (
                    <div className="returnSummaryRow returnSummaryTotal">
                      <span>Extra charges to renter</span>
                      <span>{fmtPrice(totalOwed)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="returnModalActions">
                <button className="btn btnGhost" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  className="btn btnPrimary"
                  onClick={confirmReturn}
                  disabled={!canSubmit || saving}
                >
                  {saving ? "Processing…" : "Confirm Return"}
                </button>
              </div>

            </div>
          </div>
        )}

      </AdminLayout>
      <Footer/>
    </div>
  );
}