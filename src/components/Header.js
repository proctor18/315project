"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState("");

  function nc(href) {
    const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
    return `navLink${active ? " navLinkActive" : ""}`;
  }

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) router.push(`/items?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <header className="appHeader">
      <nav className="navRow">
        <Link href="/" className="navBrand">RENTIFY</Link>

        <form onSubmit={handleSearch} className="headerSearch">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." />
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: "auto", flexShrink: 0 }}>
          <Link href="/locations" className={nc("/locations")}>Locations</Link>
          <Link href="/items" className={nc("/items")}>Browse</Link>

          {user ? (
            <>
              <Link href="/my-rentals" className={nc("/my-rentals")}>Rentals</Link>
              <Link href="/my-items" className={nc("/my-items")}>Listed</Link>
              <Link href="/messages" className={nc("/messages")}>Messages</Link>
              {isAdmin && (
                <Link href="/admin" className={nc("/admin")} style={{ marginLeft: 4, color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Admin</Link>
              )}
              <Link href="/profile" className={nc("/profile")} style={{
                marginLeft: 8,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.22)",
                borderRadius: 7,
                padding: "4px 14px",
                color: "#fff",
              }}>Account</Link>
            </>
          ) : (
            <Link href="/login" style={{
              marginLeft: 8,
              background: "#fff",
              color: "#000",
              borderRadius: 7,
              padding: "5px 16px",
              fontWeight: 700,
              fontSize: 13,
            }}>Login</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
