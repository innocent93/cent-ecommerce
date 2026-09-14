// @ts-nocheck
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'

const PAGE_SIZE = 20

const List = ({token}) => {

  const [ list, setList ] = useState( [] )
  const [ page, setPage ] = useState( 1 )
  const [ pagination, setPagination ] = useState(null)
  const [ search, setSearch ] = useState('')
  const [ loading, setLoading ] = useState(true)
  const navigate = useNavigate()

  const fetchList = async () =>
  {
    setLoading(true)
    try {
      const response = await axios.get( backendUrl + '/api/product/list', {
        params: { page, limit: PAGE_SIZE, ...(search.trim() && { search: search.trim() }) },
      } )

      if (response.data.success) {
        setList( response.data.products )
        setPagination(response.data.pagination || null)
      } else
      {
        toast.error(response.data.message)
      }

    } catch (error) {
      console.log( error );
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  const removeProducts = async (id) =>
  {
  try {
    const response = await axios.post( backendUrl + "/api/product/remove", { id }, { headers: { token } } )

     if (response.data.success) {
       toast.success( response.data.message )
       await fetchList();
      } else
      {
        toast.error(response.data.message)
      }
  } catch (error) {
    console.log(error);
     toast.error(error.response?.data?.message || error.message)
  }
}

  useEffect( () =>
  {
    fetchList()
  },[page])

  const onSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchList()
  }

  return (
    <>
      <div className='flex items-center justify-between mb-2'>
        <p>All Products List {pagination ? `(${pagination.total})` : ''}</p>
        <form onSubmit={onSearchSubmit} className='flex gap-2'>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search products...'
            className='border rounded px-2 py-1 text-sm'
          />
          <button className='border rounded px-3 py-1 text-sm bg-white'>Search</button>
        </form>
      </div>
      <div className='flex flex-col gap-2'>
        {/* List table title */}

        <div className='hidden md:grid grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr] items-center py-1 px-2 border bg-gray-100 text-sm'>
          <b>Image</b>
          <b>Name</b>
          <b>Category</b>
          <b>Price</b>
          <b className='text-center'>Edit</b>
          <b className='text-center'>Remove</b>
        </div>

      {/* Product List */}

        {loading && <p className='py-4 text-gray-400'>Loading...</p>}
        {!loading && list.length === 0 && <p className='py-4 text-gray-400'>No products found.</p>}

        {
          !loading && list.map( (item,index) =>
          {
            return <div className='grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr] md:grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr] items-center gap-2 py-2 border text-sm' key={index}>
              <img className='w-12' src={item.image[ 0 ]} alt="" />
              <p>{item.name }</p>
              <p>{ item.category}</p>
              <p>{ currency}{ item.price}</p>
              <p onClick={() => navigate(`/edit/${item._id}`)} className='text-center cursor-pointer underline'>Edit</p>
              <p onClick={() => removeProducts(item._id)} className='text-right md:text-center cursor-pointer text-lg'>X</p>
            </div>
          })
}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className='flex items-center gap-3 mt-4 text-sm'>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className='border rounded px-3 py-1 disabled:opacity-40'
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className='border rounded px-3 py-1 disabled:opacity-40'
          >
            Next
          </button>
        </div>
      )}
    </>
  )
}

export default List
