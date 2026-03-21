"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

const SIDEBAR_LINKS = [
  { href: "/profile", label: "Account Main" },
  { href: "/payment-methods", label: "Payment Methods" },
  { href: "/my-items", label: "My Listed Items" },
  { href: "/my-rentals", label: "My Rentals" },
];

export default function PaymentMethods() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    cardType: "", cardNumber: "", cardName: "", expiry: "", cvv: "",
  });
  const [cards, setCards] = useState([]);
  const [expiryError, setExpiryError] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchCards = async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", user.id);
      if (error) console.error("Error fetching cards:", error);
      else setCards(data);
    };
    fetchCards();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const [monthStr, yearStr] = formData.expiry.split("/").map((s) => s.trim());
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    if (
      !month || !year || month < 1 || month > 12 ||
      year < new Date().getFullYear() ||
      (year === new Date().getFullYear() && month <= new Date().getMonth() + 1)
    ) {
      setExpiryError("Expiry date must be a future month and year.");
      return;
    } else {
      setExpiryError("");
    }

    if (editingIndex !== null) {
      const cardId = cards[editingIndex].id;
      const { data, error } = await supabase
        .from("payment_methods")
        .update({
          card_type: formData.cardType, card_number: formData.cardNumber,
          card_name: formData.cardName, expiry: formData.expiry, cvv: formData.cvv,
        })
        .eq("id", cardId)
        .select();
      if (error) console.error("Error updating card:", error);
      else {
        const updatedCards = [...cards];
        updatedCards[editingIndex] = data[0];
        setCards(updatedCards);
      }
    } else {
      if (!user) { console.error("User not logged in yet"); return; }
      const { data, error } = await supabase
        .from("payment_methods")
        .insert([{
          user_id: user.id,
          card_type: formData.cardType, card_number: formData.cardNumber,
          card_name: formData.cardName, expiry: formData.expiry, cvv: formData.cvv,
        }])
        .select();
      if (error) console.error("Supabase insert error:", JSON.stringify(error, null, 2));
      else setCards([...cards, data[0]]);
    }

    setFormData({ cardType: "", cardNumber: "", cardName: "", expiry: "", cvv: "" });
    setShowForm(false);
  };

  const handleEdit = (index) => {
    const card = cards[index];
    setFormData({
      cardType: card.card_type, cardNumber: card.card_number,
      cardName: card.card_name, expiry: card.expiry, cvv: card.cvv,
    });
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleDelete = async (index) => {
    const cardId = cards[index].id;
    const { error } = await supabase.from("payment_methods").delete().eq("id", cardId);
    if (error) console.error("Error deleting card:", error);
    else setCards(cards.filter((_, i) => i !== index));
  };

  const isExpired = (expiry) => {
    const [month, year] = expiry.split("/").map(Number);
    if (!month || !year) return false;
    const expiryDate = new Date(year, month - 1, 1);
    const now = new Date();
    return expiryDate < new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const maskCardNumber = (number) => {
    if (!number) return "";
    return "**** **** **** " + number.slice(-4);
  };

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
          <h1 className="pageTitle">Payment Methods</h1>
          <p className="pageSubtitle">Add and manage your cards</p>

          {!showForm && (
            <button
              className="btn btnPrimary paymentAddBtnMt"
              onClick={() => {
                setShowForm(true);
                setEditingIndex(null);
                setFormData({ cardType: "", cardNumber: "", cardName: "", expiry: "", cvv: "" });
              }}
            >
              Add New Card
            </button>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="formCard paymentFormMt">
              <div className="field">
                <label className="label">Card Type</label>
                <input name="cardType" value={formData.cardType} onChange={handleChange} placeholder="Visa, MasterCard" required />
              </div>
              <div className="field">
                <label className="label">Card Number</label>
                <input name="cardNumber" value={formData.cardNumber} onChange={handleChange} placeholder="1234 5678 9012 3456" required />
              </div>
              <div className="field">
                <label className="label">Cardholder Name</label>
                <input name="cardName" value={formData.cardName} onChange={handleChange} placeholder="John Doe" required />
              </div>
              <div className="field">
                <label className="label">Expiry (MM/YYYY)</label>
                <input name="expiry" value={formData.expiry} onChange={handleChange} placeholder="10/2026" required />
                {expiryError && <p className="errorText">{expiryError}</p>}
              </div>
              <div className="field">
                <label className="label">CVV</label>
                <input name="cvv" value={formData.cvv} onChange={handleChange} placeholder="123" required maxLength={4} />
              </div>
              <button type="submit" className="btn btnPrimary">
                {editingIndex !== null ? "Update Card" : "Save Card"}
              </button>
              <button
                type="button"
                className="btn btnGhost paymentCancelBtn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </form>
          )}

          <div className="cardsGrid paymentCardsGridMt">
            {cards.length === 0 && <p>No cards added yet.</p>}
            {cards.map((card, index) => (
              <div key={index} className="card">
                <p>
                  <strong>{card.card_type}</strong><br />{maskCardNumber(card.card_number)}{" "}
                  {isExpired(card.expiry) && (
                    <span className="badge badgeRed">Expired</span>
                  )}
                </p>
                <p>{card.cardName}</p>
                <p>Expires: {card.expiry}</p>
                <div className="actions paymentCardActionsMt">
                  <button className="btn btnPrimary btnSm" onClick={() => handleEdit(index)}>Edit</button>
                  <button className="btn btnDanger btnSm" onClick={() => handleDelete(index)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
