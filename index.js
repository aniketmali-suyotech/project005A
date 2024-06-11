import express from 'express'
import cors from 'cors'
import config from './config.js'
import morgan from 'morgan'
import dbConnect from './db.js'
import orderRouter from './routes/orderRouter.js'
import customerRouter from './routes/customerRouter.js'
import karigarRouter from './routes/karigarRouter.js'
import productRouter from './routes/productRouter.js'
import userRouter from './routes/userRouter.js'
import authRouter from './routes/authRouter.js'
import { AddSuperAdmin, authMiddleware } from './helpers/helperFunction.js'
import path from 'path'


const app = express()
const port = config.PORT

//middleware
app.use(express.json())
app.use(cors())
app.use(morgan('dev'))

//routers
app.use('/assets/', express.static(path.join('.', 'uploads')));

app.use('/api/orders', orderRouter)
app.use('/api/clients', customerRouter)
app.use('/api/karigars', karigarRouter)
app.use('/api/products', productRouter)
app.use('/api/users', authMiddleware,  userRouter)
app.use('/api/auth', authRouter)

//not found
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'not found'
  })
})

//server start
dbConnect()
  .then(() => {
    app.listen(port, () => {
      AddSuperAdmin()
      console.log(`server is listening at ${port}`)
    })
  })
  .catch(error => {
    console.log('Error Connecting Server ', error)
  })
