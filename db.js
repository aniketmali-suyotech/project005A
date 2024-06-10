import mongoose from 'mongoose'
import config from './config.js'

async function dbConnect () {
  try {
    await mongoose.connect(config.MONGO_URL)
    console.log('Database Connected successfully')
  } catch (error) {
    console.log('Unable to connect database', error)
  }
}

export default dbConnect
