import { Schema, model } from 'mongoose'

const karigarSchema = new Schema({
  Name: String,
  Mob: String,
  CompName : String,
  Address: String,
  City: String,
  PinCode: String
})

const karigarModel = model('karigars', karigarSchema)

export default karigarModel
