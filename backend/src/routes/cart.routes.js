import express from 'express';
import { addToCart, getUserCart, updateCart } from '../controllers/cart.controller.js';
import authUser from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { addToCartValidator, updateCartValidator } from '../validators/cart.validators.js';

// NOTE: the original file had a stray `c` character after the route
// definitions (likely a leftover keystroke), which is a JavaScript syntax
// error that would crash the whole server on import. Removed.
const cartRouter = express.Router();

cartRouter.post('/add', authUser, addToCartValidator, validate, addToCart);
cartRouter.put('/update', authUser, updateCartValidator, validate, updateCart);
cartRouter.post('/get', authUser, getUserCart);

export default cartRouter;
