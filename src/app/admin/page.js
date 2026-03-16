"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: "◼" },
  { href: "/admin/locations", label: "Locations", icon: "📍" },
  { href: "/admin/items", label: "Items", icon: "📦" },
  { href: "/admin/rentals", label: "Rentals", icon: "🔑" },
  { href: "/admin/users", label: "Users", icon: "👤" },
];

export function AdminLayout({ children }) {
  const pathname = usePathname();
  return (
    <div className="adminLayout">
      <aside className="adminSidebar">
        <div className="adminSidebarHeader">
          <span className="adminSidebarBrand">RENTIFY</span>
          <span className="adminSidebarTag">Admin</span>
        </div>
        <ul className="adminNav">
          {ADMIN_LINKS.map(({ href, label, icon }) => (
            <li key={href} className={`adminNavItem${pathname === href ? " active" : ""}`}>
              <Link href={href}><span>{icon}</span>{label}</Link>
            </li>
          ))}
        </ul>
      </aside>
      <div className="adminContent">{children}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ totalItems: 0, activeRentals: 0, totalRevenue: 0, overdueRentals: 0, pendingReturns: 0, suspendedUsers: 0 });
  const [recent, setRecent] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const [ic, rc, uc] = await Promise.all([
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("rental_transactions").select("id, status, total_cost, expected_return_date, created_at, item_id"),
        supabase.from("profiles").select("id, is_banned"),
      ]);
      const all = rc.data ?? [];
      const today = new Date();
      setStats({
        totalItems: ic.count ?? 0,
        activeRentals: all.filter((r) => r.status === "active").length,
        totalRevenue: all.filter((r) => r.status === "returned").reduce((s, r) => s + Number(r.total_cost || 0), 0),
        overdueRentals: all.filter((r) => r.status === "active" && new Date(r.expected_return_date) < today).length,
        pendingReturns: all.filter((r) => r.status === "active").length,
        suspendedUsers: (uc.data ?? []).filter((u) => u.is_banned).length,
      });
      setRecent(all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 7));
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/");
  }, [authLoading, user, isAdmin, router]);

  if (authLoading) return <div><Header /><div className="container"><div className="centerNotice containerPt24">Loading...</div></div></div>;
  if (!isAdmin) return null;

  function fmtPrice(v) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v); }
  function fmtTime(s) { return new Date(s).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }); }

  const statCards = [
    { label: "Total Items", value: stats.totalItems, danger: false },
    { label: "Active Rentals", value: stats.activeRentals, danger: false },
    { label: "Total Revenue", value: fmtPrice(stats.totalRevenue), danger: false },
    { label: "Overdue Rentals", value: stats.overdueRentals, danger: true },
    { label: "Pending Returns", value: stats.pendingReturns, danger: false },
    { label: "Suspended Users", value: stats.suspendedUsers, danger: false },
  ];

  return (
    <div>
      <Header />
      <AdminLayout>
        <h1 className="adminPageH1Mb">Dashboard</h1>

        <div className="statsGrid">
          {statCards.map((s) => (
            <div key={s.label} className={`statCard${s.danger ? " statCardDanger" : ""}`}>
              <p className="statLabel">{s.label}</p>
              <p className="statValue">{loaded ? s.value : "—"}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="card adminTableCard">
          <div className="adminActivityHeader">
            <h2 className="adminActivityH2">Recent Activity</h2>
          </div>
          <table className="table">
            <thead>
              <tr><th>Time</th><th>Action</th><th>Rental ID</th><th>Item</th></tr>
            </thead>
            <tbody>
              {!loaded ? (
                <tr><td colSpan={4} className="adminTableEmptyInline">Loading...</td></tr>
              ) : recent.length === 0 ? (
                <tr><td colSpan={4} className="adminTableEmptyInline">No activity yet.</td></tr>
              ) : recent.map((r) => (
                <tr key={r.id}>
                  <td className="adminTdMuted">{fmtTime(r.created_at)}</td>
                  <td>New rental</td>
                  <td><Link href={`/rentals/${r.id}`} className="adminRentalLink">{r.id}</Link></td>
                  <td className="adminTdMuted">Item #{r.item_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Alerts */}
        {loaded && (stats.overdueRentals > 0 || stats.suspendedUsers > 0) && (
          <div className="adminAlertsBox">
            <p className="adminAlertsTitle">Alerts</p>
            <ul className="adminAlertsList">
              {stats.overdueRentals > 0 && <li>{stats.overdueRentals} item{stats.overdueRentals !== 1 ? "s are" : " is"} overdue</li>}
              {stats.pendingReturns > 0 && <li>{stats.pendingReturns} items pending return today</li>}
              {stats.suspendedUsers > 0 && <li>{stats.suspendedUsers} user{stats.suspendedUsers !== 1 ? "s" : ""} currently suspended</li>}
            </ul>
          </div>
        )}
      </AdminLayout>
    </div>
  );
}
