"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}
function fmtPrice(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v) || 0);
}
function daysLate(r) {
  return Math.max(0, Math.ceil((new Date() - new Date(r.expected_return_date)) / 86400000));
}
function isOverdue(r) { return r.status === "active" && new Date(r.expected_return_date) < new Date(); }

const SIDEBAR_LINKS = [
  { href: "/profile", label: "Account Main" },
  { href: "/payment-methods", label: "Payment Methods" },
  { href: "/my-items", label: "My Listed Items" },
  { href: "/my-rentals", label: "My Rentals" },
];

export default function MyRentalsPage() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [rentals, setRentals] = useState([]);
  const [itemMap, setItemMap] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("active");

  useEffect(() => {
    if (!user) return;
    supabase.from("rental_transactions").select("*").eq("renter_id", user.id)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const all = data ?? [];
        setRentals(all);
        const ids = [...new Set(all.map((r) => r.item_id))];
        if (ids.length) {
          const { data: items } = await supabase.from("items").select("id, name, photo_url, daily_rate").in("id", ids);
          const m = {};
          (items ?? []).forEach((i) => { m[i.id] = i; });
          setItemMap(m);
        }
        setLoaded(true);
      });
  }, [user]);

  const active = rentals.filter((r) => r.status === "active" || r.status === "overdue");
  const past = rentals.filter((r) => r.status === "returned" || r.status === "cancelled");
  const displayed = tab === "active" ? active : past;

  return (
    <div>
      <Header />
      <div className="accountLayout">
        <aside className="accountSidebar">
          <div className="sidebarUser sidebarUserSlim">
            <p className="sidebarName">{user?.email ?? "Account"}</p>
          </div>
          <ul className="sidebarNav">
            {SIDEBAR_LINKS.map(({ href, label }) => (
              <li key={href} className={`sidebarNavItem${pathname === href ? " active" : ""}`}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="accountContent">
          <h1 className="pageTitle myRentalsTitle">My Rentals</h1>

          <div className="tabs">
            <button className={`tab${tab === "active" ? " tabActive" : ""}`} onClick={() => setTab("active")}>
              Active Rentals
              {active.length > 0 && <span className="tabBadge">{active.length}</span>}
            </button>
            <button className={`tab${tab === "past" ? " tabActive" : ""}`} onClick={() => setTab("past")}>
              Past Rentals
            </button>
          </div>

          {loading ? <div className="centerNotice">Loading...</div>
            : !user ? <div className="centerNotice"><Link href="/login">Log in</Link> to view rentals.</div>
            : !loaded ? <div className="centerNotice">Loading rentals...</div>
            : displayed.length === 0 ? <div className="centerNotice">No {tab} rentals.</div>
            : (
              <div className="stack">
                {displayed.map((r) => {
                  const item = itemMap[r.item_id];
                  const overdue = isOverdue(r);
                  const late = overdue ? daysLate(r) : 0;
                  return (
                    <div key={r.id} className="rentalCard">
                      {item?.photo_url
                        ? <img src={item.photo_url} className="rentalThumb" alt={item.name} />
                        : <div className="rentalThumbPlaceholder">No img</div>}
                      <div className="rentalInfo">
                        <div className="rentalCardHeaderRow">
                          <p className="rentalTitle">{item?.name ?? `Item #${r.item_id}`}</p>
                          <span className={`badge ${overdue ? "badgeRed" : r.status === "returned" ? "badgeGreen" : "badgeBlue"}`}>
                            {overdue ? `Overdue ${late}d` : r.status}
                          </span>
                        </div>
                        <p className="rentalMeta">Rental ID: {r.id}</p>
                        <p className="rentalMeta">Rented: {fmtDate(r.start_date)} → Due: {fmtDate(r.expected_return_date)}</p>
                        <p className="rentalMeta">
                          Cost: {fmtPrice(r.total_cost)} · {r.rental_type} · {r.num_days} day{r.num_days !== 1 ? "s" : ""}
                        </p>
                        {overdue && (
                          <p className="rentalOverdueWarning">
                            ⚠ Days late: {late} · Est. late fee: {fmtPrice(late * Number(item?.daily_rate || 0) * 1.5)}
                          </p>
                        )}
                        <div className="rentalActions">
                          <Link href={`/rentals/${r.id}`} className="btn btnGhost btnSm">View Receipt</Link>
                          <Link href={`/rate/${r.id}`} className="btn btnGhost btnSm">Rate Seller</Link>
                          {r.status === "returned" && item && (
                            <Link href={`/items/${r.item_id}`} className="btn btnGhost btnSm">Rent Again</Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
