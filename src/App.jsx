import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Catalog from './pages/Catalog.jsx'
import Product from './pages/Product.jsx'
import Cart from './pages/Cart.jsx'
import { CartProvider } from './context/CartContext.jsx'

const NAV = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/catalog', label: 'Shop', icon: '👗' },
  { path: '/cart', label: 'Cart', icon: '🛒' },
]

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <CartProvider>
      <div className="app">
        <div className="page" style={{ paddingBottom: 70 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/product/:handle" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
          </Routes>
        </div>

        <nav className="bottom-nav">
          {NAV.map(item => (
            <button
              key={item.path}
              className={`bottom-nav__item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </CartProvider>
  )
}
