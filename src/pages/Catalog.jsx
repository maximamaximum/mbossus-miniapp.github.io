import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAllProducts, getCollectionProducts, getCollections, formatPrice } from '../lib/shopify.js'

const PAGE_SIZE = 20

export default function Catalog() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCollection = searchParams.get('collection') || null

  const [collections, setCollections] = useState([])
  const [products, setProducts] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const tabsRef = useRef(null)

  // Fetch collections once for the tab bar
  useEffect(() => {
    getCollections(20).then(setCollections).catch(console.error)
  }, [])

  // Reset and fetch when active collection changes
  useEffect(() => {
    setProducts([])
    setCursor(null)
    setHasMore(false)
    setLoading(true)

    fetchPage(activeCollection, null, true)
  }, [activeCollection])

  async function fetchPage(collectionHandle, after, isReset) {
    try {
      const result = collectionHandle
        ? await getCollectionProducts(collectionHandle, PAGE_SIZE, after)
        : await getAllProducts(PAGE_SIZE, after)

      setProducts(prev => isReset ? result.products : [...prev, ...result.products])
      setCursor(result.pageInfo.endCursor)
      setHasMore(result.pageInfo.hasNextPage)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  function loadMore() {
    setLoadingMore(true)
    fetchPage(activeCollection, cursor, false)
  }

  function selectCollection(handle) {
    if (handle) {
      setSearchParams({ collection: handle })
    } else {
      setSearchParams({})
    }
  }

  function handleTabsScroll(e) {
    const el = e.currentTarget
    setShowLeftFade(el.scrollLeft > 10)
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  const activeLabel = activeCollection
    ? (collections.find(c => c.handle === activeCollection)?.title ?? activeCollection)
    : 'Shop'

  return (
    <div>
      {/* Collection tab bar — sticky wrapper */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--color-bg, #f4f4f4)',
        marginLeft: -16,
        marginRight: -16,
        marginBottom: 8,
      }}>
        {/* Relative container so gradient overlays can be absolutely positioned */}
        <div style={{ position: 'relative' }}>
          <div
            ref={tabsRef}
            onScroll={handleTabsScroll}
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingTop: 8,
              paddingBottom: 6,
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            {collections.map(col => {
              const isActive = activeCollection === col.handle
              return (
                <button
                  key={col.id}
                  onClick={() => selectCollection(col.handle)}
                  style={{
                    flexShrink: 0,
                    padding: '6px 14px',
                    borderRadius: 40,
                    border: '1.5px solid',
                    borderColor: isActive ? 'var(--color-surface-button)' : 'rgba(0,0,0,0.12)',
                    background: isActive ? 'var(--color-surface-button)' : 'var(--color-surface)',
                    color: isActive ? '#fff' : 'inherit',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {col.title}
                </button>
              )
            })}
          </div>

          {/* Left fade — appears after scrolling right */}
          {showLeftFade && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 40,
              background: 'linear-gradient(to right, var(--color-bg, #f4f4f4), transparent)',
              pointerEvents: 'none',
            }} />
          )}

          {/* Right fade — visible by default, hides when scrolled to end */}
          {showRightFade && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 40,
              background: 'linear-gradient(to left, var(--color-bg, #f4f4f4), transparent)',
              pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>

      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        {activeLabel}
      </h1>

      {loading ? (
        <div className="product-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <div className="skeleton" style={{ aspectRatio: '1', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 14, width: '60%' }} />
            </div>
          ))}
        </div>
      ) : (
        <>
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

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 20,
                padding: '12px',
                background: 'var(--color-surface-button)',
                color: '#fff',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                cursor: loadingMore ? 'default' : 'pointer',
                opacity: loadingMore ? 0.7 : 1,
              }}
            >
              {loadingMore ? 'Loading…' : `Load more`}
            </button>
          )}

          {!hasMore && products.length > 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-secondary-label)', fontSize: 12, marginTop: 20 }}>
              {products.length} products shown
            </p>
          )}
        </>
      )}
    </div>
  )
}
