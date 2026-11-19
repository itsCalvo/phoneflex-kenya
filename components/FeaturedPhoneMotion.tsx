'use client';

import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { ProductWithListings } from '@/lib/types';

function hasLiveListing(product: ProductWithListings) {
  return (product.listings || []).some(listing =>
    listing.stock_status === 'in_stock' && Number(listing.stock_quantity ?? 1) > 0
  );
}

export default function FeaturedPhoneMotion({ products }: { products: ProductWithListings[] }) {
  const candidates = products
    .filter(product => product.image_url || product.images?.length)
    .sort((a, b) => Number(hasLiveListing(b)) - Number(hasLiveListing(a)) || Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    .slice(0, 8);

  if (!candidates.length) {
    return <div className="hero-showcase-empty"><Sparkles size={22}/><span>Discover phones from trusted sellers</span></div>;
  }

  const loop = [...candidates, ...candidates];
  return (
    <div className="phone-motion-stage" aria-label="Featured phones from the PhoneFlex catalogue">
      <div className="showcase-glow" />
      <div className="showcase-orbit showcase-orbit-a" />
      <div className="showcase-orbit showcase-orbit-b" />
      <div className="showcase-heading"><span className="showcase-live-dot" /> FEATURED ON PHONEFLEX</div>
      <div className="phone-marquee">
        <div className="phone-marquee-track">
          {loop.map((product, index) => {
            const live = hasLiveListing(product);
            return (
              <Link
                href={`/products/${product.slug}`}
                className={`motion-phone-card motion-phone-card-${index % 4}`}
                key={`${product.id}-${index}`}
                aria-label={`View ${product.name}`}
                tabIndex={index >= candidates.length ? -1 : 0}
              >
                <div className="motion-phone-image">
                  <img src={product.images?.[0] || product.image_url || '/phone-placeholder.svg'} alt="" loading="lazy" />
                  <span className={live ? 'motion-stock motion-stock-live' : 'motion-stock'}>
                    <i /> {live ? 'Seller stock' : 'Explore model'}
                  </span>
                </div>
                <div className="motion-phone-meta">
                  <small>{product.brand}</small>
                  <b>{product.name}</b>
                  <span>View details <ArrowUpRight size={13}/></span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="showcase-caption"><span>Find a phone that fits your life.</span><b>Swipe or hover to explore <span>↗</span></b></div>
    </div>
  );
}
