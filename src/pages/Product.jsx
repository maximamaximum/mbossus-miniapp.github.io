import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProduct, formatPrice } from '../lib/shopify.js'
import { useCart } from '../context/CartContext.jsx'

const PRODUCT_INFO = [
  { label: 'Cost-Per-Wear Calculator', url: 'https://www.mboss.us/pages/cost-per-wear-calculator' },
  { label: 'Size Chart', url: 'https://www.mboss.us/pages/body-sizes-for-dresses' },
  { label: 'Conversion Chart', url: 'https://www.mboss.us/pages/conversation-chart' },
  { label: 'Certifications', url: 'https://www.mboss.us/pages/certifications' },
  { label: 'Delivery Time & Costs', url: 'https://www.mboss.us/pages/delivery-time-costs' },
]

function openLink(url) {
  const tg = window.Telegram?.WebApp
  if (tg?.openLink) tg.openLink(url)
  else window.open(url, '_blank')
}

function AccordionRow({ label, url }) {
  return (
    <button
      onClick={() => openLink(url)}
      style={{
        width: '100%', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '13px 0', background: 'none',
        border: 'none', borderBottom: '1px solid rgba(0,0,0,0.08)',
        fontSize: 14, fontWeight: 500, cursor: 'pointer',
        color: 'var(--color-text)', textAlign: 'left',
      }}
    >
      {label}
      <span style={{ color: 'var(--color-secondary-label)', fontSize: 16 }}>›</span>
    </button>
  )
}

export default function Product() {
  const { handle } = useParams()
  const navigate = useNavigate()
  const { dispatch } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    getProduct(handle)
      .then(p => {
        setProduct(p)
        setSelectedVariant(p?.variants.edges[0]?.node)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [handle])

  // Set back button behavior
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.BackButton.show()
      tg.BackButton.onClick(() => navigate(-1))
    }
    return () => tg?.BackButton.hide()
  }, [navigate])

  function addToCart() {
    if (!selectedVariant) return
    dispatch({
      type: 'ADD',
      item: {
        variantId: selectedVariant.id,
        productTitle: product.title,
        variantTitle: selectedVariant.title,
        price: selectedVariant.price.amount,
        currencyCode: selectedVariant.price.currencyCode,
        image: product.images.edges[0]?.node.url,
      },
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ aspectRatio: '1', marginBottom: 16, borderRadius: 'var(--radius-card)' }} />
        <div className="skeleton" style={{ height: 24, marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 18, width: '40%', marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 48 }} />
      </div>
    )
  }

  if (!product) return <p style={{ textAlign: 'center', marginTop: 40 }}>Product not found</p>

  const images = product.images.edges.map(e => e.node)
  const variants = product.variants.edges.map(e => e.node)

  return (
    <div>
      {/* Images */}
      {images.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <img
            src={images[activeImage].url}
            alt={images[activeImage].altText || product.title}
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius-card)' }}
          />
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto' }}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt=""
                  onClick={() => setActiveImage(i)}
                  style={{
                    width: 60, height: 60, objectFit: 'cover',
                    borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                    border: i === activeImage ? '2px solid var(--color-surface-button)' : '2px solid transparent',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title & Price */}
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        {product.title}
      </h1>
      <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-surface-button)', marginBottom: 16 }}>
        {selectedVariant && formatPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode)}
      </p>

      {/* Variants */}
      {product.options.map(option => (
        <div key={option.name} style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{option.name}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {option.values.map(value => {
              const variant = variants.find(v =>
                v.selectedOptions.some(o => o.name === option.name && o.value === value)
              )
              const isSelected = selectedVariant?.selectedOptions.some(
                o => o.name === option.name && o.value === value
              )
              return (
                <button
                  key={value}
                  onClick={() => variant && setSelectedVariant(variant)}
                  disabled={!variant?.availableForSale}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-button)',
                    border: isSelected
                      ? '2px solid var(--color-surface-button)'
                      : '1px solid rgba(0,0,0,0.15)',
                    background: isSelected ? 'var(--color-surface-button)' : 'transparent',
                    color: isSelected ? 'var(--color-surface-button-label)' : 'var(--color-text)',
                    fontSize: 13,
                    fontWeight: 500,
                    opacity: variant?.availableForSale ? 1 : 0.4,
                  }}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Add to cart */}
      <button
        className="btn btn--secondary"
        onClick={addToCart}
        disabled={!selectedVariant?.availableForSale}
        style={{ marginTop: 8, marginBottom: 20 }}
      >
        {added ? '✓ Added to cart' : selectedVariant?.availableForSale ? 'Add to Cart' : 'Sold Out'}
      </button>

      {/* Description */}
      {product.descriptionHtml && (
        <div
          style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(0,0,0,0.7)', marginBottom: 24 }}
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      )}

      {/* Product Info */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        {PRODUCT_INFO.map(item => (
          <AccordionRow key={item.label} label={item.label} url={item.url} />
        ))}
      </div>
    </div>
  )
}
