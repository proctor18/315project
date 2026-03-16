"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

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
  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error.message);
      return;
    }

    router.push("/login");
  }

  return (
    <header className="appHeader">
      <nav className="navRow">
        <Link href="/" className="navBrand">RENTIFY</Link>

        <form onSubmit={handleSearch} className="headerSearch">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." />
        </form>

        <div className="navActions">
          <Link href="/locations" className={nc("/locations")}>Locations</Link>
          <Link href="/items" className={nc("/items")}>Browse</Link>

          {user ? (
            <>
              <Link href="/my-rentals" className={nc("/my-rentals")}>Rentals</Link>
              <Link href="/my-items" className={nc("/my-items")}>Listed</Link>
              <Link href="/messages" className={nc("/messages")}>Messages</Link>
              {isAdmin && (
                <Link href="/admin" className={`${nc("/admin")} navLinkAdmin`}>Admin</Link>
              )}
              <Link href="/profile" className={`${nc("/profile")} navLinkAccount`}>Account</Link>
              <button onClick={logout} className=" navLink navLinkLogout">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="navLinkLogin">Login</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
