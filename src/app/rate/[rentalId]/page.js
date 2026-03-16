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
    if (rental.renter_id !== user.id) { setMessage("Only the renter can rate this rental."); return; }
    if (!rating) { setMessage("Please select a rating."); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase
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
      else setMessage("Rating submitted successfully!");
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
      <div className="rateWrapper">
        <h1 className="rateH1">Rate Your Experience</h1>
        <form onSubmit={handleSubmit}>
          <label className="rateLabel">
            Rating:
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="rateSelect"
            >
              <option value={0}>Select rating</option>
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} ⭐</option>
              ))}
            </select>
          </label>

          <label className="rateLabelReview">
            Review (optional):
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              className="rateTextarea"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rateSubmitBtn"
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </button>

          {message && (
            <p className={`rateMessage ${message.includes("success") ? "rateMessageSuccess" : "rateMessageError"}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
