export function GalleryHeader() {
  return (
    <header className="pt-8 pb-12 md:pt-14 md:pb-20 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Decorative dots */}
        <div className="flex gap-2 mb-8">
          <span className="w-3 h-3 rounded-full bg-pastel-pink" />
          <span className="w-3 h-3 rounded-full bg-pastel-blue" />
          <span className="w-3 h-3 rounded-full bg-pastel-mint" />
          <span className="w-3 h-3 rounded-full bg-pastel-lavender" />
          <span className="w-3 h-3 rounded-full bg-pastel-peach" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p
              className="text-primary text-xs uppercase tracking-[0.25em] mb-4 font-medium"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              ✦ Selected Works
            </p>
            <h1 className="text-foreground text-5xl md:text-7xl font-medium leading-[0.95] italic">
              Artsy Pisces
            </h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-xs leading-relaxed md:text-right">
            A curated collection of digital works exploring light, texture, and the spaces between.
          </p>
        </div>

        <div className="mt-10 h-px bg-border" />
      </div>
    </header>
  );
}
