import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFeaturedProducts, getCollections, formatPrice } from '../lib/shopify.js'

export default function Home() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getFeaturedProducts(4), getCollections(6)])
      .then(([p, c]) => { setProducts(p); setCollections(c) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ width: '100%', overflow: 'hidden', borderRadius: 12 }}>
          <img
            src="https://cdn.shopify.com/s/files/1/0587/8084/4216/files/IMG_0083_450x_d469f1a9-8d93-4ab4-adf1-88311746e373.png?v=1775121651"
            alt="MBOSS.US Hero"
            style={{ width: '100%', display: 'block', objectFit: 'cover' }}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-secondary-label)', fontStyle: 'italic', margin: '6px 0 12px' }}>
          The unmistakable texture of authenticity.
        </p>
        <img
          src="https://cdn.shopify.com/s/files/1/0587/8084/4216/files/MBOSS.US_Logo-removebg-preview.png?v=1774778736"
          alt="MBOSS.US Logo"
          style={{ width: 100, display: 'inline-block', marginBottom: 16 }}
        />
      </div>

      {/* Collections */}
      {collections.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            Collections
          </h2>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {collections.map(col => (
              <button
                key={col.id}
                onClick={() => navigate(`/catalog?collection=${col.handle}`)}
                style={{
                  flexShrink: 0,
                  padding: '8px 16px',
                  background: 'var(--color-surface)',
                  borderRadius: 40,
                  border: '1px solid rgba(0,0,0,0.1)',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {col.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 600 }}>
            Best Sellers
          </h2>
          <button
            onClick={() => navigate('/catalog')}
            style={{ fontSize: 13, color: 'var(--color-surface-button)', fontWeight: 500 }}
          >
            See all →
          </button>
        </div>

        {loading ? (
          <div className="product-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ aspectRatio: '1', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 14, width: '60%' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="product-grid">
            {products.map(product => {
              const image = product.images.edges[0]?.node
              const price = product.priceRange.minVariantPrice
              return (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => navigate(`/product/${product.handle}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {image
                    ? <img className="product-card__image" src={image.url} alt={image.altText || product.title} />
                    : <div className="product-card__image skeleton" />
                  }
                  <div className="product-card__info">
                    <p className="product-card__title">{product.title}</p>
                    <p className="product-card__price">{formatPrice(price.amount, price.currencyCode)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
