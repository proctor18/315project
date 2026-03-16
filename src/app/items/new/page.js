"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeFileName, validateImageFile } from "@/lib/fileHelpers";
import { ensureProfileForUser, ownerNameFromUser } from "@/lib/profileHelpers";

const CATEGORIES = [
  { id: "C-TXTBK", label: "Textbooks & Books" },
  { id: "C-ELEC",  label: "Electronics" },
  { id: "C-LAB",   label: "Lab Equipment" },
];

const CONDITIONS = [
  { value: "new",      label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good",     label: "Good" },
  { value: "fair",     label: "Fair" },
];

async function uploadItemImage(userId, itemId, file) {
  const path = `${userId}/${itemId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("item-images")
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("item-images").getPublicUrl(path);
  return { photo_url: data.publicUrl, photo_path: path };
}

export default function NewItemPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [condition, setCondition] = useState("good");
  const [dailyRate, setDailyRate] = useState("");
  const [weeklyRate, setWeeklyRate] = useState("");
  const [semesterRate, setSemesterRate] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    supabase.from("locations").select("id, name").eq("status", "active").then(({ data }) => {
      setLocations(data ?? []);
    });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) { setMessage("You must be logged in to create an item."); return; }

    const imageValidation = validateImageFile(photoFile);
    if (imageValidation) { setMessage(imageValidation); return; }

    setSaving(true);
    setMessage("");

    try {
      const { data: profileData, error: profileError } = await ensureProfileForUser(user);
      if (profileError) console.error(profileError);
      const ownerName = ownerNameFromUser(user, profileData);

      const { data: insertedItem, error: insertError } = await supabase
        .from("items")
        .insert({
          owner_id: user.id,
          owner_name: ownerName,
          owner_email: user.email ?? "",
          name: name.trim(),
          description: description.trim(),
          price: Number(dailyRate) || 0,
          status: "available",
          item_status: "available",
          category_id: categoryId || null,
          location_id: locationId || null,
          condition,
          daily_rate: Number(dailyRate) || 0,
          weekly_rate: Number(weeklyRate) || 0,
          semester_rate: Number(semesterRate) || 0,
          deposit_amount: Number(depositAmount) || 0,
          available_quantity: 1,
          total_quantity: 1,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (photoFile) {
        const uploaded = await uploadItemImage(user.id, insertedItem.id, photoFile);
        await supabase
          .from("items")
          .update({ ...uploaded, updated_at: new Date().toISOString() })
          .eq("id", insertedItem.id)
          .eq("owner_id", user.id);
      }

      router.push("/my-items");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Header />
      <div className="container">

      <section className="pageHead">
        <div>
          <h1 className="pageTitle">Rent Your Item</h1>
          <p className="pageSubtitle">Post an item for other students to rent.</p>
        </div>
      </section>

      {loading ? (
        <div className="centerNotice">Loading account...</div>
      ) : !user ? (
        <div className="centerNotice">
          Please <Link href="/login">log in</Link> to create an item.
        </div>
      ) : (
        <form className="formCard" onSubmit={handleSubmit}>
          {/* Photos */}
          <div className="field">
            <label className="label">Photo (optional, max 5MB)</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Required Info */}
          <h3 className="newItemFormTitle">Required Information</h3>

          <div className="field">
            <label className="label">Title</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Calculus: Early Transcendentals" required />
          </div>

          <div className="field">
            <label className="label">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label">Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)}>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Condition details, edition, notes..." />
          </div>

          <div className="field">
            <label className="label">Campus Location</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              <option value="">Select location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Pricing */}
          <h3 className="newItemFormTitle">Pricing</h3>

          <div className="newItemPriceGrid">
            <div className="field">
              <label className="label">Daily Rate ($)</label>
              <input type="number" min="0" step="0.01" value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)} placeholder="5.00" required />
            </div>
            <div className="field">
              <label className="label">Weekly Rate ($)</label>
              <input type="number" min="0" step="0.01" value={weeklyRate}
                onChange={(e) => setWeeklyRate(e.target.value)} placeholder="25.00" />
            </div>
            <div className="field">
              <label className="label">Monthly Rate ($)</label>
              <input type="number" min="0" step="0.01" value={semesterRate}
                onChange={(e) => setSemesterRate(e.target.value)} placeholder="100.00" />
            </div>
            <div className="field">
              <label className="label">Deposit ($)</label>
              <input type="number" min="0" step="0.01" value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)} placeholder="50.00" />
            </div>
          </div>

          <div className="actions newItemActionsMt">
            <button type="submit" className="btn btnPrimary" disabled={saving}>
              {saving ? "Creating..." : "Rent Item"}
            </button>
            <Link href="/my-items" className="btn btnGhost">Cancel</Link>
          </div>
        </form>
      )}

      {message ? (
        <p className={`messageText ${message.toLowerCase().includes("failed") ? "errorText" : ""}`}>
          {message}
        </p>
      ) : null}
      </div>
    </div>
  );
}
