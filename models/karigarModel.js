import { Schema, Types, model } from 'mongoose'

const karigarSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'orders'
  },
  Name: String,
  Mob: String,
  Address: String,
  City: String,
  PinCode: String
})

const karigarModel = model('karigars', karigarSchema)

export default karigarModel
