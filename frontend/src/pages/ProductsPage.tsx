import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Search, Filter, X } from 'lucide-react'
import { productsApi } from '../api/products'
import { useAuthStore } from '../store/authStore'
import type { Product } from '../types'

const categories = ['ALL', 'MEDICINE', 'SURGICAL', 'DIAGNOSTIC', 'EQUIPMENT', 'CONSUMABLE', 'VACCINE']

const categoryBadge: Record<string, string> = {
  MEDICINE: 'badge-blue',
  SURGICAL: 'badge-red',
  DIAGNOSTIC: 'badge-purple',
  EQUIPMENT: 'badge-gray',
  CONSUMABLE: 'badge-amber',
  VACCINE: 'badge-green',
}

const initialForm = {
  sku: '',
  name: '',
  genericName: '',
  description: '',
  manufacturer: '',
  category: 'MEDICINE',
  type: 'BRANDED',
  dosageForm: '',
  strength: '',
  unit: '',
  mrp: '',
  wholesalePrice: '',
  prescriptionRequired: false,
  controlledSubstance: false,
  hsnCode: '',
  gstRate: '',
  distributorId: '',
}

export default function ProductsPage() {
  const user = useAuthStore(s => s.user)
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [page, setPage] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)

  const { data, isLoading } = useQuery({
    queryKey: ['products', category, page],
    queryFn: () => productsApi.list({
      category: category === 'ALL' ? undefined : category,
      page,
      size: 12,
    }),
  })

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['products', 'search', search],
    queryFn: () => productsApi.search(search),
    enabled: search.length > 2,
  })

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      setShowForm(false)
      setForm({
        ...initialForm,
        distributorId: user?.organizationId ?? '',
      })
      alert('Product added successfully!')
    },
  })

  const products = search.length > 2 ? searchResults?.content : data?.content

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (Number(form.mrp) <= 0 || Number(form.wholesalePrice) <= 0) {
      alert('MRP and Wholesale Price must be greater than zero.')
      return
    }

    if (!form.distributorId.trim()) {
      alert('Distributor ID is required.')
      return
    }

    createMutation.mutate({
      sku: form.sku.trim(),
      name: form.name.trim(),
      genericName: form.genericName.trim() || undefined,
      description: form.description.trim() || undefined,
      manufacturer: form.manufacturer.trim(),
      category: form.category as Product['category'],
      type: form.type as Product['type'],
      dosageForm: form.dosageForm.trim() || undefined,
      strength: form.strength.trim() || undefined,
      unit: form.unit.trim(),
      mrp: Number(form.mrp),
      wholesalePrice: Number(form.wholesalePrice),
      prescriptionRequired: form.prescriptionRequired,
      controlledSubstance: form.controlledSubstance,
      hsnCode: form.hsnCode.trim() || undefined,
      gstRate: form.gstRate === '' ? undefined : Number(form.gstRate),
      distributorId: form.distributorId.trim(),
    })
  }

  const updateField = (field: keyof typeof initialForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data?.totalElements ?? 0} products available
          </p>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'DISTRIBUTOR') && (
          <button
            onClick={() => {
              setForm({
                ...initialForm,
                distributorId: user?.organizationId ?? '',
              })
              setShowForm(true)
            }}
            className="btn-primary"
          >
            + Add Product
          </button>
        )}
      </div>

      {/* Add Product Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="form-label">SKU *</label>
                  <input
                    required
                    value={form.sku}
                    onChange={e => updateField('sku', e.target.value)}
                    className="form-input"
                    placeholder="e.g. MED001"
                  />
                </div>

                <div>
                  <label className="form-label">Product Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => updateField('name', e.target.value)}
                    className="form-input"
                    placeholder="Product name"
                  />
                </div>

                <div>
                  <label className="form-label">Generic Name</label>
                  <input
                    value={form.genericName}
                    onChange={e => updateField('genericName', e.target.value)}
                    className="form-input"
                    placeholder="Generic name"
                  />
                </div>

                <div>
                  <label className="form-label">Manufacturer *</label>
                  <input
                    required
                    value={form.manufacturer}
                    onChange={e => updateField('manufacturer', e.target.value)}
                    className="form-input"
                    placeholder="Manufacturer name"
                  />
                </div>

                <div>
                  <label className="form-label">Category *</label>
                  <select
                    required
                    value={form.category}
                    onChange={e => updateField('category', e.target.value)}
                    className="form-input"
                  >
                    {categories.filter(c => c !== 'ALL').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Product Type *</label>
                  <select
                    required
                    value={form.type}
                    onChange={e => updateField('type', e.target.value)}
                    className="form-input"
                  >
                    <option value="BRANDED">BRANDED</option>
                    <option value="GENERIC">GENERIC</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Dosage Form</label>
                  <input
                    value={form.dosageForm}
                    onChange={e => updateField('dosageForm', e.target.value)}
                    className="form-input"
                    placeholder="Tablet / Syrup / Capsule"
                  />
                </div>

                <div>
                  <label className="form-label">Strength</label>
                  <input
                    value={form.strength}
                    onChange={e => updateField('strength', e.target.value)}
                    className="form-input"
                    placeholder="e.g. 500mg"
                  />
                </div>

                <div>
                  <label className="form-label">Unit *</label>
                  <input
                    required
                    value={form.unit}
                    onChange={e => updateField('unit', e.target.value)}
                    className="form-input"
                    placeholder="e.g. Strip / Piece / Bottle"
                  />
                </div>

                <div>
                  <label className="form-label">MRP (₹) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.mrp}
                    onChange={e => updateField('mrp', e.target.value)}
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="form-label">Wholesale Price (₹) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.wholesalePrice}
                    onChange={e => updateField('wholesalePrice', e.target.value)}
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="form-label">GST Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="28"
                    step="0.01"
                    value={form.gstRate}
                    onChange={e => updateField('gstRate', e.target.value)}
                    className="form-input"
                    placeholder="e.g. 5"
                  />
                </div>

                <div>
                  <label className="form-label">HSN Code</label>
                  <input
                    value={form.hsnCode}
                    onChange={e => updateField('hsnCode', e.target.value)}
                    className="form-input"
                    placeholder="HSN code"
                  />
                </div>

                <div>
                  <label className="form-label">Distributor ID *</label>
                  <input
                    required
                    value={form.distributorId}
                    onChange={e => updateField('distributorId', e.target.value)}
                    className="form-input"
                    placeholder="Distributor organization ID"
                  />
                </div>

              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="Product description"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.prescriptionRequired}
                    onChange={e => updateField('prescriptionRequired', e.target.checked)}
                  />
                  Prescription Required
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.controlledSubstance}
                    onChange={e => updateField('controlledSubstance', e.target.checked)}
                  />
                  Controlled Substance
                </label>
              </div>

              {createMutation.isError && (
                <p className="text-sm text-red-600">
                  Failed to add product: {
                    createMutation.error instanceof Error
                      ? createMutation.error.message
                      : 'Please check the form and try again.'
                  }
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                  disabled={createMutation.isPending}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(0) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      {isLoading || searching ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products?.map((product: Product) => (
              <div key={product.id} className="card hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className={categoryBadge[product.category] ?? 'badge-gray'}>
                    {product.category}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">
                  {product.name}
                </h3>

                {product.genericName && (
                  <p className="text-xs text-gray-500 mb-1">{product.genericName}</p>
                )}

                <p className="text-xs text-gray-400 mb-3">{product.manufacturer}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Wholesale</p>
                    <p className="font-bold text-gray-900">₹{product.wholesalePrice}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-400">MRP</p>
                    <p className="text-sm text-gray-500">₹{product.mrp}</p>
                  </div>
                </div>

                {product.prescriptionRequired && (
                  <p className="text-xs text-red-500 mt-2 font-medium">
                    ℞ Prescription required
                  </p>
                )}
              </div>
            ))}
          </div>

          {products?.length === 0 && (
            <div className="card text-center py-10 text-gray-500">
              No products found.
            </div>
          )}

          {/* Pagination */}
          {!search && data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={data.first}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {data.number + 1} of {data.totalPages}
              </span>

              <button
                onClick={() => setPage(p => p + 1)}
                disabled={data.last}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
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