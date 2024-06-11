import { Schema, model } from 'mongoose'

const clientSchema = new Schema({
  Name: String,
  Mob: String,
  Address: String,
  City: String,
  PinCode: String
})

const customerModel = model('customer', clientSchema)

export default customerModel
