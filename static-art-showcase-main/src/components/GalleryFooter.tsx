import { Mail, Instagram } from "lucide-react";

const socials = [
  { label: "Email", href: "mailto:darshitgoyal4@gmail.com", icon: Mail },
  { label: "Instagram", href: "https://www.instagram.com/the.artsy.pisces?igsh=MTB0YXh1MzN1ZTh4Ng==", icon: Instagram },
];

export function GalleryFooter() {
  return (
    <footer className="px-6 md:px-12 py-20 mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="h-px bg-border mb-16" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* About Me */}
          <div className="md:col-span-2 order-1">
            <p
              className="text-primary text-xs uppercase tracking-[0.2em] mb-6 font-medium"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              About Me
            </p>
<h3 className="text-foreground text-3xl md:text-4xl font-medium italic leading-snug max-w-lg">
"Art is my language, and color is my vocabulary". I am <strong>Khushi</strong>,
            </h3>
            <p className="text-foreground mt-6 max-w-md leading-relaxed text-sm">
              a contemporary artist dedicated to showcasing a systematic perspective of the world through my work. Every piece in this gallery is accompanied by a personal thought—a window into the moment the art was born. Explore the collection, find a quote that speaks to you, and feel free to reach out.
            </p>
          </div>

          {/* Connect */}
          <div className="order-2 md:order-none">
            <p
              className="text-primary text-xs uppercase tracking-[0.2em] mb-6 font-medium"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Connect
            </p>
            <div className="flex flex-col gap-4">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center gap-3"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <s.icon className="w-4 h-4" />
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20 pt-8 h-px bg-border" />
        <p
          className="text-muted-foreground text-xs mt-8"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          @2026 All rights are reserved by master khushi.
         
        </p>
      </div>
    </footer>
  );
}
