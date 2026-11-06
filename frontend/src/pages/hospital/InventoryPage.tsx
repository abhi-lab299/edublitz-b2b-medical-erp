import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Clock, CheckCircle, Plus, X } from 'lucide-react'
import { productsApi } from '../../api/products'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import type { InventoryItem } from '../../types'

const statusBadge: Record<InventoryItem['status'], string> = {
  IN_STOCK: 'badge-green',
  LOW_STOCK: 'badge-amber',
  OUT_OF_STOCK: 'badge-red',
  EXPIRED: 'badge-red',
  QUARANTINED: 'badge-purple',
}

const initialForm = {
  productId: '',
  warehouseId: 'WH-001',
  warehouseLocation: '',
  batchNumber: '',
  manufacturingDate: '',
  expiryDate: '',
  quantity: '100',
  reorderLevel: '10',
}

export default function InventoryPage() {
  const user = useAuthStore(s => s.user)
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [successMessage, setSuccessMessage] = useState('')

  const { data: lowStock, isLoading: loadingLow } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: productsApi.getLowStock,
  })

  const { data: expiring, isLoading: loadingExp } = useQuery({
    queryKey: ['inventory', 'expiring', 30],
    queryFn: () => productsApi.getExpiring(30),
  })

  const { data: productData } = useQuery({
    queryKey: ['products', 'inventory-form'],
    queryFn: () => productsApi.list({ page: 0, size: 100 }),
    enabled: showForm,
  })

  const products = productData?.content ?? []
  const selectedProduct = products.find(
    product => product.id === form.productId
  )

  const stockMutation = useMutation({
    mutationFn: productsApi.addStock,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])

      setSuccessMessage('Stock added successfully!')
      setShowForm(false)
      setForm(initialForm)
    },
  })

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!selectedProduct) {
      alert('Please select a product.')
      return
    }

    if (!selectedProduct.distributorId) {
      alert('Selected product has no Distributor ID.')
      return
    }

    if (Number(form.quantity) < 1 || Number(form.reorderLevel) < 0) {
      alert('Please enter valid quantity and reorder level.')
      return
    }

    stockMutation.mutate({
      productId: selectedProduct.id,
      warehouseId: form.warehouseId.trim(),
      warehouseLocation: form.warehouseLocation.trim() || undefined,
      batchNumber: form.batchNumber.trim(),
      manufacturingDate: form.manufacturingDate || undefined,
      expiryDate: form.expiryDate,
      quantity: Number(form.quantity),
      reorderLevel: Number(form.reorderLevel),
      distributorId: selectedProduct.distributorId,
    })
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inventory Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor stock levels and expiry dates
          </p>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'DISTRIBUTOR') && (
          <button
            onClick={() => {
              setSuccessMessage('')
              setForm(initialForm)
              setShowForm(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Stock
          </button>
        )}
      </div>

      {successMessage && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700">
          {successMessage}
        </div>
      )}

      {showForm && (
        <div className="card">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              Add New Stock
            </h2>

            <button onClick={() => setShowForm(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="form-label">Select Product *</label>
                <select
                  required
                  value={form.productId}
                  onChange={e => updateField('productId', e.target.value)}
                  className="form-input"
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
                {products.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No products found. Check product loading.
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">Warehouse ID *</label>
                <input
                  required
                  value={form.warehouseId}
                  onChange={e => updateField('warehouseId', e.target.value)}
                  className="form-input"
                  placeholder="WH-001"
                />
              </div>

              <div>
                <label className="form-label">Warehouse Location</label>
                <input
                  value={form.warehouseLocation}
                  onChange={e => updateField('warehouseLocation', e.target.value)}
                  className="form-input"
                  placeholder="Nagpur"
                />
              </div>

              <div>
                <label className="form-label">Batch Number *</label>
                <input
                  required
                  value={form.batchNumber}
                  onChange={e => updateField('batchNumber', e.target.value)}
                  className="form-input"
                  placeholder="BATCH-1001"
                />
              </div>

              <div>
                <label className="form-label">Manufacturing Date</label>
                <input
                  type="date"
                  value={form.manufacturingDate}
                  onChange={e => updateField('manufacturingDate', e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Expiry Date *</label>
                <input
                  required
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.expiryDate}
                  onChange={e => updateField('expiryDate', e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Quantity *</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={e => updateField('quantity', e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Reorder Level *</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.reorderLevel}
                  onChange={e => updateField('reorderLevel', e.target.value)}
                  className="form-input"
                />
              </div>

            </div>

            <div className="text-sm text-gray-500">
              Distributor ID: {selectedProduct?.distributorId ?? 'Select a product first'}
            </div>

            {stockMutation.isError && (
              <p className="text-sm text-red-600">
                Failed to add stock: {
                  stockMutation.error instanceof Error
                    ? stockMutation.error.message
                    : 'Please try again.'
                }
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
                disabled={stockMutation.isPending}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={stockMutation.isPending || products.length === 0}
              >
                {stockMutation.isPending ? 'Saving...' : 'Save Stock'}
              </button>
            </div>

          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        <div className="card bg-amber-50 border-amber-100">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-amber-700">
                {lowStock?.length ?? 0}
              </p>
              <p className="text-sm text-amber-600">Low Stock Items</p>
            </div>
          </div>
        </div>

        <div className="card bg-red-50 border-red-100">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-700">
                {expiring?.length ?? 0}
              </p>
              <p className="text-sm text-red-600">Expiring in 30 days</p>
            </div>
          </div>
        </div>

        <div className="card bg-green-50 border-green-100">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-700">
                {Math.max(0, lowStock?.length === 0 ? 100 : 85)}%
              </p>
              <p className="text-sm text-green-600">Stock Health</p>
            </div>
          </div>
        </div>

      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">
          Low Stock Items
        </h3>

        {loadingLow ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Warehouse</th>
                  <th className="pb-3">Batch</th>
                  <th className="pb-3">Available</th>
                  <th className="pb-3">Reserved</th>
                  <th className="pb-3">Reorder At</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {lowStock?.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">{item.productName}</td>
                    <td>{item.warehouseId}</td>
                    <td>{item.batchNumber}</td>
                    <td>{item.quantityAvailable}</td>
                    <td>{item.quantityReserved}</td>
                    <td>{item.reorderLevel}</td>
                    <td>
                      <span className={statusBadge[item.status]}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}

                {lowStock?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center">
                      No low stock items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">
          Expiring Within 30 Days
        </h3>

        {loadingExp ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Batch</th>
                  <th className="pb-3">Expiry Date</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {expiring?.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">{item.productName}</td>
                    <td>{item.batchNumber}</td>
                    <td>
                      {format(new Date(item.expiryDate), 'dd MMM yyyy')}
                    </td>
                    <td>{item.quantityAvailable}</td>
                    <td>
                      <span className={statusBadge[item.status]}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}

                {expiring?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      No items expiring in the next 30 days
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}