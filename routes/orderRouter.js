import { Router } from 'express'
import { successResponse, errorResponse } from '../helpers/serverResponse.js'
import orderModel from '../models/orderModel.js'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { GetOrderNumber } from '../helpers/helperFunction.js'
import customerModel from '../models/customerModel.js'
import karigarModel from '../models/karigarModel.js'

const orderRouter = Router()
orderRouter.get('/dash', getDashData)
orderRouter.post('/', getAllOrdersHandler)
orderRouter.post('/create', addOrderHandler)
orderRouter.post('/asign/:id', asignkarigarHandler)
orderRouter.post('/delete/:id', deleteOrderHandler)
orderRouter.post('/update/:id', updateOrderHandler)

export default orderRouter

async function getAllOrdersHandler (req, res) {
  try {
    const { pageno, sortby, filterby = {}, search = '' } = req.body
    const pageNo = parseInt(pageno) || 0

    const limit = 100
    const skip = pageNo * limit

    let query = {}

    if (filterby.final_status) {
      query.final_status = filterby.final_status
    }

    if (filterby.customer_status) {
      query.customer_status = filterby.customer_status
    }

    if (filterby.karigar_status) {
      query.karigar_status = filterby.karigar_status
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { OrderNumber: { $regex: searchRegex } },
        { karigarName: { $regex: searchRegex } },
        { CustomerName: { $regex: searchRegex } }
      ]
    }
    const sortBy =
      sortby && typeof sortby === 'object' && Object.keys(sortby).length === 0
        ? { OrderNumber: 1 }
        : sortby

    const data = await orderModel
      .find(query)
      .select({ __v: 0, password: 0, tokenotp: 0 })
      .sort(sortBy)
      .skip(skip)
      .limit(limit)

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Data not found' })
    }

    successResponse(res, 'success', data)
  } catch (error) {
    console.log('error', error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function addOrderHandler (req, res) {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const filePath = './uploads'
        if (!fs.existsSync(filePath)) {
          fs.mkdirSync(filePath)
        }
        cb(null, filePath)
      },
      filename: (req, file, cb) => {
        const id = Math.floor(Math.random() * 900000) + 100000
        const ext = path.extname(file.originalname)
        cb(null, id + ext)
      },
      fileFilter: (req, file, callback) => {
        const ext = path.extname(file.originalname)
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
          return callback(
            new Error('Only .png, .jpg and .jpeg format allowed!')
          )
        }
        callback(null, true)
      }
    })
  }).array('images', 5)

  upload(req, res, async err => {
    if (err) {
      console.log('Error during file upload:', err)
      errorResponse(res, 400, 'Error during file upload')
    } else {
      if (req.files && req.files.length > 0) {
        // console.log(req.files)
        const images = req.files.map(file => `/assets/${file.filename}`)

        console.log('images==', images)
        const {
          CustomerName,
          OrderDate,
          Purity,
          Weight,
          Size,
          ProductName,
          Specification,
          Quantity,
          customer_delivery_date
        } = req.body

        try {
          const OrderNumber = await GetOrderNumber()
          const data = await orderModel.create({
            OrderNumber,
            CustomerName,
            OrderDate,
            Purity,
            Weight,
            Size,
            ProductName,
            Specification,
            Quantity,
            customer_delivery_date,
            images
          })

          successResponse(res, 'Order added successfully', data)
        } catch (error) {
          console.error(error)
          errorResponse(res, 500, 'Error while adding order')
        }
      } else {
        errorResponse(res, 400, 'No files uploaded')
      }
    }
  })
}

async function asignkarigarHandler (req, res) {
  try {
    const { id } = req.params
    const updateData = req.body
    const options = { new: true }
    if (
      !updateData.karigarName ||
      !updateData.karigar_delivery_date ||
      !updateData.order_created_date ||
      !updateData.karigar_status ||
      !updateData.customer_status ||
      !updateData.final_status
    ) {
      errorResponse(res, 500, 'params missing at asign karigar')
      return
    }
    const updateddata = await orderModel.findByIdAndUpdate(
      id,
      updateData,
      options
    )
    successResponse(res, 'success updated', updateddata)
  } catch (error) {
    console.log(error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function updateOrderHandler (req, res) {
  try {
    const { id } = req.params
    const updateData = req.body
    const options = { new: true }
    if (
      !updateData.CustomerName ||
      !updateData.OrderNumber ||
      !updateData.OrderDate ||
      !updateData.Purity ||
      !updateData.Weight ||
      !updateData.Size ||
      !updateData.ProductName ||
      !updateData.Specification ||
      !updateData.Quantity ||
      !updateData.karigarName ||
      !updateData.karigar_delivery_date ||
      !updateData.customer_delivery_date ||
      !updateData.order_created_date ||
      !updateData.karigar_status ||
      !updateData.customer_status ||
      !updateData.final_status
    ) {
      errorResponse(res, 500, 'params missing at updated data')
      return
    }
    const updateddata = await orderModel.findByIdAndUpdate(
      id,
      updateData,
      options
    )
    successResponse(res, 'success updated', updateddata)
  } catch (error) {
    console.log(error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function deleteOrderHandler (req, res) {
  const { id } = req.params
  const data = await orderModel.findByIdAndDelete(id)
  if (!data) {
    errorResponse(res, 500, 'internal server error')
    return
  }
  successResponse(res, 'Deleted Successfully', data)
}

async function getDashData (req, res) {
  try {
    const newOrder = await orderModel
      .find({ final_status: 'new-order' })
      .count()
    const inProcess = await orderModel
      .find({ final_status: 'inprocess' })
      .count()
    const completed = await orderModel
      .find({ final_status: 'completed' })
      .count()
    const delivered = await orderModel
      .find({ final_status: 'delivered' })
      .count()
    const client = await customerModel.find().count()
    const karigar = await karigarModel.find().count()

    let orders = await orderModel.find({})

    const customerfollowupdata = (orders, remainingDays) => {
      const currentDate = new Date()
      return orders.filter(order => {
        const deliveryDate = new Date(order.customerDeliveryDate)
        const differenceMs = deliveryDate - currentDate
        const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24))
        return differenceDays <= remainingDays
      })
    }

    const data = {
      newOrder,
      inProcess,
      completed,
      delivered,
      client,
      karigar,
      customerfollowupdata
    }

    res.json(data)
  } catch (error) {
    console.log('error', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
