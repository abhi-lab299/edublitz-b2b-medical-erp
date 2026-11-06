import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, X } from 'lucide-react'
import { ordersApi } from '../api/orders'
import { productsApi } from '../api/products'
import { useAuthStore } from '../store/authStore'
import { statusBadge, statusLabel } from '../utils/orderStatus'
import { formatDistanceToNow } from 'date-fns'
import type { Product } from '../types'

export default function OrdersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore(s => s.user)

  const [page, setPage] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<
    Array<{ product: Product; quantity: number }>
  >([])
  const [error, setError] = useState('')

  const isDistributor =
    user?.role === 'DISTRIBUTOR' || user?.role === 'ADMIN'

  const { data, isLoading } = useQuery({
    queryKey: ['orders', isDistributor ? 'incoming' : 'my', page],
    queryFn: () =>
      isDistributor
        ? ordersApi.getIncoming(page)
        : ordersApi.getMyOrders(page),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', 'new-order'],
    queryFn: () => productsApi.list({ page: 0, size: 100 }),
    enabled: showForm,
  })

  const createOrder = useMutation({
    mutationFn: () => {
      if (!selectedProducts.length) {
        throw new Error('Please select at least one product')
      }

      if (!shippingAddress.trim()) {
        throw new Error('Shipping address is required')
      }

      const distributorIds = [
        ...new Set(selectedProducts.map(item => item.product.distributorId)),
      ]

      if (distributorIds.length !== 1) {
        throw new Error('Please select products from only one distributor')
      }

      return ordersApi.create({
        distributorOrgId: distributorIds[0],
        shippingAddress,
        notes,
        items: selectedProducts.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowForm(false)
      setSelectedProducts([])
      setShippingAddress('')
      setNotes('')
      setError('')
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create order')
    },
  })

  const addProduct = (product: Product) => {
    setSelectedProducts(current => {
      const existing = current.find(item => item.product.id === product.id)

      if (existing) {
        return current.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...current, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setSelectedProducts(current =>
      current.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    )
  }

  const removeProduct = (productId: string) => {
    setSelectedProducts(current =>
      current.filter(item => item.product.id !== productId)
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isDistributor ? 'Incoming Orders' : 'My Orders'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {data?.totalElements ?? 0} total orders
          </p>
        </div>

        {user?.role === 'HOSPITAL' && (
          <button
            onClick={() => {
              setError('')
              setShowForm(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Order
          </button>
        )}
      </div>

      {showForm && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create New Order</h2>
            <button onClick={() => setShowForm(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Select Products
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {productsData?.content?.map(product => (
                <div
                  key={product.id}
                  className="border rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      {product.manufacturer}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      ₹{product.wholesalePrice}
                    </p>
                  </div>

                  <button
                    onClick={() => addProduct(product)}
                    className="btn-secondary text-xs"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>

            {productsData?.content?.length === 0 && (
              <p className="text-sm text-red-600 mt-2">
                No active products are available. Products must be added first.
              </p>
            )}
          </div>

          {selectedProducts.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Selected Products</h3>

              {selectedProducts.map(item => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 border-b py-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      ₹{item.product.wholesalePrice}
                    </p>
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e =>
                      updateQuantity(
                        item.product.id,
                        Number(e.target.value)
                      )
                    }
                    className="form-input w-20"
                  />

                  <button
                    onClick={() => removeProduct(item.product.id)}
                    className="text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Shipping Address
            </label>
            <textarea
              value={shippingAddress}
              onChange={e => setShippingAddress(e.target.value)}
              className="form-input"
              rows={3}
              placeholder="Enter complete shipping address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="form-input"
              rows={2}
              placeholder="Additional instructions"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={() => createOrder.mutate()}
            disabled={createOrder.isPending || selectedProducts.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {createOrder.isPending ? 'Creating Order...' : 'Submit Order'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="card animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">
                    Order #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    {isDistributor ? 'Hospital' : 'Distributor'}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Items
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Created
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {data?.content?.map(order => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-blue-600">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {isDistributor
                        ? (order.buyerOrgName ?? order.buyerOrgId)
                        : (order.distributorOrgName ?? order.distributorOrgId)}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {order.items.length}
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      ₹{order.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <span className={statusBadge[order.status]}>
                        {statusLabel[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs">
                      {formatDistanceToNow(new Date(order.createdAt), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <button className="text-blue-600 text-xs hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {data?.content?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No orders found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={data.first}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {data.number + 1} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={data.last}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}