import React, { useState, useMemo } from "react";
import { Lightbox } from "@/components/Lightbox";
import { useCart } from "@/contexts/CartContext";
import { artworks, type Artwork } from "@/data/artworks";
import { GalleryHeader } from "@/components/GalleryHeader";
import GalleryCard from "@/components/GalleryCard";
import { GalleryFooter } from "@/components/GalleryFooter";
import { Search, ShoppingCart, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArt, setSelectedArt] = useState<Artwork | null>(null); 
  const { cart, clearCart, buyCart } = useCart();

  const filteredArtworks = useMemo(() => {
    if (!searchTerm) return artworks;
    return artworks.filter((artwork) =>
      artwork.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artwork.myQuote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artwork.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

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
                        <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                          <img src={item.imagePath} alt={item.title} className="w-16 h-16 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{item.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <Button onClick={buyCart} className="w-full">
                        Buy All ({cart.length} items)
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
{filteredArtworks.map((artwork) => (
              <GalleryCard key={artwork.id} artwork={artwork} onImageClick={(art) => setSelectedArt(art)} />
            ))}
          </div>
          {filteredArtworks.length === 0 && (
            <div className="text-center py-20">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-2xl font-semibold mb-2">No artworks found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      </div>

      <GalleryFooter />
      
      <Lightbox art={selectedArt} onClose={() => setSelectedArt(null)} />
    </div>
  );
};

export default Index;

