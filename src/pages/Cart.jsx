import { useCart } from '../context/CartContext.jsx'
import { formatPrice } from '../lib/shopify.js'

export default function Cart() {
  const { items, totalPrice, dispatch } = useCart()

  function checkout() {
    // Open Shopify checkout in browser (Telegram opens external URL)
    const lineItems = items.map(i =>
      `${encodeURIComponent(i.variantId.replace('gid://shopify/ProductVariant/', ''))}:${i.quantity}`
    ).join(',')
    const url = `https://job-919.myshopify.com/cart/${lineItems}`
    window.Telegram?.WebApp.openLink(url)
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 60 }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🛒</p>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, marginBottom: 8 }}>Your cart is empty</h2>
        <p style={{ fontSize: 14, color: 'var(--color-secondary-label)' }}>Add products to get started</p>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        Cart ({items.length})
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {items.map(item => (
          <div
            key={item.variantId}
            style={{
              display: 'flex',
              gap: 12,
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-card)',
              padding: 12,
            }}
          >
            {item.image && (
              <img
                src={item.image}
                alt={item.productTitle}
                style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                {item.productTitle}
              </p>
              {item.variantTitle !== 'Default Title' && (
                <p style={{ fontSize: 12, color: 'var(--color-secondary-label)', marginBottom: 6 }}>
                  {item.variantTitle}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-surface-button)' }}>
                  {formatPrice(item.price, item.currencyCode)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => dispatch({ type: 'UPDATE_QTY', variantId: item.variantId, quantity: item.quantity - 1 })}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: '#eee', fontSize: 16 }}
                  >−</button>
                  <span style={{ fontSize: 14, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => dispatch({ type: 'UPDATE_QTY', variantId: item.variantId, quantity: item.quantity + 1 })}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: '#eee', fontSize: 16 }}
                  >+</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-card)', padding: '16px 16px 4px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 15 }}>Subtotal</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{formatPrice(totalPrice, items[0]?.currencyCode || 'EUR')}</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-secondary-label)', marginBottom: 12 }}>
          Shipping and taxes calculated at checkout
        </p>
      </div>

      <button className="btn btn--secondary" onClick={checkout}>
        Checkout on MBOSS.US →
      </button>
    </div>
  )
}
