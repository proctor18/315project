"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function RateSellerPage() {
  const { rentalId } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [rental, setRental] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchRental = async () => {
      if (!rentalId) return;

      const { data } = await supabase
        .from("rental_transactions")
        .select(`id, renter_id, status, items!inner(owner_id)`)
        .eq("id", rentalId)
        .single();

      if (!data) setMessage("Rental not found.");
      else setRental(data);
    };
    fetchRental();
  }, [rentalId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!rental || !user) return;
    if (rental.renter_id !== user.id) {
      setMessage("Only the renter can rate this rental.");
      return;
    }
    if (!rating) {
      setMessage("Please select a rating.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("ratings")
        .insert([{
          rental_id: rental.id,
          seller_id: rental.items.owner_id,
          buyer_id: user.id,
          rating,
          review,
          created_at: new Date().toISOString(),
        }])
        .select();

      if (error) setMessage("Failed to submit rating.");
      else {
        setMessage("Rating submitted successfully!");
        //router.push("/");
      }
    } catch {
      setMessage("Unexpected error submitting rating.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !rental) return <p>{message || "Loading..."}</p>;

  return (
    <div>
      <Header />
      <div style={{ maxWidth: 500, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Rate Your Experience</h1>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 8 }}>
            Rating:
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 16 }}
            >
              <option value={0}>Select rating</option>
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} ⭐</option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 16 }}>
            Review (optional):
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              display: "block",
              width: "100%",
              padding: 12,
              fontWeight: 700,
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </button>

          {message && (
            <p style={{ marginTop: 12, color: message.includes("success") ? "green" : "red" }}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}