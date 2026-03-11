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

/*
The payment methods page does the following:
- Add a new card
-> Checks date is valid (accepts future date)
- Add a card into a list of cards
- Exisiting card can be edited to 
-> update information like expiry date
-> remove card
- Expired label on cards past the expiry date
*/

export default function PaymentMethods() {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const [showForm, setShowForm] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [formData, setFormData] = useState({
        cardType: "",
        cardNumber: "",
        cardName: "",
        expiry: "",
        cvv: "",
    });
    const [cards, setCards] = useState([]); //list of saved cards

    useEffect(() => {
        if (!user) return;

        const fetchCards = async () => {
            const { data, error } = await supabase
                .from("payment_methods")
                .select("*")
                .eq("user_id", user.id);

            if (error) {
                console.error("Error fetching cards:", error);
            } else {
                setCards(data);
            }
        };

        fetchCards();
    }, [user]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };
    const [expiryError, setExpiryError] = useState(""); // store expiry error

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate expiry date
        const [monthStr, yearStr] = formData.expiry.split("/").map((s) => s.trim());
        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);

        if (
            !month ||
            !year ||
            month < 1 ||
            month > 12 ||
            year < new Date().getFullYear() ||
            (year === new Date().getFullYear() && month <= new Date().getMonth() + 1)
        ) {
            setExpiryError("Expiry date must be a future month and year.");
            return;
        } else {
            setExpiryError(""); // clear error if valid
        }

        if (editingIndex !== null) {
            // Update existing card
            const cardId = cards[editingIndex].id;

            const { data, error } = await supabase
                .from("payment_methods")
                .update({
                    card_type: formData.cardType,
                    card_number: formData.cardNumber,
                    card_name: formData.cardName,
                    expiry: formData.expiry,
                    cvv: formData.cvv
                })
                .eq("id", cardId)
                .select();

            if (error) {
                console.error("Error updating card:", error);
            } else {
                const updatedCards = [...cards];
                updatedCards[editingIndex] = data[0];
                setCards(updatedCards);
            }
        } else {
            if (!user) {
                console.error("User not logged in yet");
                return;
            }

            // Add new card
            const { data, error } = await supabase
                .from("payment_methods")
                .insert([
                    {
                        user_id: user.id,
                        card_type: formData.cardType,
                        card_number: formData.cardNumber,
                        card_name: formData.cardName,
                        expiry: formData.expiry,
                        cvv: formData.cvv
                    }
                ])
                .select();

            if (error) {
                console.error("Supabase insert error:", JSON.stringify(error, null, 2));
            } else {
                setCards([...cards, data[0]]);
            }
        }

        // Reset form
        setFormData({
            cardType: "",
            cardNumber: "",
            cardName: "",
            expiry: "",
            cvv: "",
        });
        setShowForm(false);
    };
    // Edit card button handler
    const handleEdit = (index) => {
        const card = cards[index];
        setFormData({
            cardType: card.card_type,
            cardNumber: card.card_number,
            cardName: card.card_name,
            expiry: card.expiry,
            cvv: card.cvv,
        });
        setEditingIndex(index);
        setShowForm(true);
    };

    // Delete card button handler
    const handleDelete = async (index) => {
        const cardId = cards[index].id;

        const { error } = await supabase
            .from("payment_methods")
            .delete()
            .eq("id", cardId);

        if (error) {
            console.error("Error deleting card:", error);
        } else {
            const updatedCards = cards.filter((_, i) => i !== index);
            setCards(updatedCards);
        }
    };

    // check if card is expired
    const isExpired = (expiry) => {
        const [month, year] = expiry.split("/").map(Number);
        if (!month || !year) return false;
        const expiryDate = new Date(year, month - 1, 1);
        const now = new Date();
        return expiryDate < new Date(now.getFullYear(), now.getMonth(), 1);
    };
    // Helper function to mask card numbers
    const maskCardNumber = (number) => {
        if (!number) return "";
        const last4 = number.slice(-4);
        return "**** **** **** " + last4;
    };


    return (
        <div>
            <Header />
            <div className="accountLayout">
                {/* Sidebar */}

                <aside className="accountSidebar">
                    <div className="sidebarUser" style={{ padding: "20px 20px 16px" }}>
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


                {/* Content */}
                <div className="accountContent">
                    <h1 className="pageTitle">Payment Methods</h1>
                    <p className="pageSubtitle">Add and manage your cards</p>

                    {/* Add New Card Button */}
                    {!showForm && (
                        <button
                            className="btn btnPrimary"
                            onClick={() => {
                                setShowForm(true);
                                setEditingIndex(null);
                                setFormData({
                                    cardType: "",
                                    cardNumber: "",
                                    cardName: "",
                                    expiry: "",
                                    cvv: "",
                                });
                            }}
                            style={{ marginTop: "20px" }}
                        >
                            Add New Card
                        </button>
                    )}

                    {/* Add Card Form */}
                    {showForm && (
                        <form
                            onSubmit={handleSubmit}
                            className="formCard"
                            style={{ marginTop: "20px" }}
                        >
                            <div className="field">
                                <label className="label">Card Type</label>
                                <input
                                    name="cardType"
                                    value={formData.cardType}
                                    onChange={handleChange}
                                    placeholder="Visa, MasterCard"
                                    required
                                />
                            </div>
                            <div className="field">
                                <label className="label">Card Number</label>
                                <input
                                    name="cardNumber"
                                    value={formData.cardNumber}
                                    onChange={handleChange}
                                    placeholder="1234 5678 9012 3456"
                                    required
                                />
                            </div>
                            <div className="field">
                                <label className="label">Cardholder Name</label>
                                <input
                                    name="cardName"
                                    value={formData.cardName}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="field">
                                <label className="label">Expiry (MM/YYYY)</label>
                                <input
                                    name="expiry"
                                    value={formData.expiry}
                                    onChange={handleChange}
                                    placeholder="10/2026"
                                    required
                                />
                                {expiryError && <p className="errorText">{expiryError}</p>} {/* NEW */}
                            </div>
                            <div className="field">
                                <label className="label">CVV</label>
                                <input
                                    name="cvv"
                                    value={formData.cvv}
                                    onChange={handleChange}
                                    placeholder="123"
                                    required
                                    maxLength={4}
                                />
                            </div>
                            <button type="submit" className="btn btnPrimary">
                                {editingIndex !== null ? "Update Card" : "Save Card"}
                            </button>
                            <button
                                type="button"
                                className="btn btnGhost"
                                onClick={() => setShowForm(false)}
                                style={{ marginLeft: "10px" }}
                            >
                                Cancel
                            </button>
                        </form>
                    )}

                    {/* Cards List with Edit/Delete/Expired */}
                    <div className="cardsGrid" style={{ marginTop: "30px" }}>
                        {cards.length === 0 && <p>No cards added yet.</p>}
                        {cards.map((card, index) => (
                            <div key={index} className="card">
                                
                                <p>
                                    <strong>{card.card_type}</strong> <br></br>{maskCardNumber(card.card_number)}{" "}
                                    {isExpired(card.expiry) && (
                                        <span className="badge badgeRed">Expired</span>
                                    )}
                                </p>
                                <p>{card.cardName}</p>
                                <p>Expires: {card.expiry}</p>
                                <div className="actions" style={{ marginTop: "10px" }}>
                                    <button
                                        className="btn btnGhost btnSm"
                                        onClick={() => handleEdit(index)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btnDanger btnSm"
                                        onClick={() => handleDelete(index)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}


                    </div>
                </div>
            </div>
        </div>
    );
}