// @ts-nocheck
import React, { useState } from 'react'
import { assets } from '../assets/admin_assets/assets'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

const PRESET_SIZES = ["S", "M", "L", "XL", "XXL"]

const Add = ({token}) =>
{

   const [image1,setImage1] = useState(false)
   const [image2,setImage2] = useState(false)
   const [image3,setImage3] = useState(false)
   const [image4,setImage4] = useState(false)

   const [name,setName] = useState("")
   const [description,setDescription] = useState("")
   const [category,setCategory] = useState("Men")
   const [subCategory,setSubCategory] = useState("Topwear")
   const [price,setPrice] = useState("")
   const [bestseller,setBestseller] = useState(false)
   const [sizes,setSizes] = useState([])
   const [customSizeInput, setCustomSizeInput] = useState("")

   // --- Footwear / apparel detail fields (all optional — safe for existing
   // clothing products, required in practice when selling shoes) ---
   const [brand, setBrand] = useState("")
   const [color, setColor] = useState("")
   const [gender, setGender] = useState("unisex")
   const [sku, setSku] = useState("")
   const [trackStock, setTrackStock] = useState(false)
   const [stockBySize, setStockBySize] = useState({}) // { [size]: quantity }
   const [submitting, setSubmitting] = useState(false)

  const toggleSize = (size) => {
    setSizes(prev => prev.includes(size) ? prev.filter(item => item !== size) : [...prev, size])
  }

  const addCustomSize = () => {
    const value = customSizeInput.trim()
    if (!value) return
    if (!sizes.includes(value)) setSizes(prev => [...prev, value])
    setCustomSizeInput("")
  }

  const onSubmitHandler = async ( e ) =>
  {
    e.preventDefault()

    if (sizes.length === 0) {
      toast.error("Select or add at least one size")
      return
    }
    if (!image1 && !image2 && !image3 && !image4) {
      toast.error("Upload at least one product image")
      return
    }

    setSubmitting(true)
    try
    {
      const formData = new FormData();

      formData.append( "name", name )
      formData.append( "description", description )
      formData.append( "price", ( price ) )
      formData.append( "category", category )
      formData.append( "subCategory", subCategory )
      formData.append( "bestseller", bestseller )
      formData.append( "sizes", JSON.stringify( sizes ) )

      if (brand.trim()) formData.append("brand", brand.trim())
      if (color.trim()) formData.append("color", color.trim())
      if (gender) formData.append("gender", gender)
      if (sku.trim()) formData.append("sku", sku.trim())

      if (trackStock) {
        // Backend requires a quantity for every selected size when stock is
        // being tracked at all — default any size the admin hasn't typed a
        // number for to 0 rather than silently omitting it.
        const stockPayload = {}
        sizes.forEach((s) => { stockPayload[s] = Number(stockBySize[s] || 0) })
        formData.append("stock", JSON.stringify(stockPayload))
      }

      image1 && formData.append("image1",image1)
      image2 && formData.append("image2",image2)
      image3 && formData.append("image3",image3)
      image4 && formData.append( "image4", image4 )

      const response = await axios.post( backendUrl + '/api/product/add', formData,{headers:{token}} )

      if (response.data.success) {
        toast.success( response.data.message )
        setName( '' )
        setDescription( '' )
        setImage1( false )
        setImage2( false )
        setImage3( false )
        setImage4( false )
        setPrice('')
        setSizes([])
        setBrand('')
        setColor('')
        setSku('')
        setStockBySize({})
        setTrackStock(false)
      } else
      {
        toast.error(response.data.message)
      }

   } catch (error) {
     console.log( error );
     toast.error( error.response?.data?.message || "Could not add product" )
   } finally {
     setSubmitting(false)
   }
  }


  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col w-full items-start gap-3'>
      <div>
        <p className='mb-2'>Upload Image</p>

        <div className='flex gap-2'>
          <label htmlFor="image1">
            <img className='w-20' src={!image1 ? assets.upload_area : URL.createObjectURL(image1)} alt="upload" />
            <input onChange={(e) => setImage1(e.target.files[0])} type="file" id='image1' hidden />
          </label>
          <label htmlFor="image2">
            <img className='w-20' src={!image2 ? assets.upload_area : URL.createObjectURL(image2)} alt="upload" />
            <input onChange={(e) => setImage2(e.target.files[0])} type="file" id='image2' hidden />
          </label>
          <label htmlFor="image3">
            <img className='w-20' src={!image3 ? assets.upload_area : URL.createObjectURL(image3)} alt="upload" />
            <input onChange={(e) => setImage3(e.target.files[0])} type="file" id='image3' hidden />
          </label>
          <label htmlFor="image4">
            <img className='w-20' src={!image4 ? assets.upload_area : URL.createObjectURL(image4)} alt="upload" />
            <input onChange={(e) => setImage4(e.target.files[0])} type="file" id='image4' hidden />
          </label>
        </div>
      </div>

      <div className='w-full'>
        <p className='mb-2'>Product Name</p>
        <input onChange={(e) => setName(e.target.value)} value={name} className='w-full max-w-[500px] px-3 py-2' type="text" placeholder='Type here' required />
    </div>
      <div className='w-full'>
        <p className='mb-2'>Product Description</p>
        <textarea onChange={(e) => setDescription(e.target.value)} value={description} className='w-full max-w-[500px] px-3 py-2' rows={3}  placeholder='Write content here' required />
    </div>

      <div className='flex flex-col sm:flex-row gap-2 w-full sm:gap-8'>
        <div>
          <p className='mb-2'>Product Category</p>
          <select onChange={(e) => setCategory(e.target.value)} value={category} className='w-full px-3 py-2'>
            <option value="Men">Men</option>
            <option value="Women">Women</option>
            <option value="Kids">Kids</option>
            <option value="Footwear">Footwear</option>
          </select>
        </div>
        <div>
          <p className='mb-2'>Sub Category</p>
          <select onChange={(e) => setSubCategory(e.target.value)} value={subCategory} className='w-full px-3 py-2'>
            <option value="Topwear">Topwear</option>
            <option value="Bottomwear">Bottomwear</option>
            <option value="Winterwear">Winterwear</option>
            <option value="Sneakers">Sneakers</option>
            <option value="Boots">Boots</option>
            <option value="Sandals">Sandals</option>
          </select>
        </div>

        <div>
          <p className='mb-2'>Product Price (₦)</p>
          <input onChange={(e) => setPrice(e.target.value)} value={price} className='w-full  px-3 py-2 sm:w-[120px]' type="number" min="0" step="0.01" placeholder='25000' required />
        </div>

      </div>

      <div className='flex flex-col sm:flex-row gap-2 w-full sm:gap-8'>
        <div>
          <p className='mb-2'>Brand <span className='text-gray-400 text-xs'>(optional)</span></p>
          <input onChange={(e) => setBrand(e.target.value)} value={brand} className='w-full px-3 py-2 sm:w-[160px]' type="text" placeholder='e.g. Nike' />
        </div>
        <div>
          <p className='mb-2'>Color <span className='text-gray-400 text-xs'>(optional)</span></p>
          <input onChange={(e) => setColor(e.target.value)} value={color} className='w-full px-3 py-2 sm:w-[160px]' type="text" placeholder='e.g. Black' />
        </div>
        <div>
          <p className='mb-2'>Gender</p>
          <select onChange={(e) => setGender(e.target.value)} value={gender} className='w-full px-3 py-2'>
            <option value="unisex">Unisex</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="kids">Kids</option>
          </select>
        </div>
        <div>
          <p className='mb-2'>SKU <span className='text-gray-400 text-xs'>(optional)</span></p>
          <input onChange={(e) => setSku(e.target.value)} value={sku} className='w-full px-3 py-2 sm:w-[160px]' type="text" placeholder='e.g. SHOE-BLK-01' />
        </div>
      </div>

      <div>
        <p className='mb-2'>Product Sizes</p>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap'>
          {PRESET_SIZES.map((s) => (
            <div key={s} onClick={() => toggleSize(s)}>
              <p className={`${sizes.includes(s) ? "bg-pink-100" : "bg-slate-200"} px-3 py-1 cursor-pointer`}>{s}</p>
            </div>
          ))}
          {sizes.filter((s) => !PRESET_SIZES.includes(s)).map((s) => (
            <div key={s} onClick={() => toggleSize(s)}>
              <p className='bg-pink-100 px-3 py-1 cursor-pointer'>{s} &times;</p>
            </div>
          ))}
          <div className='flex gap-1'>
            <input
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              placeholder='e.g. US 9 (for shoes)'
              className='px-2 py-1 border text-sm w-32'
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
            />
            <button type='button' onClick={addCustomSize} className='px-2 py-1 border text-sm bg-white'>Add size</button>
          </div>
        </div>
      </div>

      <div className='w-full'>
        <div className='flex gap-2 items-center mt-2'>
          <input onChange={() => setTrackStock(prev => !prev)} checked={trackStock} type="checkbox" id='trackStock' />
          <label className='cursor-pointer' htmlFor="trackStock">Track stock per size</label>
        </div>
        {trackStock && sizes.length > 0 && (
          <div className='flex flex-col gap-2 mt-3 max-w-[500px]'>
            {sizes.map((s) => (
              <div key={s} className='flex items-center gap-3'>
                <span className='w-16 text-sm'>{s}</span>
                <input
                  type='number'
                  min='0'
                  value={stockBySize[s] ?? ''}
                  onChange={(e) => setStockBySize(prev => ({ ...prev, [s]: e.target.value }))}
                  placeholder='Quantity in stock'
                  className='px-2 py-1 border text-sm flex-1'
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='flex gap-2 mt-2'>
        <input onChange={() =>setBestseller(prev => !prev)} checked={bestseller} type="checkbox" id='bestseller' />
      <label className='cursor-pointer' htmlFor="bestseller">Add to bestseller</label>
      </div>

      <button disabled={submitting} className='w-28 py-3 bg-black mt-4 text-white md:full disabled:opacity-50' type='submit'>{submitting ? '...' : 'Add'}</button>

    </form>
  )
}

export default Add
