import { Suspense } from "react";
import Header from "@/components/Header";
import BrowseItems from "@/components/BrowseItems";

export default function BrowsePage() {
  return (
    <div>
      <Header />
      <Suspense fallback={<div className="centerNotice">Loading items...</div>}>
        <BrowseItems />
      </Suspense>
    </div>
  );
}