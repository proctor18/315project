"use client";

import { useEffect, useState } from "react";
import ItemCard from "@/components/ItemCard";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "C-TXTBK", label: "Textbooks" },
  { id: "C-ELEC", label: "Electronics" },
  { id: "C-LAB", label: "Lab Equipment" },
];

type Item = {
  id: number;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  name: string;
  description: string;
  price: number | string;
  daily_rate?: number;
  condition?: string;
  category_id?: string;
  status: "available" | "unavailable";
  item_status?: string;
  photo_url?: string;
  created_at: string;
};

export default function BrowsePage() {
  const { user, loading } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q")?.trim() ?? "";
      setSearchText(q);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let query = supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (categoryFilter) query = (query as any).eq("category_id", categoryFilter);

    query.then(({ data, error }: any) => {
      if (cancelled) return;
      if (error) { setErrorMessage(error.message); setItems([]); }
      else { setItems((data ?? []) as Item[]); setErrorMessage(null); }
      setIsLoaded(true);
    });

    return () => { cancelled = true; };
  }, [categoryFilter]);

  let visibleItems = user
    ? items.filter((item) => item.owner_id !== (user as any).id)
    : items;

  if (searchText) {
    visibleItems = visibleItems.filter((item) =>
      item.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }

  return (
    <div>
      <div className="container top-margin">

        {searchText && (
          <p className="searchResultLabel">
            Showing results for <strong>&ldquo;{searchText}&rdquo;</strong> &mdash; {visibleItems.length} item{visibleItems.length !== 1 ? "s" : ""} found
          </p>
        )}

        <div className="filterPills">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`pill${categoryFilter === c.id ? " pillActive" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading || !isLoaded ? (
          <div className="centerNotice">Loading items...</div>
        ) : errorMessage ? (
          <div className="centerNotice">
            <p className="errorText">{`Failed to load items: ${errorMessage}`}</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="centerNotice">
            {searchText
              ? `No items found for "${searchText}".`
              : user
                ? "No items from other students yet."
                : "No items have been posted yet."}
          </div>
        ) : (
          <div className="cardsGrid">
            {visibleItems.map((item) => (
              <ItemCard key={item.id} item={item} href={`/items/${item.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
