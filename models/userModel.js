import { Schema, model } from 'mongoose'

const userSchema = new Schema({
  firstname: String,
  lastname: String,
  role: {
    type: String,
    default: 'user'
  },
  email: String,
  mobile: String,
  password: String,
  tokenotp: {
    type: Number,
    default: 0
  },
  __v: {
    type: Number,
    select: false
  }
})

const userModel = model('users', userSchema)

export default userModel
