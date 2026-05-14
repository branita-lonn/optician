// components/store/store-footer.tsx
// Server component — fetches StoreSettings; renders social links, copyright

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { SocialLinks } from "@/types";

// Simple TikTok icon (not in lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z" />
    </svg>
  );
}

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

export default async function StoreFooter() {
  const settings = await prisma.storeSettings.findFirst({
    select: {
      storeName: true,
      storeTagline: true,
      socialLinks: true,
      returnPolicy: true,
      businessHours: true,
    },
  });

  const storeName = settings?.storeName ?? "MiDuka";
  const tagline = settings?.storeTagline ?? "Your neighbourhood store, online.";
  const socialLinks = (settings?.socialLinks ?? null) as SocialLinks | null;
  const businessHours = settings?.businessHours as Record<string, { isOpen: boolean; open: string; close: string }>;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <span className="text-xl font-extrabold text-primary">{storeName}</span>
            {tagline && (
              <p className="text-sm text-muted-foreground max-w-xs">{tagline}</p>
            )}

            {/* Social links */}
            {socialLinks && (
              <div className="flex items-center gap-3 mt-2">
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <InstagramIcon className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FacebookIcon className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.tiktok && (
                  <a
                    href={socialLinks.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <TikTokIcon className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.whatsapp && (
                  <a
                    href={`https://wa.me/${socialLinks.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-foreground mb-1">Shop</span>
            <Link href="/categories" className="text-muted-foreground hover:text-foreground transition-colors">
              All Categories
            </Link>
            <Link href="/appointments" className="text-muted-foreground hover:text-foreground transition-colors">
              Book an Appointment
            </Link>
            <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors">
              Search
            </Link>
          </div>

          {/* Information */}
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-foreground mb-1">Information</span>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/returns" className="text-muted-foreground hover:text-foreground transition-colors">
              Returns Policy
            </Link>
          </div>

          {/* Business Hours */}
          {businessHours && (
            <div className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-foreground mb-1">Opening Hours</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                {Object.entries(businessHours).map(([day, data]) => (
                  <div key={day} className="contents">
                    <span className="capitalize">{day}</span>
                    <span>
                      {data.isOpen ? `${data.open} - ${data.close}` : "Closed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center text-xs text-muted-foreground">
          © {year} {storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
