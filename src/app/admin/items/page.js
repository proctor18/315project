"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { AdminLayout } from "../page.js";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

function fmtPrice(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v) || 0);
}

export default function AdminItemsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "success" });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !item.name?.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q)) return false;
      if (filterStatus !== "all" && item.item_status !== filterStatus) return false;
      if (filterCategory !== "all" && String(item.category_id) !== filterCategory) return false;
      return true;
    });
  }, [items, search, filterStatus, filterCategory]);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/");
  }, [authLoading, user, isAdmin, router]);

  if (authLoading) return (
    <div><Header /><div className="container"><div className="centerNotice containerPt24">Loading...</div></div></div>
  );
  if (!isAdmin) return null;

  async function load() {
    setLoaded(false);
    const [itemsRes, locsRes, catsRes] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase.from("locations").select("id, name").order("name"),
      supabase.from("categories").select("id, name, display_name").order("name"),
    ]);
    if (itemsRes.error) showMsg("Failed to load items: " + itemsRes.error.message, "error");
    setItems(itemsRes.data ?? []);
    setLocations(locsRes.data ?? []);
    setCategories(catsRes.data ?? []);
    setLoaded(true);
  }

  function showMsg(text, type = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "success" }), 5000);
  }


  function startEdit(item) {
    setEditing(item);
    setForm({
      name: item.name ?? "",
      description: item.description ?? "",
      condition: item.condition ?? "good",
      item_status: item.item_status ?? "available",
      daily_rate: item.daily_rate ?? "",
      weekly_rate: item.weekly_rate ?? "",
      semester_rate: item.semester_rate ?? "",
      deposit_amount: item.deposit_amount ?? "",
      available_quantity: item.available_quantity ?? 1,
      total_quantity: item.total_quantity ?? 1,
      location_id: item.location_id ?? "",
      category_id: item.category_id ?? "",
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    const { error } = await supabase.from("items").update({
      name: form.name,
      description: form.description,
      condition: form.condition,
      item_status: form.item_status,
      daily_rate: form.daily_rate || null,
      weekly_rate: form.weekly_rate || null,
      semester_rate: form.semester_rate || null,
      deposit_amount: form.deposit_amount || null,
      available_quantity: Number(form.available_quantity) || 0,
      total_quantity: Number(form.total_quantity) || 1,
      location_id: form.location_id || null,
      category_id: form.category_id || null,
    }).eq("id", editing.id);
    if (error) {
      showMsg("Save failed: " + error.message, "error");
      return;
    }
    showMsg("Item updated.");
    setEditing(null);
    load();
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) {
      showMsg("Delete failed: " + error.message, "error");
      return;
    }
    showMsg("Item deleted.");
    load();
  }


  const f = (label, key, type = "text") => (
    <div className="field" key={key}>
      <label className="label">{label}</label>
      <input type={type} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  function locationName(id) { return locations.find((l) => l.id === id)?.name ?? "—"; }
  function categoryName(id) {
    const c = categories.find((c) => c.id === id);
    return c?.display_name || c?.name || "—";
  }
  function statusBadge(s) {
    if (s === "available") return "badgeGreen";
    if (s === "rented") return "badgeBlue";
    return "badgeGray";
  }

  return (
    <div>
      <Header />
      <AdminLayout>
        <h1 className="adminPageH1Mb">Manage Items</h1>

        {/*  Status message  */}
        {message.text && (
          <p className="messageText" style={{
            color: message.type === "error" ? "var(--color-danger, #dc2626)" : "var(--color-success, #16a34a)",
            marginBottom: "12px",
          }}>
            {message.text}
          </p>
        )}

        {/* Edit form  */}
        {editing && (
          <form className="formCard adminLocFormMb adminEditItemForm" onSubmit={saveEdit}>
            <div className="adminEditItemHeader">
              <h2 className="adminLocFormH2" style={{ margin: 0 }}>Edit Item</h2>
              <span className="adminEditItemName">{editing.name}</span>
            </div>

            {/* Row 1: Name full width */}
            <div className="adminEditGrid adminEditGridFull">
              {f("Name", "name")}
            </div>

            {/* Row 2: Description full width */}
            <div className="adminEditGrid adminEditGridFull">
              {f("Description", "description")}
            </div>

            {/* Row 3: Pricing — 4 columns */}
            <div className="adminEditSectionLabel">Pricing</div>
            <div className="adminEditGrid adminEditGrid4">
              {f("Daily Rate ($)", "daily_rate", "number")}
              {f("Weekly Rate ($)", "weekly_rate", "number")}
              {f("Semester Rate ($)", "semester_rate", "number")}
              {f("Deposit ($)", "deposit_amount", "number")}
            </div>

            {/* Row 4: Meta — 4 columns */}
            <div className="adminEditSectionLabel">Details</div>
            <div className="adminEditGrid adminEditGrid4">
              <div className="field">
                <label className="label">Condition</label>
                <select className="adminEditSelect" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Status</label>
                <select className="adminEditSelect" value={form.item_status} onChange={(e) => setForm({ ...form, item_status: e.target.value })}>
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                </select>
              </div>
              {f("Available Qty", "available_quantity", "number")}
              {f("Total Qty", "total_quantity", "number")}
            </div>

            {/* Row 5: Location + Category — 2 columns */}
            <div className="adminEditSectionLabel">Assignment</div>
            <div className="adminEditGrid adminEditGrid2">
              <div className="field">
                <label className="label">Location</label>
                <select className="adminEditSelect" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Category</label>
                <select className="adminEditSelect" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="actions adminEditActions">
              <button type="submit" className="btn btnPrimary">Save Changes</button>
              <button type="button" className="btn btnGhost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        )}

        {/* Search & filter bar  */}
        <div className="adminItemsFilterRow">
          <input
            type="search"
            className="adminItemsSearch"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="adminItemsSelect"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="rented">Rented</option>
          </select>
          <select
            className="adminItemsSelect"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.display_name || c.name}</option>
            ))}
          </select>
          {(search || filterStatus !== "all" || filterCategory !== "all") && (
            <button
              className="btn btnGhost btnSm adminItemsClearBtn"
              onClick={() => { setSearch(""); setFilterStatus("all"); setFilterCategory("all"); }}
            >
              Clear
            </button>
          )}
          <span className="adminItemsCount">
            {loaded ? `${filteredItems.length} of ${items.length}` : "…"}
          </span>
        </div>

        {/* Items table */}
        <div className="card adminTableCard">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Location</th>
                <th>Condition</th>
                <th>Daily Rate</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loaded ? (
                <tr><td colSpan={8} className="adminTableEmpty">Loading…</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={8} className="adminTableEmpty">
                  {items.length === 0 ? "No items." : "No items match your search."}
                </td></tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="adminTdBold">{item.name}</td>
                  <td>{categoryName(item.category_id)}</td>
                  <td className="adminTdMuted">{locationName(item.location_id)}</td>
                  <td className="adminTdCapitalize">{item.condition?.replace("_", " ") ?? "—"}</td>
                  <td>{item.daily_rate ? fmtPrice(item.daily_rate) : "—"}</td>
                  <td>{item.available_quantity ?? "—"} / {item.total_quantity ?? "—"}</td>
                  <td>
                    <span className={`badge ${statusBadge(item.item_status)}`}>
                      {item.item_status ?? "—"}
                    </span>
                  </td>
                  <td>
                    <div className="adminItemActions">
                      <button className="btn btnGhost btnSm" onClick={() => startEdit(item)}>Edit</button>
                      <button className="adminBtnDanger" onClick={() => deleteItem(item)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminLayout>
    </div>
  );
}