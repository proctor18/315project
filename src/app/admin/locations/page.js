"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdminLayout } from "../page.js";
import { supabase } from "@/lib/supabaseClient";

const EMPTY = { id: "", name: "", building: "", street: "", city: "Edmonton", province: "AB", postal_code: "", contact_email: "", contact_phone: "", hours: "Mon-Fri 9AM-5PM", status: "active" };

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("locations").select("*").order("name");
    setLocations(data ?? []); setLoaded(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.id || !form.name) { setMessage("ID and Name required."); return; }
    const { error } = editing === "new"
      ? await supabase.from("locations").insert(form)
      : await supabase.from("locations").update(form).eq("id", form.id);
    if (error) { setMessage(error.message); return; }
    setMessage(editing === "new" ? "Location added." : "Updated.");
    setEditing(null); load();
  }

  const f = (label, key, type = "text") => (
    <div className="field" key={key}>
      <label className="label">{label}</label>
      <input type={type} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div>
      <Header />
      <AdminLayout>
        <div className="pageHead">
          <h1 className="adminPageH1">Manage Locations</h1>
          <button className="btn btnPrimary" onClick={() => { setEditing("new"); setForm(EMPTY); }}>+ Add Location</button>
        </div>
        {message && <p className="messageText successText">{message}</p>}

        {editing && (
          <form className="formCard adminLocFormMb" onSubmit={save}>
            <h2 className="adminLocFormH2">{editing === "new" ? "Add New Location" : "Edit Location"}</h2>
            <div className="adminLocationsFormGrid">
              {f("Location ID (e.g. L003)", "id")}
              {f("Name", "name")}
              {f("Building", "building")}
              {f("Street", "street")}
              {f("City", "city")}
              {f("Province", "province")}
              {f("Postal Code", "postal_code")}
              {f("Contact Email", "contact_email", "email")}
              {f("Contact Phone", "contact_phone", "tel")}
              {f("Hours", "hours")}
            </div>
            <div className="field">
              <label className="label">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="actions">
              <button type="submit" className="btn btnPrimary">Save</button>
              <button type="button" className="btn btnGhost" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="stack">
          {!loaded ? <div className="centerNotice">Loading...</div>
            : locations.map((loc) => (
              <div key={loc.id} className="card adminCardFlex">
                <div>
                  <p className="adminCardLocName">{loc.name}</p>
                  <p className="meta">{loc.building} · {loc.city}, {loc.province}</p>
                  <p className="meta">Hours: {loc.hours}</p>
                  <span className={`badge ${loc.status === "active" ? "badgeGreen" : "badgeGray"}`}>{loc.status}</span>
                </div>
                <div className="actions">
                  <button className="btn btnPrimary btnSm" onClick={() => { setEditing(loc); setForm({ ...loc }); }}>Edit</button>
                  <button className="btn btnGhost btnSm" onClick={async () => {
                    await supabase.from("locations").update({ status: loc.status === "active" ? "inactive" : "active" }).eq("id", loc.id);
                    load();
                  }}>
                    {loc.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </AdminLayout>
      <Footer/>
    </div>
  );
}
