import { motion } from "framer-motion";
import type { Artwork } from "@/data/artworks";

const transition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

const pastelBgs = [
  "bg-pastel-pink",
  "bg-pastel-blue",
  "bg-pastel-mint",
  "bg-pastel-lavender",
  "bg-pastel-peach",
  "bg-pastel-yellow",
];

interface GalleryCardProps {
  art: Artwork;
  index: number;
  onClick: () => void;
}

export function GalleryCard({ art, index, onClick }: GalleryCardProps) {
  const bg = pastelBgs[index % pastelBgs.length];

  return (
    <motion.div
      className="group cursor-pointer"
      whileHover="hover"
      initial="initial"
      onClick={onClick}
    >
      <div
        className={`relative overflow-hidden rounded-2xl ${bg} p-3`}
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <motion.div
          variants={{ initial: { scale: 1 }, hover: { scale: 1.03 } }}
          transition={transition}
          className="aspect-[4/5] w-full overflow-hidden rounded-xl"
        >
          <img
            src={art.imagePath}
            alt={art.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </motion.div>

        {/* Hover quote overlay */}
        <motion.div
          variants={{
            initial: { opacity: 0 },
            hover: { opacity: 1 },
          }}
          transition={transition}
          className="absolute inset-3 flex items-end rounded-xl bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent p-6"
        >
          <motion.p
            variants={{
              initial: { y: 16, opacity: 0 },
              hover: { y: 0, opacity: 1 },
            }}
            transition={{ ...transition, delay: 0.08 }}
            className="text-primary-foreground text-base leading-snug italic"
            style={{ fontFamily: "var(--font-display)" }}
          >
            "{art.myQuote}"
          </motion.p>
        </motion.div>
      </div>

      {/* Caption */}
      <div className="px-2 mt-4">
        <p className="text-foreground font-medium text-sm tracking-wide">
          {art.title}
        </p>
        <p
          className="text-muted-foreground text-xs mt-1 uppercase tracking-widest"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {art.category}
        </p>
      </div>
    </motion.div>
  );
}
