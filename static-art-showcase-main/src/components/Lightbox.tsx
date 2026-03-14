import { motion, AnimatePresence } from "framer-motion";
import type { Artwork } from "@/data/artworks";
import { X } from "lucide-react";

interface LightboxProps {
  art: Artwork | null;
  onClose: () => void;
}

export function Lightbox({ art, onClose }: LightboxProps) {
  return (
    <AnimatePresence>
      {art && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12"
          style={{
            backgroundColor: "hsl(var(--overlay))",
            backdropFilter: `blur(var(--overlay-blur))`,
          }}
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-50 text-background/70 hover:text-background transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center gap-8"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={art.imagePath}
              alt={art.title}
              className="w-full max-h-[70vh] object-contain rounded-lg"
              style={{ boxShadow: "0 24px 80px -16px rgba(0,0,0,0.4)" }}
            />
            <div className="text-center">
              <h2
                className="text-background text-3xl font-medium italic mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {art.title}
              </h2>
              <p
                className="text-background/50 text-xs uppercase tracking-[0.2em] mb-3"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {art.category}
              </p>
              <p
                className="text-background/80 text-lg italic"
                style={{ fontFamily: "var(--font-display)" }}
              >
                "{art.myQuote}"
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
