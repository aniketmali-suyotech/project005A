import { Schema, model } from 'mongoose'

const orderSchema = new Schema({
  CustomerId: String,
  OrderNumber: {
    type: String,
    unique: true
  },
  OrderDate: String,
  Purity: String,
  Weight: String,
  Size: String,
  ProductId: String,
  Specification: String,
  Quantity: String,
  karigarid: {
    type: String,
    default: ''
  },
  karigar_delivery_date: {
    type: String,
    default: ''
  },
  customer_delivery_date: {
    type: String,
    default: ''
  },
  order_created_date: {
    type: String,
    default: ''
  },
  karigar_status: {
    type: String,
    default: ''
  },
  customer_status: {
    type: String,
    default: ''
  },
  final_status: {
    type: String,
    default: ''
  },
  images: [
    {
      type: String,
      required: true
    }
  ]
})

const orderModel = model('orders', orderSchema)
export default orderModel
