"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeFileName, validateImageFile } from "@/lib/fileHelpers";

function fmtPrice(v) {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function Stars({ rating = 0 }) {
  const r = Math.round(Number(rating));
  return <span className="stars">{"★".repeat(r)}{"☆".repeat(Math.max(0, 5 - r))}</span>;
}

const CONDITION_LABELS = { new: "New", like_new: "Like New", good: "Good", fair: "Fair" };
const CONDITION_COLORS = { new: "badgeGreen", like_new: "badgeBlue", good: "badgeBlue", fair: "badgeOrange" };

async function uploadItemImage(userId, itemId, file) {
  const path = `${userId}/${itemId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from("item-images").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("item-images").getPublicUrl(path);
  return { photo_url: data.publicUrl, photo_path: path };
}
async function deleteItemImage(path) {
  if (!path) return;
  await supabase.storage.from("item-images").remove([path]);
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id;

  const [item, setItem] = useState(null);
  const [location, setLocation] = useState(null);
  const [specs, setSpecs] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [sellerRating, setSellerRating] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [weeklyRate, setWeeklyRate] = useState("");
  const [semesterRate, setSemesterRate] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [status, setStatus] = useState("available");
  const [newPhotoFile, setNewPhotoFile] = useState(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("items").select("*").eq("id", id).maybeSingle(),
      supabase.from("item_specifications").select("*").eq("item_id", id),
    ]).then(async ([ir, sr]) => {
      const it = ir.data ?? null;
      setItem(it);
      setSpecs(sr.data ?? []);
      if (it) {
        setName(it.name ?? "");
        setDescription(it.description ?? "");
        setDailyRate(it.daily_rate ?? "");
        setWeeklyRate(it.weekly_rate ?? "");
        setSemesterRate(it.semester_rate ?? "");
        setDepositAmount(it.deposit_amount ?? "");
        setStatus(it.item_status ?? "available");
        if (it.location_id) {
          const { data } = await supabase.from("locations").select("*").eq("id", it.location_id).maybeSingle();
          setLocation(data);
        }
        const { data: ratings } = await supabase.from("ratings").select("rating").eq("seller_id", it.owner_id);
        if (ratings && ratings.length > 0) {
          const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
          setSellerRating(avg.toFixed(1));
        }
      }
      setIsLoaded(true);
    });
  }, [id]);

  const isOwner = user && item && user.id === item.owner_id;

  async function saveEdit() {
    setBusy(true); setMessage("");
    try {
      let photoUpdate = {};
      if (newPhotoFile) {
        const err = validateImageFile(newPhotoFile);
        if (err) { setMessage(err); setBusy(false); return; }
        if (item.photo_path) await deleteItemImage(item.photo_path);
        photoUpdate = await uploadItemImage(user.id, item.id, newPhotoFile);
      }
      const { error } = await supabase.from("items").update({
        name, description,
        daily_rate: Number(dailyRate) || 0,
        weekly_rate: Number(weeklyRate) || 0,
        semester_rate: Number(semesterRate) || 0,
        deposit_amount: Number(depositAmount) || 0,
        item_status: status,
        ...photoUpdate,
      }).eq("id", item.id);
      if (error) throw error;
      setItem((prev) => ({ ...prev, name, description, daily_rate: dailyRate, weekly_rate: weeklyRate, semester_rate: semesterRate, deposit_amount: depositAmount, item_status: status, ...photoUpdate }));
      setEditMode(false);
      setNewPhotoFile(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save.");
    }
    setBusy(false);
  }

  async function deleteItem() {
    if (!window.confirm("Delete this item?")) return;
    setBusy(true); setMessage("");
    try {
      const { error: rtError } = await supabase.from("rental_transactions").delete().eq("item_id", item.id);
      if (rtError) throw rtError;
      const { error } = await supabase.from("items").delete().eq("id", item.id);
      if (error) throw error;
      if (item.photo_path) await deleteItemImage(item.photo_path);
      router.push("/my-items");
    } catch (err) {
      console.error("Delete error:", err);
      const msg = err?.message || err?.details || err?.hint || JSON.stringify(err);
      setMessage("Delete failed: " + msg);
      setBusy(false);
    }
  }

  function handleMessageSeller() {
    if (!user) { router.push("/login"); return; }
    router.push(`/messages?u=${item.owner_id}`);
  }

  if (!isLoaded) return <div><Header /><div className="container"><div className="centerNotice containerPt24">Loading...</div></div></div>;
  if (!item) return <div><Header /><div className="container"><div className="centerNotice containerPt24">Item not found.</div></div></div>;

  return (
    <div>
      <Header />
      <div className="container containerPt24">
        <Link href="/items" className="backLink">← Back to Browse</Link>

        <div className="detailLayout detailLayoutSpaced">
          {/* Left: Image */}
          <div className="detailGallerySticky">
            {item.photo_url
              ? <img src={item.photo_url} alt={item.name} className="detailMainImg" />
              : <div className="detailMainImg detailNoImg">No image</div>
            }
            {isOwner && editMode && (
              <div className="field fieldMt">
                <label className="label">Replace Photo</label>
                <input type="file" accept="image/*" onChange={(e) => setNewPhotoFile(e.target.files?.[0] ?? null)} />
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div>
            {/* Category + Title */}
            <div className="detailMeta">
              {item.category_id && <p className="detailCategory">{item.category_id}</p>}
              {editMode
                ? <input value={name} onChange={(e) => setName(e.target.value)} className="detailTitleInput" />
                : <h1 className="detailH1">{item.name}</h1>
              }
              <div className="detailBadgeRow">
                {item.condition && <span className={`badge ${CONDITION_COLORS[item.condition] ?? "badgeGray"}`}>{CONDITION_LABELS[item.condition] ?? item.condition}</span>}
                {item.item_status === "rented" && <span className="badge badgeRed">Rented</span>}
                {item.item_status === "available" && <span className="badge badgeGreen">Available</span>}
                {item.available_quantity > 0 && <span className="detailQtyLabel">{item.available_quantity} available</span>}
              </div>
            </div>

            {/* Specs */}
            {specs.length > 0 && (
              <div className="detailSection">
                <p className="detailSectionTitle">Specifications</p>
                <table className="specsTable">
                  <tbody>
                    {specs.map((s) => (
                      <tr key={s.id}>
                        <td className="specsTd">{s.spec_name}</td>
                        <td className="specsTdVal">{s.spec_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Location */}
            {location && (
              <div className="detailSection">
                <p className="detailSectionTitle">Location</p>
                <p className="locationName">{location.name}</p>
                {location.building && <p className="locationBuilding">{location.building} — {location.hours}</p>}
              </div>
            )}

            {/* Seller */}
            <div className="detailSection">
              <p className="detailSectionTitle">Seller</p>
              <div className="sellerCard">
                <div className="sellerAvatar">
                  {(item.owner_name || item.owner_email || "U")[0].toUpperCase()}
                </div>
                <div className="sellerInfo">
                  <p className="sellerName">{item.owner_name || item.owner_email}</p>
                  <p className="sellerRating">
                    <Stars rating={sellerRating ?? 0} />{sellerRating ? `${sellerRating}/5` : "No ratings yet"}
                  </p>
                </div>
                {user && !isOwner && (
                  <button onClick={handleMessageSeller} className="btn btnGhost btnSm btnFlexShrink0">
                    💬 Message
                  </button>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="detailSection">
              <p className="detailSectionTitle">Pricing</p>
              {editMode ? (
                <div className="pricingEditGrid">
                  {[["Daily Rate", dailyRate, setDailyRate], ["Weekly Rate", weeklyRate, setWeeklyRate], ["Semester Rate", semesterRate, setSemesterRate], ["Deposit", depositAmount, setDepositAmount]].map(([lbl, val, fn]) => (
                    <div className="field" key={lbl}>
                      <label className="label">{lbl}</label>
                      <input type="number" min="0" step="0.01" value={val} onChange={(e) => fn(e.target.value)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="priceGrid">
                  {[
                    { label: "Daily", val: item.daily_rate },
                    { label: "Weekly", val: item.weekly_rate },
                    { label: "Semester", val: item.semester_rate },
                    { label: "Deposit", val: item.deposit_amount },
                  ].filter(({ val }) => Number(val) > 0).map(({ label, val }) => (
                    <div className="priceBox" key={label}>
                      <p className="priceBoxLabel">{label}</p>
                      <p className="priceBoxValue">{fmtPrice(val)}</p>
                    </div>
                  ))}
                  {!item.daily_rate && Number(item.price) > 0 && (
                    <div className="priceBox">
                      <p className="priceBoxLabel">Price</p>
                      <p className="priceBoxValue">{fmtPrice(item.price)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="detailSection">
              <p className="detailSectionTitle">Description</p>
              {editMode
                ? <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="detailDescTextarea" />
                : <p className="detailDescText">{item.description || "No description provided."}</p>
              }
            </div>

            {/* Edit: status */}
            {editMode && (
              <div className="detailSection">
                <div className="field">
                  <label className="label">Availability Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="available">Available</option>
                    <option value="rented">Rented</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
            )}

            {/* Actions */}
            {message && <p className="messageText errorText actionsMt8">{message}</p>}

            {!isOwner ? (
              <div className={`actions actionsMt`}>
                <Link
                  href={
                    item.item_status !== "available"
                      ? "#"
                      : !user
                        ? "/login"
                        : `/items/${item.id}/rent`
                  }
                  className={`btn btnPrimary btnLg rentBtnFull${item.item_status !== "available" ? " rentBtnUnavailable" : ""}`}
                >
                  {item.item_status !== "available"
                    ? "Currently Unavailable"
                    : !user
                      ? "Log In to Request Rental"
                      : "Request to Rent"}
                </Link>
              </div>
            ) : (
              <div className="actions actionsMt">
                {editMode ? (
                  <>
                    <button className="btn btnPrimary" onClick={saveEdit} disabled={busy}>
                      {busy ? "Saving..." : "Save Changes"}
                    </button>
                    <button className="btn btnGhost" onClick={() => { setEditMode(false); setNewPhotoFile(null); }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn btnPrimary" onClick={() => setEditMode(true)}>Edit Item</button>
                    <button className="btn btnDanger" onClick={deleteItem} disabled={busy}>Delete</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
