import { createStorefrontApiClient } from '@shopify/storefront-api-client'

export const shopifyClient = createStorefrontApiClient({
  storeDomain: import.meta.env.VITE_SHOPIFY_STORE_DOMAIN,
  apiVersion: import.meta.env.VITE_SHOPIFY_API_VERSION || '2025-01',
  publicAccessToken: import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN,
})

// Fetch featured collection products
export async function getFeaturedProducts(first = 20) {
  const query = `
    query FeaturedProducts($first: Int!) {
      products(first: $first, sortKey: BEST_SELLING) {
        edges {
          node {
            id
            title
            handle
            priceRange {
              minVariantPrice { amount currencyCode }
            }
            images(first: 1) {
              edges { node { url altText } }
            }
            variants(first: 1) {
              edges { node { id availableForSale } }
            }
          }
        }
      }
    }
  `
  const { data, errors } = await shopifyClient.request(query, { variables: { first } })
  if (errors) throw new Error(errors.message)
  return data.products.edges
    .map(e => e.node)
    .filter(p => parseFloat(p.priceRange.minVariantPrice.amount) > 0)
}

// Fetch collections that have at least one product
export async function getCollections(first = 20) {
  const query = `
    query Collections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
            image { url altText }
            products(first: 1) {
              edges { node { id } }
            }
          }
        }
      }
    }
  `
  const { data, errors } = await shopifyClient.request(query, { variables: { first } })
  if (errors) throw new Error(errors.message)
  return data.collections.edges
    .map(e => e.node)
    .filter(col => col.products.edges.length > 0)
}

// Fetch single product by handle
export async function getProduct(handle) {
  const query = `
    query Product($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        descriptionHtml
        priceRange {
          minVariantPrice { amount currencyCode }
        }
        images(first: 5) {
          edges { node { url altText } }
        }
        variants(first: 20) {
          edges {
            node {
              id
              title
              price { amount currencyCode }
              availableForSale
              selectedOptions { name value }
            }
          }
        }
        options { name values }
      }
    }
  `
  const { data, errors } = await shopifyClient.request(query, { variables: { handle } })
  if (errors) throw new Error(errors.message)
  return data.product
}

// Fetch all products with cursor-based pagination
export async function getAllProducts(first = 20, after = null) {
  const query = `
    query AllProducts($first: Int!, $after: String) {
      products(first: $first, after: $after, sortKey: BEST_SELLING) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id title handle
            priceRange { minVariantPrice { amount currencyCode } }
            images(first: 1) { edges { node { url altText } } }
            variants(first: 1) { edges { node { id availableForSale } } }
          }
        }
      }
    }
  `
  const variables = { first, ...(after ? { after } : {}) }
  const { data, errors } = await shopifyClient.request(query, { variables })
  if (errors) throw new Error(errors.message)
  return {
    products: data.products.edges
      .map(e => e.node)
      .filter(p => parseFloat(p.priceRange.minVariantPrice.amount) > 0),
    pageInfo: data.products.pageInfo,
  }
}

// Fetch products for a specific collection with cursor-based pagination
export async function getCollectionProducts(handle, first = 20, after = null) {
  const query = `
    query CollectionProducts($handle: String!, $first: Int!, $after: String) {
      collection(handle: $handle) {
        title
        products(first: $first, after: $after, sortKey: BEST_SELLING) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id title handle
              priceRange { minVariantPrice { amount currencyCode } }
              images(first: 1) { edges { node { url altText } } }
              variants(first: 1) { edges { node { id availableForSale } } }
            }
          }
        }
      }
    }
  `
  const variables = { handle, first, ...(after ? { after } : {}) }
  const { data, errors } = await shopifyClient.request(query, { variables })
  if (errors) throw new Error(errors.message)
  if (!data.collection) throw new Error('Collection not found')
  return {
    products: data.collection.products.edges
      .map(e => e.node)
      .filter(p => parseFloat(p.priceRange.minVariantPrice.amount) > 0),
    pageInfo: data.collection.products.pageInfo,
  }
}

// Format price
export function formatPrice(amount, currencyCode = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount))
}
