// @ts-nocheck
import React, { useContext, useEffect, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import { MdOutlineArrowDropDown } from "react-icons/md";
import {assets} from "../frontend_assets/assets"
import Title from "../components/Title";
import ProductItem from "../components/ProductItem";
import useSEO from "../hooks/useSEO";

const Collection = () =>
{
  useSEO({
    title: 'Shop All Products | Store',
    description: 'Browse our full collection of shoes and clothing for men, women, and kids.',
  })

  const { products,search,showSearch } = useContext( ShopContext )
  const [ showFilter, setShowFilter ] = useState( false )
  const [ filterProducts, setFilterProducts ] = useState( [] )
  const [ category, setCategory ] = useState( [] )
  const [ subCategory, setSubCategory ] = useState( [] )
  const [ sortType,setSortType ] = useState('relevant')

  const toggleCategory = (e) => {
    if (category.includes(e.target.value)) {
      setCategory(prev => prev.filter(item => item !== e.target.value))
    } else
    {
      setCategory(prev => [...prev,e.target.value])
    }
  }
  const toggleSubCategory = (e) => {
    if (subCategory.includes(e.target.value)) {
      setSubCategory(prev => prev.filter(item => item !== e.target.value))
    } else
    {
      setSubCategory(prev => [...prev,e.target.value])
    }
  }

  const applyFilter = () =>
  {
    let productsCopy = products.slice() //create a copy ofthe product array

    if (showSearch && search) {
      productsCopy = productsCopy.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
    }


if (category.length > 0) {
  productsCopy = productsCopy.filter(item => category.includes(item.category))
    }
    if (subCategory.length > 0) {
  productsCopy = productsCopy.filter(item => subCategory.includes(item.subCategory))
}
setFilterProducts(productsCopy)
  }

  const sortProduct = () =>
  {
    let filterProductsCopy = filterProducts.slice()

    switch (sortType) {
      case 'low-high':
            setFilterProducts(filterProductsCopy.sort((a,b) => (a.price - b.price)))
        
        break;
      case 'high-low':
            setFilterProducts(filterProductsCopy.sort((a,b) => (b.price - a.price)))
        
        break;
      
    
      default:
        applyFilter();
        break;
    }
  }
  
    useEffect( () =>
  {
    applyFilter(products)
  },[category,subCategory,search,showSearch,products])
  
    useEffect( () =>
  {
    sortProduct()
  },[sortType])
  
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-10 pt-10 border-t">
          {/* Filter options */}
      <div className="min-w-60">
        <p onClick={()=> setShowFilter(!showFilter)} className="my-2 text-xl flex items-center cursor-pointer gap-2">FILTERS
        <img src={assets.dropdown_icon} alt="dropdown" className={ `h-3 sm:hidden ${showFilter ? 'rotate-90 ':'sm:hidden'}`} />
          {/* <MdOutlineArrowDropDown className={`h-3 sm:hidden ${ showFilter ? 'rotate-180 ' : 'sm:hidden' }`} /> */}
          </p>
        {/* Category Filter */}
        <div className={`border border-gray-300 pl-5 py-3 mt-6 ${ showFilter ? '' : 'hidden' } sm:block`}>
          <p className="mb-3 text-sm font-medium ">CATEGORIES</p>
          <div className="flex flex-col gap-2 text-sm font-light text-gray-700">
            <p className="flex gap-2">
              <input type="checkbox" className="w-3 bg-blue-300" value={'Men'} 
              onChange={toggleCategory} /> Men
            </p>
            <p className="flex gap-2">
              <input type="checkbox" className="w-3 bg-blue-300" value={'Women'} 
              onChange={toggleCategory} /> Women
            </p>
            <p className="flex gap-2">
              <input type="checkbox" className="w-3 bg-blue-300" value={'Kids'}
              onChange={toggleCategory} /> Kids
            </p>
            </div>
        </div>
        {/* Sub Category  Filter */}
        <div className={`border border-gray-300 pl-5 py-3 my-5 ${ showFilter ? '' : 'hidden' } sm:block`}>
          <p className="mb-3 text-sm font-medium ">TYPE</p>
          <div className="flex flex-col gap-2 text-sm font-light text-gray-700">
            <p className="flex gap-2">
              <input type="checkbox" className="w-3 bg-blue-300" value={'Topwear'} onChange={toggleSubCategory} /> Topwear
            </p>
            <p className="flex gap-2">
              <input type="checkbox" className="w-3 bg-blue-300" value={'Bottomwear'} onChange={toggleSubCategory} />  Bottomwear
            </p>
            <p className="flex gap-2">
              <input type="checkbox" className="w-3 bg-blue-300" value={'Winterwear'} onChange={toggleSubCategory} /> Winterwear
            </p>
            </div>
        </div>
      </div>
      {/* Right Side */}
      <div className="flex-1">
        <div className="flex justify-between text-base sm:text-2xl mb-4">
          <Title text1={'ALL'} text2={'COLLECTIONS'} />
          {/* Product sort */}
          <select onChange={(e)=> setSortType(e.target.value)} className="border border-gray-300 text-sm px-2">
            <option value="relevant">Sort by: Relevant</option>
            <option value="low-hign">Sort by: Low to High</option>
            <option value="high-low">Sort by: High to Low</option>
          </select>
        </div>

        {/* Map Products */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
          {filterProducts.map( (item,index) =>
          {
             return <ProductItem key={index} id={item._id} name={item.name} image={item.image} price={item.price} />
           })}
        </div>
      </div>
    </div>
  )
};

export default Collection;
