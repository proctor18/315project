"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from("locations").select("*").eq("status", "active").order("name")
      .then(({ data }) => { setLocations(data ?? []); setLoaded(true); });
  }, []);

  return (
    <div>
      <Header />
      <div className="container containerPt24">
        <div className="pageHead">
          <div>
            <h1 className="pageTitle">Campus Locations</h1>
            <p className="pageSubtitle">Select a campus to browse available rental items</p>
          </div>
        </div>

        {!loaded ? <div className="centerNotice">Loading locations...</div>
          : locations.length === 0 ? <div className="centerNotice">No active locations yet.</div>
          : (
            <div className="cardsGrid locationsGrid">
              {locations.map((loc) => (
                <Link key={loc.id} href={`/locations/${loc.id}`} className="locationCard locationCardLink">
                  <div className="locationIcon">📍</div>
                  <h2 className="locationCardH2">{loc.name}</h2>
                  <p className="meta">{loc.building}</p>
                  <p className="meta">{loc.street}, {loc.city} {loc.province}</p>
                  <p className="meta locationHours">🕐 {loc.hours}</p>
                  {loc.contact_email && <p className="meta">✉ {loc.contact_email}</p>}
                  <div className="locationBrowseWrap">
                    <span className="btn btnGhost btnSm">Browse items →</span>
                  </div>
                </Link>
              ))}
            
            </div>
          )}
      </div>
      <Footer/>
    </div>
  );
}
