import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Quote, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import type { Artwork } from "@/data/artworks";
import { Card, CardContent } from "@/components/ui/card";

interface GalleryCardProps {
  artwork: Artwork;
  onImageClick?: (artwork: Artwork) => void;
}

export default function GalleryCard({ artwork, onImageClick }: GalleryCardProps) {
  const { addToCart, cart } = useCart();
  const isInCart = cart.some((item) => item.id === artwork.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="h-full overflow-hidden bg-card border-border shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:border-primary/50">
<div className="relative h-96 overflow-hidden bg-muted">
          <img
            src={artwork.imagePath}
            alt={artwork.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-pointer"
            loading="lazy"
            onClick={() => onImageClick?.(artwork)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-6">
            <div className="text-white w-full">
              <p className="opacity-90 text-sm leading-tight mb-2 font-medium line-clamp-2">
                "{artwork.myQuote}"
              </p>
              <Badge variant="secondary" className="mb-3">
                {artwork.category}
              </Badge>
            </div>
          </div>
        </div>
        
        <CardContent className="p-4 pt-2">
          <div className="space-y-3">
            <h3 className="font-semibold text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {artwork.title}
            </h3>
            
            <div className="flex justify-center">
              <Button
                variant={isInCart ? "secondary" : "default"}
                size="sm"
                onClick={() => addToCart(artwork)}
                className="gap-1.5 shadow"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {isInCart ? "Added" : "Add to Cart"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

