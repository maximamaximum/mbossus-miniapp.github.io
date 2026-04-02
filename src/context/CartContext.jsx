import { createContext, useContext, useReducer } from 'react'

const CartContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find(i => i.variantId === action.item.variantId)
      if (existing) {
        return state.map(i =>
          i.variantId === action.item.variantId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...state, { ...action.item, quantity: 1 }]
    }
    case 'REMOVE':
      return state.filter(i => i.variantId !== action.variantId)
    case 'UPDATE_QTY':
      return state.map(i =>
        i.variantId === action.variantId
          ? { ...i, quantity: action.quantity }
          : i
      ).filter(i => i.quantity > 0)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, [])

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, totalCount, totalPrice, dispatch }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
