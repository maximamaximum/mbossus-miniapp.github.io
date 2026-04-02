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
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
          MBOSS.US
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-secondary-label)', marginTop: 4 }}>
          Premium Streetwear
        </p>
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
