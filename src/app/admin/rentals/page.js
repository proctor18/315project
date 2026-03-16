"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { AdminLayout } from "../page.js";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

function fmtDate(s) { if (!s) return "—"; return new Date(s).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }); }
function fmtPrice(v) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v) || 0); }

export default function AdminRentalsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rentals, setRentals] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { if (!authLoading && (!user || !isAdmin)) router.push("/"); }, [authLoading, user, isAdmin, router]);
  if (authLoading) return <div><Header /><div className="container"><div className="centerNotice containerPt24">Loading...</div></div></div>;
  if (!isAdmin) return null;

  async function load() {
    let q = supabase.from("rental_transactions").select("*").order("created_at", { ascending: false });
    if (statusFilter) q = q.eq("status", statusFilter);
    const { data } = await q;
    setRentals(data ?? []); setLoaded(true);
  }

  async function processReturn(r) {
    const lateDays = Number(prompt("Days late (0 if on time):", "0") || 0);
    const dmg = Number(prompt("Damage fee ($):", "0") || 0);
    const dailyRate = Number(r.base_price) / Math.max(1, Number(r.num_days));
    const lateFee = lateDays * dailyRate * 1.5;
    const { error } = await supabase.from("rental_transactions").update({
      status: "returned", actual_return_date: new Date().toISOString().split("T")[0],
      late_fee: lateFee, damage_fee: dmg,
    }).eq("id", r.id);
    if (!error) {
      await supabase.from("items").update({ item_status: "available", available_quantity: 1 }).eq("id", r.item_id);
      if (lateDays > 15) {
        await supabase.from("profiles").update({ is_banned: true }).eq("id", r.renter_id);
        setMessage(`Returned. User suspended due to ${lateDays} days late.`);
      } else {
        setMessage(`Rental ${r.id} marked as returned.`);
      }
      load();
    } else { setMessage(error.message); }
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

        {message && <p className="messageText successText">{message}</p>}

        <div className="card adminTableCard">
          <table className="table">
            <thead>
              <tr><th>Rental ID</th><th>Item</th><th>Start</th><th>Expected Return</th><th>Type</th><th>Total</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {!loaded ? <tr><td colSpan={8} className="adminTableEmpty">Loading...</td></tr>
                : rentals.length === 0 ? <tr><td colSpan={8} className="adminTableEmpty">No rentals.</td></tr>
                : rentals.map((r) => {
                  const overdue = r.status === "active" && new Date(r.expected_return_date) < new Date();
                  return (
                    <tr key={r.id} className={overdue ? "adminTrOverdue" : ""}>
                      <td className="adminTdBold">{r.id}</td>
                      <td>#{r.item_id}</td>
                      <td>{fmtDate(r.start_date)}</td>
                      <td>{fmtDate(r.expected_return_date)}</td>
                      <td className="adminTdCapitalize">{r.rental_type}</td>
                      <td>{fmtPrice(r.total_cost)}</td>
                      <td>
                        <span className={`badge ${overdue ? "badgeRed" : r.status === "returned" ? "badgeGreen" : "badgeBlue"}`}>
                          {overdue ? "overdue" : r.status}
                        </span>
                      </td>
                      <td>
                        {r.status === "active" && (
                          <button className="btn btnGhost btnSm" onClick={() => processReturn(r)}>Process Return</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </AdminLayout>
    </div>
  );
}
