import { useState } from "react";
import { artworks } from "@/data/artworks";
import type { Artwork } from "@/data/artworks";
import { GalleryCard } from "@/components/GalleryCard";
import { Lightbox } from "@/components/Lightbox";
import { GalleryHeader } from "@/components/GalleryHeader";
import { GalleryFooter } from "@/components/GalleryFooter";

const Index = () => {
  const [selected, setSelected] = useState<Artwork | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <GalleryHeader />

      <main className="px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {artworks.map((art, i) => (
            <GalleryCard key={art.id} art={art} index={i} onClick={() => setSelected(art)} />
          ))}
        </div>
      </main>

      <GalleryFooter />
      <Lightbox art={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default Index;
