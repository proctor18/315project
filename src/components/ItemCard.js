"use client";

import Link from "next/link";

function fmtPrice(val) {
  const n = Number(val);
  if (!isFinite(n) || n === 0) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function ItemCard({ item, href, showOwner = true, actionLabel }) {
  const price = fmtPrice(item.daily_rate ?? item.price);
  const condLabel = item.condition?.replace("_", " ") ?? null;

  return (
    <Link href={href} className="itemCardLink">
      <div className="itemCard">
        {item.photo_url ? (
          <img
            className="itemCardImg"
            src={item.photo_url}
            alt={item.name}
          />
        ) : (
          <div className="itemCardImgPlaceholder">
            No image
          </div>
        )}
        <div className="itemCardBody">
          {price && (
            <p className="itemCardPrice">
              {price}
              <span className="itemCardPriceUnit">/day</span>
            </p>
          )}
          <p className="itemCardName">{item.name}</p>
          {showOwner && item.owner_name && (
            <p className="itemCardMeta">{item.owner_name}</p>
          )}
          {actionLabel && (
            <p className="itemCardMeta itemCardAction">
              {actionLabel} →
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
