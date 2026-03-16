"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import ItemCard from "@/components/ItemCard";
import { supabase } from "@/lib/supabaseClient";

const CATS = [
  { id: "", label: "All" },
  { id: "C-TXTBK", label: "Textbooks" },
  { id: "C-ELEC", label: "Electronics" },
  { id: "C-LAB", label: "Lab Equipment" },
];
const CONDS = [
  { v: "", l: "Any Condition" },
  { v: "new", l: "New" },
  { v: "like_new", l: "Like New" },
  { v: "good", l: "Good" },
  { v: "fair", l: "Fair" },
];

export default function LocationItemsPage() {
  const { id } = useParams();
  const [loc, setLoc] = useState(null);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [cat, setCat] = useState("");
  const [cond, setCond] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    if (!id) return;
    supabase.from("locations").select("*").eq("id", id).maybeSingle().then(({ data }) => setLoc(data));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoaded(false);
    let q = supabase.from("items").select("*").eq("location_id", id).eq("item_status", "available").order("created_at", { ascending: false });
    if (cat) q = q.eq("category_id", cat);
    if (cond) q = q.eq("condition", cond);
    if (maxPrice && !isNaN(Number(maxPrice))) q = q.lte("daily_rate", Number(maxPrice));
    q.then(({ data }) => { setItems(data ?? []); setLoaded(true); });
  }, [id, cat, cond, maxPrice]);

  return (
    <div>
      <Header />
      <div className="container containerPt24">
        <Link href="/locations" className="backLink">← All Locations</Link>
        <div className="pageHead pageHeadMt">
          <div>
            <h1 className="pageTitle">{loc?.name ?? "Location"}</h1>
            <p className="pageSubtitle">{loc ? `${loc.building} · ${loc.hours}` : ""}</p>
          </div>
        </div>

        {/* Category pills */}
        <div className="filterPills">
          {CATS.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`pill${cat === c.id ? " pillActive" : ""}`}>{c.label}</button>
          ))}
        </div>

        {/* Extra filters */}
        <div className="locationFilterRow">
          <select value={cond} onChange={(e) => setCond(e.target.value)} className="locationCondSelect">
            {CONDS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
          <input type="number" min="0" placeholder="Max daily rate $" value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="locationMaxInput" />
          {(cat || cond || maxPrice) && (
            <button className="btn btnGhost btnSm" onClick={() => { setCat(""); setCond(""); setMaxPrice(""); }}>Clear filters</button>
          )}
        </div>

        {!loaded ? <div className="centerNotice">Loading items...</div>
          : items.length === 0 ? <div className="centerNotice">No items match your filters at this location.</div>
          : (
            <div className="cardsGrid">
              {items.map((item) => <ItemCard key={item.id} item={item} href={`/items/${item.id}`} />)}
            </div>
          )}
      </div>
    </div>
  );
}
