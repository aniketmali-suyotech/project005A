import { Schema, model } from 'mongoose'

const orderSchema = new Schema({
  CustomerName: String,
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
  karigarName: {
    type: String,
    default: 'not set'
  },
  karigar_delivery_date: {
    type: String,
    default: 'not set'
  },
  customer_delivery_date: {
    type: String,
    default: 'not set'
  },
  order_created_date: {
    type: String,
    default: 'not set'
  },
  karigar_status: {
    type: String,
    default: 'not set'
  },
  customer_status: {
    type: String,
    default: 'not set'
  },
  final_status: {
    type: String,
    default: 'new-order'
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
