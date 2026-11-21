"use client";

import { useRef, useState } from "react";
import PhotoReviewCarousel from "@/components/reviews/PhotoReviewCarousel";
import { Plus } from "lucide-react";
import { SizeGuide } from "./SizeGuide";

export default function ProductInfoTabs({ description, specifications, hasSpecifications, videos, photos, reviews = [], reviewSubtitle, questionsAnswers = [], sizeChart, sizeCharts }) {
  const [activeTab, setActiveTab] = useState("description");
  const descriptionRef = useRef(null);
  const specificationsRef = useRef(null);
  const videosRef = useRef(null);
  const photosRef = useRef(null);
  const sizeGuideRef = useRef(null);
  const reviewsRef = useRef(null);
  const questionsAnswersRef = useRef(null);
  const hasReviews = reviews.length > 0;
  const guides = sizeCharts?.length ? sizeCharts : sizeChart ? [sizeChart] : [];

  const selectTab = (tab) => {
    setActiveTab(tab);
    requestAnimationFrame(() => {
      const targets = {
        description: descriptionRef,
        specifications: specificationsRef,
        videos: videosRef,
        photos: photosRef,
        sizeGuide: sizeGuideRef,
        reviews: reviewsRef,
        questionsAnswers: questionsAnswersRef,
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
        {guides.length > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sizeGuide"}
            aria-controls="product-size-guide"
            onClick={() => selectTab("sizeGuide")}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold sm:px-6 sm:text-base ${activeTab === "sizeGuide" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"}`}
          >
            Size Guide
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
        {questionsAnswers.length > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "questionsAnswers"}
            aria-controls="product-questions-answers"
            onClick={() => selectTab("questionsAnswers")}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors sm:px-6 sm:text-base ${activeTab === "questionsAnswers" ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"}`}
          >
            প্রশ্ন ও উত্তর
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
      {questionsAnswers.length > 0 && (
        <section ref={questionsAnswersRef} id="product-questions-answers" role="tabpanel" className="scroll-mt-24 my-5 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-xl font-bold text-text-primary">সাধারণ প্রশ্ন ও উত্তর</h2>
          <div className="divide-y divide-border">
            {questionsAnswers.map((item, index) => (
              <details key={item.id || `${item.question}-${index}`} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1 font-semibold text-text-primary marker:hidden [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <Plus size={18} className="shrink-0 text-primary transition-transform group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="whitespace-pre-line pt-3 text-sm leading-7 text-text-secondary">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
      {guides.length > 0 && (
        <section ref={sizeGuideRef} id="product-size-guide" role="tabpanel" className="my-5 scroll-mt-32 rounded-xl border border-border bg-surface p-4">
          <div className="space-y-6">
            {guides.map((chart) => <SizeGuide key={chart.id || chart.image?.id || chart.image?.name || chart.name} chart={chart} />)}
          </div>
        </section>
      )}
    </section>
  );
}
