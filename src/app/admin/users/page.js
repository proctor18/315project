"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdminLayout } from "../page.js";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function AdminUsersPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!authLoading && (!user || !isAdmin)) router.push("/"); }, [authLoading, user, isAdmin, router]);
  if (authLoading) return <div><Header /><div className="container"><div className="centerNotice containerPt24">Loading...</div></div></div>;
  if (!isAdmin) return null;

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data ?? []); setLoaded(true);
  }

  async function toggleBan(u) {
    const action = u.is_banned ? "unban" : "ban";
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    const { error } = await supabase.from("profiles").update({ is_banned: !u.is_banned, banned_until: null }).eq("id", u.id);
    if (error) { setMessage(error.message); return; }
    setMessage(`User ${action}ned.`);
    load();
  }

  return (
    <div>
      <Header />
      <AdminLayout>
        <h1 className="adminPageH1Mb">Manage Users</h1>
        {message && <p className="messageText successText">{message}</p>}

        <div className="card adminTableCard">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Rating</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {!loaded ? <tr><td colSpan={6} className="adminTableEmpty">Loading...</td></tr>
                : users.length === 0 ? <tr><td colSpan={6} className="adminTableEmpty">No users.</td></tr>
                : users.map((u) => (
                  <tr key={u.id} className={u.is_banned ? "adminTrBanned" : ""}>
                    <td className="adminTdBold">{u.first_name} {u.last_name}</td>
                    <td className="adminTdMuted">{u.email}</td>
                    <td className="adminTdCapitalize">{u.role ?? "student"}</td>
                    <td>{u.rating ? `${u.rating} ★` : "—"}</td>
                    <td><span className={`badge ${u.is_banned ? "badgeRed" : "badgeGreen"}`}>{u.is_banned ? "Banned" : "Active"}</span></td>
                    <td>
                      <button className={`btn btnSm ${u.is_banned ? "btnPrimary" : "btnDanger"}`} onClick={() => toggleBan(u)}>
                        {u.is_banned ? "Unban" : "Ban"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </AdminLayout>
      <Footer/>
    </div>
  );
}
