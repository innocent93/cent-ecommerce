// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

const Edit = ({ token }) => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [product, setProduct] = useState(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [bestseller, setBestseller] = useState(false)
  const [brand, setBrand] = useState('')
  const [color, setColor] = useState('')
  const [gender, setGender] = useState('unisex')
  const [sku, setSku] = useState('')
  const [stockBySize, setStockBySize] = useState({})
  const [trackStock, setTrackStock] = useState(false)
  const [newImages, setNewImages] = useState({ image1: null, image2: null, image3: null, image4: null })

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/product/single`, { params: { productId } })
        if (data.success) {
          const p = data.product
          setProduct(p)
          setName(p.name)
          setDescription(p.description)
          setPrice(p.price)
          setCategory(p.category)
          setSubCategory(p.subCategory)
          setBestseller(p.bestseller)
          setBrand(p.brand || '')
          setColor(p.color || '')
          setGender(p.gender || 'unisex')
          setSku(p.sku || '')
          if (p.stock) {
            setTrackStock(true)
            setStockBySize(p.stock)
          }
        } else {
          toast.error(data.message)
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not load product')
      } finally {
        setLoading(false)
      }
    })()
  }, [productId])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('description', description)
      formData.append('price', price)
      formData.append('category', category)
      formData.append('subCategory', subCategory)
      formData.append('bestseller', bestseller)
      if (brand.trim()) formData.append('brand', brand.trim())
      if (color.trim()) formData.append('color', color.trim())
      if (gender) formData.append('gender', gender)
      if (sku.trim()) formData.append('sku', sku.trim())
      if (trackStock) formData.append('stock', JSON.stringify(stockBySize))

      Object.entries(newImages).forEach(([key, file]) => {
        if (file) formData.append(key, file)
      })

      const { data } = await axios.patch(`${backendUrl}/api/product/${productId}`, formData, { headers: { token } })
      if (data.success) {
        toast.success('Product updated')
        navigate('/list')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update product')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p>Loading product...</p>
  if (!product) return <p>Product not found.</p>

  return (
    <form onSubmit={onSubmit} className='flex flex-col w-full items-start gap-3'>
      <p className='text-lg font-medium'>Edit Product</p>

      <div className='w-full'>
        <p className='mb-2'>Current Images</p>
        <div className='flex gap-2 mb-2'>
          {product.image.map((url, i) => <img key={i} src={url} className='w-16 h-16 object-cover rounded' alt='' />)}
        </div>
        <p className='mb-2 text-sm text-gray-500'>Upload a file below only for the image slot(s) you want to replace.</p>
        <div className='flex gap-2'>
          {[1, 2, 3, 4].map((i) => (
            <label key={i} className='border rounded px-2 py-1 text-xs cursor-pointer'>
              image{i}
              <input
                type='file'
                hidden
                onChange={(e) => setNewImages((prev) => ({ ...prev, [`image${i}`]: e.target.files[0] }))}
              />
            </label>
          ))}
        </div>
      </div>

      <div className='w-full'>
        <p className='mb-2'>Product Name</p>
        <input value={name} onChange={(e) => setName(e.target.value)} className='w-full max-w-[500px] px-3 py-2 border' required />
      </div>
      <div className='w-full'>
        <p className='mb-2'>Description</p>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className='w-full max-w-[500px] px-3 py-2 border' rows={3} required />
      </div>

      <div className='flex flex-col sm:flex-row gap-2 w-full sm:gap-8'>
        <div>
          <p className='mb-2'>Category</p>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className='px-3 py-2 border' />
        </div>
        <div>
          <p className='mb-2'>Sub Category</p>
          <input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className='px-3 py-2 border' />
        </div>
        <div>
          <p className='mb-2'>Price (₦)</p>
          <input type='number' min='0' step='0.01' value={price} onChange={(e) => setPrice(e.target.value)} className='px-3 py-2 border w-[120px]' required />
        </div>
      </div>

      <div className='flex flex-col sm:flex-row gap-2 w-full sm:gap-8'>
        <div>
          <p className='mb-2'>Brand</p>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className='px-3 py-2 border w-[160px]' />
        </div>
        <div>
          <p className='mb-2'>Color</p>
          <input value={color} onChange={(e) => setColor(e.target.value)} className='px-3 py-2 border w-[160px]' />
        </div>
        <div>
          <p className='mb-2'>Gender</p>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className='px-3 py-2 border'>
            <option value='unisex'>Unisex</option>
            <option value='men'>Men</option>
            <option value='women'>Women</option>
            <option value='kids'>Kids</option>
          </select>
        </div>
        <div>
          <p className='mb-2'>SKU</p>
          <input value={sku} onChange={(e) => setSku(e.target.value)} className='px-3 py-2 border w-[160px]' />
        </div>
      </div>

      <div className='w-full'>
        <div className='flex gap-2 items-center'>
          <input type='checkbox' id='trackStock' checked={trackStock} onChange={() => setTrackStock((p) => !p)} />
          <label htmlFor='trackStock'>Track stock per size</label>
        </div>
        {trackStock && (
          <div className='flex flex-col gap-2 mt-3 max-w-[500px]'>
            {(product.sizes || []).map((s) => (
              <div key={s} className='flex items-center gap-3'>
                <span className='w-16 text-sm'>{s}</span>
                <input
                  type='number'
                  min='0'
                  value={stockBySize[s] ?? ''}
                  onChange={(e) => setStockBySize((prev) => ({ ...prev, [s]: e.target.value }))}
                  className='px-2 py-1 border text-sm flex-1'
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='flex gap-2 mt-2'>
        <input type='checkbox' id='bestseller' checked={bestseller} onChange={() => setBestseller((p) => !p)} />
        <label htmlFor='bestseller'>Bestseller</label>
      </div>

      <div className='flex gap-2 mt-4'>
        <button disabled={submitting} className='px-6 py-3 bg-black text-white disabled:opacity-50' type='submit'>
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>
        <button type='button' onClick={() => navigate('/list')} className='px-6 py-3 border'>Cancel</button>
      </div>
    </form>
  )
}

export default Edit
