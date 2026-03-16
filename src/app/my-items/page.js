"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import ItemCard from "@/components/ItemCard";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

const SIDEBAR_LINKS = [
  { href: "/profile", label: "Account Main" },
  { href: "/payment-methods", label: "Payment Methods" },
  { href: "/my-items", label: "My Listed Items" },
  { href: "/my-rentals", label: "My Rentals" },
];

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}
function fmtPrice(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v) || 0);
}

export default function MyItemsPage() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tab, setTab] = useState("listings");
  const [busy, setBusy] = useState("");

  async function load() {
    if (!user) return;
    const itemsRes = await supabase.from("items").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
    const myItems = itemsRes.data ?? [];
    setItems(myItems);
    if (myItems.length > 0) {
      const myItemIds = myItems.map((i) => i.id);
      const reqRes = await supabase
        .from("rental_transactions")
        .select("*, items(name, photo_url)")
        .eq("status", "pending")
        .in("item_id", myItemIds)
        .order("created_at", { ascending: false });
      setRequests(reqRes.data ?? []);
    } else {
      setRequests([]);
    }
    setIsLoaded(true);
  }

  useEffect(() => { load(); }, [user]);

  async function handleApprove(rental) {
    setBusy(rental.id);
    await supabase.from("rental_transactions").update({ status: "active" }).eq("id", rental.id);
    const item = items.find((i) => String(i.id) === String(rental.item_id));
    if (item) {
      const avail = Math.max(0, (item.available_quantity || 1) - 1);
      await supabase.from("items").update({
        available_quantity: avail,
        item_status: avail <= 0 ? "rented" : "available",
      }).eq("id", item.id);
    }
    await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: rental.renter_id,
      body: `✅ Your rental request for "${rental.items?.name}" (ID: ${rental.id}) has been APPROVED! Please pick it up on ${fmtDate(rental.start_date)}.`,
    });
    setBusy("");
    load();
  }

  async function handleDecline(rental) {
    setBusy(rental.id);
    await supabase.from("rental_transactions").update({ status: "cancelled" }).eq("id", rental.id);
    await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: rental.renter_id,
      body: `❌ Your rental request for "${rental.items?.name}" (ID: ${rental.id}) has been declined. Feel free to message me if you have questions.`,
    });
    setBusy("");
    load();
  }

  const activeItems = items.filter((i) => i.item_status !== "rented" && i.status !== "unavailable");
  const pastItems = items.filter((i) => i.item_status === "rented" || i.status === "unavailable");

  return (
    <div>
      <Header />
      <div className="accountLayout">
        <aside className="accountSidebar">
          <div className="sidebarUser sidebarUserSlim">
            <p className="sidebarName">{user?.email ?? "Account"}</p>
          </div>
          <ul className="sidebarNav">
            {SIDEBAR_LINKS.map(({ href, label }) => (
              <li key={href} className={`sidebarNavItem${pathname === href ? " active" : ""}`}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="accountContent">
          <div className="pageHead">
            <h1 className="pageTitle">My Listed Items</h1>
            <Link href="/items/new" className="btn btnPrimary">+ Post Item</Link>
          </div>

          <div className="tabs">
            <button className={`tab${tab === "listings" ? " tabActive" : ""}`} onClick={() => setTab("listings")}>
              My Listings
              {activeItems.length > 0 && <span className="tabBadge">{activeItems.length}</span>}
            </button>
            <button className={`tab${tab === "requests" ? " tabActive" : ""}`} onClick={() => setTab("requests")}>
              Rental Requests
              {requests.length > 0 && <span className={`tabBadge tabBadgeRed`}>{requests.length}</span>}
            </button>
          </div>

          {loading || !isLoaded ? (
            <div className="centerNotice">Loading...</div>
          ) : !user ? (
            <div className="centerNotice">Please <Link href="/login">log in</Link>.</div>
          ) : tab === "listings" || tab === "listings-past" ? (
            <>
              <div className="requestsSubTabRow">
                <button
                  className={`btn btnSm${tab === "listings" ? " btnPrimary" : " btnGhost"}`}
                  onClick={() => setTab("listings")}
                >Active ({activeItems.length})</button>
                <button
                  className={`btn btnSm${tab === "listings-past" ? " btnPrimary" : " btnGhost"}`}
                  onClick={() => setTab("listings-past")}
                >Rented Out ({pastItems.length})</button>
              </div>
              {(tab === "listings-past" ? pastItems : activeItems).length === 0 ? (
                <div className="centerNotice">
                  {tab === "listings-past" ? "No rented-out items." : "No active listings."}
                </div>
              ) : (
                <div className="cardsGrid">
                  {(tab === "listings-past" ? pastItems : activeItems).map((item) => (
                    <ItemCard key={item.id} item={item} href={`/items/${item.id}`} showOwner={false} actionLabel="View / Edit" />
                  ))}
                </div>
              )}
            </>
          ) : (
            requests.length === 0 ? (
              <div className="centerNotice requestsEmptyMt">
                <p className="requestsEmptyTitle">No pending rental requests.</p>
                <p className="requestsEmptySubtitle">When a student requests to rent one of your items, it will appear here.</p>
              </div>
            ) : (
              <div className="requestsList">
                {requests.map((req) => (
                  <div key={req.id} className="requestCard">
                    <div className="requestCardRow">
                      <div className="requestCardInfo">
                        <p className="requestCardName">{req.items?.name ?? `Item #${req.item_id}`}</p>
                        <p className="requestCardMeta">Rental ID: <strong>{req.id}</strong></p>
                        <p className="requestCardMeta">
                          Period: <strong>{fmtDate(req.start_date)}</strong> → <strong>{fmtDate(req.expected_return_date)}</strong>
                        </p>
                        <p className="requestCardMeta">
                          Type: <strong className="requestTypeCapitalize">{req.rental_type}</strong> · {req.num_days} days
                        </p>
                        <p className="requestCardTotal">Total: {fmtPrice(req.total_cost)}</p>
                        <Link href={`/messages?u=${req.renter_id}`} className="btn btnGhost btnSm">
                          💬 Message Renter
                        </Link>
                      </div>
                      <div className="requestCardActions">
                        <button
                          className="btn btnPrimary requestCardBtn"
                          onClick={() => handleApprove(req)}
                          disabled={busy === req.id}
                        >
                          {busy === req.id ? "Processing..." : "✓ Approve"}
                        </button>
                        <button
                          className="btn btnDanger requestCardBtn"
                          onClick={() => handleDecline(req)}
                          disabled={busy === req.id}
                        >
                          ✕ Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
