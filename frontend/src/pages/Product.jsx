// @ts-nocheck
import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../frontend_assets/assets";
import Relatedproducts from "../components/RelatedProducts";
import api from "../utils/api";
import optimizedImage from "../utils/cloudinaryImage";
import { toast } from "react-toastify";
import useSEO from "../hooks/useSEO";

const Product = () =>
{

   const {productId} = useParams()
  const { products,currency,addToCart, wishlist, toggleWishlist, isLoggedIn } = useContext( ShopContext )
  const [ productData, setProductData ] = useState( false )
  const [ image, setImage ] = useState( '' )
  const [size,setSize ] = useState( '' )
  const [reviews, setReviews] = useState([])
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [activeTab, setActiveTab] = useState('description')

  const isWishlisted = wishlist?.includes(productId)

  useSEO(
    productData
      ? {
          title: `${productData.name} | Store`,
          description: productData.description?.slice(0, 155),
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: productData.name,
            description: productData.description,
            image: productData.image,
            brand: productData.brand ? { '@type': 'Brand', name: productData.brand } : undefined,
            offers: {
              '@type': 'Offer',
              priceCurrency: productData.currency || 'NGN',
              price: productData.price,
              availability:
                productData.totalStock === 0
                  ? 'https://schema.org/OutOfStock'
                  : 'https://schema.org/InStock',
            },
            aggregateRating:
              productData.ratingCount > 0
                ? {
                    '@type': 'AggregateRating',
                    ratingValue: productData.ratingAverage,
                    reviewCount: productData.ratingCount,
                  }
                : undefined,
          },
        }
      : {}
  )

  const fetchProductData = async () =>
  {
    products.map( ( item) =>
    {
      if (item._id === productId) {
        setProductData( item )
       setImage(item.image[0])
        return null
      }
    })
  }

  const fetchReviews = async () => {
    try {
      const { data } = await api.get(`/api/products/${productId}/reviews`)
      if (data.success) setReviews(data.reviews)
    } catch {
      /* non-fatal */
    }
  }

  useEffect( () =>
  {
    fetchProductData()
    fetchReviews()
  },[productId, products])

  const onSubmitReview = async (e) => {
    e.preventDefault()
    if (!isLoggedIn) {
      toast.info('Please log in to leave a review')
      return
    }
    setSubmittingReview(true)
    try {
      const { data } = await api.post(`/api/products/${productId}/reviews`, reviewForm)
      if (data.success) {
        toast.success('Review submitted, thank you!')
        setReviewForm({ rating: 5, comment: '' })
        fetchReviews()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  return productData ?   (
    <div className="bordert-t pt-10 transition-opacity duration-500 opacity-100">
      {/* Product Data */}
      <div className="flex gap-12 sm:gap-12 flex-col sm:flex-row">
        {/* Product Images */}
        <div className="flex-1 flex flex-col-reverse gap-3 sm:flex-row">
          <div className="flex sm:flex-col overflow-x-auto sm:overflow-y-scroll justify-between sm:justify-normal sm:w-[18.7%] w-full">
            {productData.image.map( (item,index) =>
            {
               return <img onClick={()=> setImage(item)} src={optimizedImage(item, 150)} loading="lazy" decoding="async" key={index} className="w-[24%] sm:w-full sm:mb-3 flex-shrink-0 cursor-pointer" alt={`${productData.name} thumbnail ${index + 1}`} />
             })}
          </div>



          <div className="w-full sm:w-[80%]">
            <img src={optimizedImage(image, 800)} className="w-full h-auto" alt={productData.name} />

          </div>
        </div>
        {/* Product Information */}
      <div className="flex-1">
          <div className="flex items-start justify-between">
            <h1 className="font-medium text-2xl mt-2">{productData.name}</h1>
            <button
              onClick={() => toggleWishlist(productId, isWishlisted)}
              className={`text-xl mt-2 ${isWishlisted ? 'text-red-500' : 'text-gray-300'}`}
              aria-label="Toggle wishlist"
              type="button"
            >
              &#9829;
            </button>
          </div>
          {productData.brand && <p className="text-sm text-gray-500 mt-1">{productData.brand}</p>}
          <div className="flex items-center gap-1 mt-2">
            {[1,2,3,4,5].map((star) => (
              <img
                key={star}
                src={star <= Math.round(productData.ratingAverage || 0) ? assets.star_icon : assets.star_dull_icon}
                className="w-3.5"
                alt=""
              />
            ))}
            <p className="pl-2">({productData.ratingCount || 0})</p>
          </div>
          <p className="mt-5 text-3xl font-medium">{currency}{ productData.price}</p>
          <p className="mt-5 text-gray-500 w-4/5">{productData.description}</p>
          <div className="flex flex-col gap-4 my-8">
            <p>Select Size</p>
            <div className="flex gap-2 flex-wrap">
              {productData.sizes.map( (item, index)  => {
                const stockForSize = productData.stock ? productData.stock[item] : undefined;
                const isOutOfStock = stockForSize === 0;
                return (
                  <button
                    onClick={() => !isOutOfStock && setSize(item)}
                    disabled={isOutOfStock}
                    className={`border py-2 px-4 bg-gray-100 ${item === size ? 'border-orange-500' : ''} ${isOutOfStock ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                    key={index}
                  >
                    {item}
                  </button>
                )
               }) }
            </div>
          </div>
          <button onClick={() => addToCart(productData._id,size)} className="bg-black text-white px-8 py-3 text-sm active:bg-gray-700">ADD TO CART</button>
          <hr className="mt-8 sm:w-4/5" />
          <div className="text-sm text-gray-500 mt-5 flex flex-col gap-1">
            <p>100% Original products</p>
            <p>Cash on delivery is available on this product</p>
            <p>Easy return and exchange policy within 7 days</p>
          </div>

  </div>
      </div>


      {/* Description and review section */}
      <div className="mt-20">
        <div className="flex">
          <b onClick={() => setActiveTab('description')} className={`border px-5 py-3 text-sm cursor-pointer ${activeTab === 'description' ? 'bg-gray-50' : ''}`}>Description</b>
          <p onClick={() => setActiveTab('reviews')} className={`border px-5 py-3 text-sm cursor-pointer ${activeTab === 'reviews' ? 'bg-gray-50' : ''}`}>Reviews ({reviews.length})</p>
        </div>

        {activeTab === 'description' ? (
          <div className="flex flex-col gap-4 border px-6 py-6 text-sm text-gray-600">
            <p>{productData.description}</p>
          </div>
        ) : (
          <div className="border px-6 py-6 text-sm text-gray-600">
            <form onSubmit={onSubmitReview} className="mb-6 pb-6 border-b flex flex-col gap-3 max-w-md">
              <p className="font-medium text-gray-800">Leave a review</p>
              <select
                value={reviewForm.rating}
                onChange={(e) => setReviewForm((p) => ({ ...p, rating: Number(e.target.value) }))}
                className="border border-gray-300 rounded py-2 px-3 w-full"
              >
                {[5,4,3,2,1].map((r) => <option key={r} value={r}>{r} star{r > 1 ? 's' : ''}</option>)}
              </select>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                placeholder="Share your experience with this product..."
                className="border border-gray-300 rounded py-2 px-3 w-full"
                rows={3}
              />
              <button disabled={submittingReview} className="bg-black text-white px-6 py-2 text-sm self-start disabled:opacity-50">
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>

            {reviews.length === 0 && <p className="text-gray-400">No reviews yet — be the first!</p>}
            {reviews.map((review) => (
              <div key={review._id} className="py-3 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{review.userName}</p>
                  {review.verifiedPurchase && <span className="text-xs text-green-600">Verified Purchase</span>}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map((star) => (
                    <img key={star} src={star <= review.rating ? assets.star_icon : assets.star_dull_icon} className="w-3" alt="" />
                  ))}
                </div>
                {review.comment && <p className="mt-1">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>


{/* Display Related Products */}
  <Relatedproducts category={productData.category} subCategory={productData.subCategory}/>
     </div>
  ) : <div className="opacity-0"></div>
};

export default Product;
