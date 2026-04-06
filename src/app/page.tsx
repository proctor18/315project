"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import BrowseItems from "@/components/BrowseItems";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "C-TXTBK", label: "Textbooks" },
  { id: "C-ELEC",  label: "Electronics" },
  { id: "C-LAB",   label: "Lab Equipment" },
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

export default function HomePage() {
  const { user, loading } = useAuth();
  
  const [items, setItems] = useState<Item[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");

  

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

  const visibleItems = user
    ? items.filter((item) => item.owner_id !== (user as any).id) 
    : items;

  return (
    <div>
      <Header />
      <div className="container">
       <Hero />
       <BrowseItems />
      </div>
      <Footer/>
    </div>
  );
}
