"use client";

// Vervolgstap na het kiezen van een bloei-status: foto en beoordeling

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Star, Check, X } from "lucide-react";
import type { TulipField, BloomStatusType } from "@/lib/tulipFields";
import { STATUS_CONFIG } from "@/lib/tulipFields";

interface FollowUpData {
  photoUrl?: string;
  rating?: number;
  reviewText?: string;
}

interface Props {
  field: TulipField;
  selectedStatus: BloomStatusType;
  isOpen: boolean;
  onComplete: (data: FollowUpData) => void;
  onClose: () => void;
}

export default function BloomStatusFollowUp({
  field,
  selectedStatus,
  isOpen,
  onComplete,
  onClose,
}: Props) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [mockPhotoAdded, setMockPhotoAdded] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const cfg = STATUS_CONFIG[selectedStatus];

  function handleFotoClick() {
    // Simuleer foto toevoegen (mock)
    setMockPhotoAdded(true);
  }

  function handleKlaar() {
    onComplete({
      photoUrl: mockPhotoAdded ? "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=400" : undefined,
      rating: rating > 0 ? rating : undefined,
      reviewText: reviewText.trim() || undefined,
    });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label="Extra informatie toevoegen"
          >
            {/* Handvat */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" aria-hidden="true" />
            </div>

            <div className="px-5 pb-8 pt-2">
              {/* Header met gekozen status */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: cfg.bg, color: cfg.text }}
                    >
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>
                  <h2 className="text-base font-extrabold text-gray-900">
                    Top, dank je. Wil je nog iets toevoegen?
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{field.name}</p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Sluiten"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100
                             hover:bg-gray-200 transition-colors flex-shrink-0 ml-3"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              </div>

              {/* Acties */}
              <div className="space-y-3 mb-5">
                {/* Foto toevoegen */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleFotoClick}
                  disabled={mockPhotoAdded}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2
                             transition-all text-left"
                  style={{
                    borderColor: mockPhotoAdded ? "#2D7D46" : "#E5E7EB",
                    backgroundColor: mockPhotoAdded ? "#F0FDF4" : "#FAFAFA",
                    minHeight: 60,
                  }}
                >
                  {mockPhotoAdded ? (
                    <Check size={20} className="text-green-600 flex-shrink-0" />
                  ) : (
                    <Camera size={20} className="flex-shrink-0" style={{ color: "#E8527A" }} />
                  )}
                  <div>
                    <p className={`font-bold text-sm ${mockPhotoAdded ? "text-green-700" : "text-gray-800"}`}>
                      {mockPhotoAdded ? "Foto toegevoegd" : "Foto toevoegen"}
                    </p>
                    {!mockPhotoAdded && (
                      <p className="text-xs text-gray-400 mt-0.5">Camera of galerij</p>
                    )}
                  </div>
                </motion.button>

                {/* Beoordeling */}
                <div className="px-4 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50">
                  <p className="font-bold text-sm text-gray-800 mb-3">Beoordeling geven</p>
                  {/* Sterren */}
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        whileTap={{ scale: 0.85 }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star === rating ? 0 : star)}
                        aria-label={`${star} ster${star !== 1 ? "ren" : ""}`}
                        className="p-1"
                        style={{ minWidth: 40, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Star
                          size={28}
                          fill={(hoverRating || rating) >= star ? "#F59E0B" : "none"}
                          stroke={(hoverRating || rating) >= star ? "#F59E0B" : "#D1D5DB"}
                          strokeWidth={1.5}
                        />
                      </motion.button>
                    ))}
                    {rating > 0 && (
                      <span className="text-sm text-gray-500 self-center ml-1">
                        {["", "Slecht", "Matig", "Goed", "Heel goed", "Fantastisch"][rating]}
                      </span>
                    )}
                  </div>

                  {/* Optioneel tekstveld — verschijnt zodra ster gekozen */}
                  <AnimatePresence>
                    {(rating > 0 || showReview) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <textarea
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value.slice(0, 120))}
                          placeholder="Optioneel: schrijf iets over dit veld..."
                          rows={2}
                          className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl
                                     focus:outline-none focus:ring-2 focus:border-transparent
                                     resize-none"
                          style={{ ["--tw-ring-color" as string]: "#E8527A" }}
                        />
                        <p className="text-xs text-gray-400 text-right mt-1">
                          {reviewText.length}/120
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {rating === 0 && !showReview && (
                    <button
                      onClick={() => setShowReview(true)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      + Reactie toevoegen
                    </button>
                  )}
                </div>
              </div>

              {/* Klaar knop */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleKlaar}
                className="w-full py-4 rounded-2xl text-white text-sm font-extrabold
                           transition-colors"
                style={{ backgroundColor: "#E8527A", minHeight: 52 }}
              >
                Klaar
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
