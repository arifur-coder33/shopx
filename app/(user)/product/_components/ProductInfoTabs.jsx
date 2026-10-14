"use client";

import { useRef, useState } from "react";
import PhotoReviewCarousel from "@/components/reviews/PhotoReviewCarousel";

export default function ProductInfoTabs({ description, specifications, hasSpecifications, videos, photos, reviews = [], reviewSubtitle }) {
  const [activeTab, setActiveTab] = useState("description");
  const descriptionRef = useRef(null);
  const specificationsRef = useRef(null);
  const videosRef = useRef(null);
  const photosRef = useRef(null);
  const reviewsRef = useRef(null);
  const hasReviews = reviews.length > 0;

  const selectTab = (tab) => {
    setActiveTab(tab);
    requestAnimationFrame(() => {
      const targets = {
        description: descriptionRef,
        specifications: specificationsRef,
        videos: videosRef,
        photos: photosRef,
        reviews: reviewsRef,
      };
      const target = targets[tab]?.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="mx-auto mt-8 max-w-5xl" aria-label="পণ্যের তথ্য">
      <div
        className="sticky top-20 z-20 flex overflow-x-auto border-b border-border bg-surface/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/85"
        role="tablist"
        aria-label="পণ্যের বিবরণ ও specification"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "description"}
          aria-controls="product-description-panel"
          onClick={() => selectTab("description")}
          className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors sm:px-6 sm:text-base ${
            activeTab === "description"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          পণ্যের বিবরণ
        </button>
        {hasSpecifications && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "specifications"}
            aria-controls="product-specifications-panel"
            onClick={() => selectTab("specifications")}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors sm:px-6 sm:text-base ${
              activeTab === "specifications"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Specifications
          </button>
        )}
        {videos && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "videos"}
            aria-controls="product-videos"
            onClick={() => selectTab("videos")}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors sm:px-6 sm:text-base ${
              activeTab === "videos"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            ভিডিও
          </button>
        )}
        {photos && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "photos"}
            aria-controls="product-more-photos"
            onClick={() => selectTab("photos")}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors sm:px-6 sm:text-base ${
              activeTab === "photos"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            আরও ছবি
          </button>
        )}
        {hasReviews && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "reviews"}
            aria-controls="product-reviews"
            onClick={() => selectTab("reviews")}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors sm:px-6 sm:text-base ${
              activeTab === "reviews"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Review
          </button>
        )}
      </div>

      <div ref={descriptionRef} id="product-description-panel" role="tabpanel" className="scroll-mt-24">
        {description}
      </div>
      {hasSpecifications && (
        <div ref={specificationsRef} id="product-specifications-panel" role="tabpanel" className="scroll-mt-24">
          {specifications}
        </div>
      )}
      {videos && <div ref={videosRef} className="scroll-mt-24">{videos}</div>}
      {photos && <div ref={photosRef} className="scroll-mt-24">{photos}</div>}
      {hasReviews && (
        <div ref={reviewsRef} id="product-reviews" role="tabpanel" className="scroll-mt-24">
          <PhotoReviewCarousel
            reviews={reviews}
            title="Customer reviews"
            subtitle={reviewSubtitle}
            className="my-5 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6"
          />
        </div>
      )}
    </section>
  );
}
