import React, { useState, useMemo, useEffect } from "react";
import { Lightbox } from "@/components/Lightbox";
import { useCart } from "@/contexts/CartContext";
import { GalleryHeader } from "@/components/GalleryHeader";
import GalleryCard from "@/components/GalleryCard";
import { GalleryFooter } from "@/components/GalleryFooter";
import { Search, ShoppingCart } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Artwork {
  id: string;
  title: string;
  image_url: string;
  my_quote: string;
  category: string;
  price: number;
  available: boolean;
}

const Index = () => {
  const [artworks, setArtworks]     = useState<Artwork[]>([]);
  const [loadingArt, setLoadingArt] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArt, setSelectedArt] = useState<Artwork | null>(null);
  const { cart, clearCart } = useCart();
  const { toast } = useToast();

  // Fetch artworks from backend (Cloudinary URLs)
  useEffect(() => {
    api.get('/artworks')
      .then(res => setArtworks(res.data.artworks))
      .catch(() => toast({ title: 'Could not load artworks', variant: 'destructive' }))
      .finally(() => setLoadingArt(false));
  }, []);

  const filteredArtworks = useMemo(() => {
    if (!searchTerm) return artworks;
    return artworks.filter((artwork) =>
      artwork.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artwork.my_quote?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artwork.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, artworks]);

  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);

  return (
    <div>
      <GalleryHeader />

      {/* Search and Cart */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto mb-12">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by title, quote or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 shadow-lg hover:shadow-xl transition-all">
                <ShoppingCart className="h-4 w-4" />
                Cart <Badge variant="secondary" className="ml-1">{cart.length}</Badge>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
              <div className="mt-2 text-center">
                <h2 className="text-2xl font-semibold mb-6">Your Cart ({cart.length})</h2>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground">No items yet. Start shopping!</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex gap-4 p-4 border rounded-lg text-left">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{item.category}</p>
                            <p className="text-sm font-semibold text-primary mt-1">
                              ₹{item.price?.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cart total */}
                    <div className="border-t pt-4 mb-4">
                      <div className="flex justify-between items-center font-semibold text-lg">
                        <span>Total</span>
                        <span className="text-primary">₹{cartTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button className="w-full" onClick={() => window.location.href = '/checkout'}>
                        Proceed to Checkout
                      </Button>
                      <Button variant="outline" onClick={clearCart} className="w-full">
                        Clear Cart
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Gallery */}
      <div className="px-6 md:px-12 mb-16">
        <div className="max-w-7xl mx-auto">
          {loadingArt ? (
            // Loading skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-muted animate-pulse h-96" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredArtworks.map((artwork) => (
                <GalleryCard
                  key={artwork.id}
                  artwork={artwork}
                  onImageClick={(art) => setSelectedArt(art)}
                />
              ))}
            </div>
          )}

          {!loadingArt && filteredArtworks.length === 0 && (
            <div className="text-center py-20">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-semibold mb-2">No artworks found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      </div>

      <GalleryFooter />

      <Lightbox
        art={
          selectedArt
            ? {
                ...selectedArt,
                imagePath: selectedArt.image_url,
                myQuote: selectedArt.my_quote,
              }
            : null
        }
        onClose={() => setSelectedArt(null)}
      />
    </div>
  );
};

export default Index;