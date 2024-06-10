import { Schema, model } from 'mongoose'

const productSchema = new Schema({
  Name: String,
})

const productModel = model('products', productSchema)

export default productModel