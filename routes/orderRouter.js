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
orderRouter.get('/cfollowup', customerfollowup)
orderRouter.get('/kfollowup', karigarfollowup)
orderRouter.get('/status', getstatus)
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
      errorResponse(res, 400, 'Data not found')
      return
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
      filename: async (req, file, cb) => {
        const OrderNumber = await GetOrderNumber()
        const order = OrderNumber
        const id = Math.floor(Math.random() * 900000) + 1000
        const ext = path.extname(file.originalname)
        cb(null, order + `__` + id + ext)
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

    // // //customer followup filter date...............
    const data1 = await orderModel.find({})
    function getRemainingDays (customer_delivery_date) {
      const parts = customer_delivery_date.split('-')
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)

      const deliveryDate = new Date(year, month, day)
      const currentDate = new Date()
      const differenceMs = deliveryDate - currentDate
      const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24))

      if (differenceDays > 0) {
        return differenceDays
      } else {
        return 'Delivery date has already passed'
      }
    }

    function filterOrdersByRemainingDays (orders, remainingDays) {
      const value = orders.filter(
        order => getRemainingDays(order.customer_delivery_date) <= remainingDays
      )
      return value.length
    }
    const customerfollowup = filterOrdersByRemainingDays(data1, 1)

    // // //karigar_followup filter date...............
    function getRemainingDays2 (karigar_delivery_date) {
      const parts = karigar_delivery_date.split('-')
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)

      const deliveryDate = new Date(year, month, day)
      const currentDate = new Date()
      const differenceMs = deliveryDate - currentDate
      const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24))

      if (differenceDays > 0) {
        return differenceDays
      } else {
        return 'Delivery date has already passed'
      }
    }

    function filterOrdersByRemainingDays2 (orders, remainingDays) {
      const value = orders.filter(
        order => getRemainingDays2(order.karigar_delivery_date) <= remainingDays
      )
      return value.length
    }
    const karigarfollowup = filterOrdersByRemainingDays2(data1, 1)

    const data = {
      newOrder,
      inProcess,
      completed,
      delivered,
      client,
      karigar,
      customerfollowup,
      karigarfollowup
    }

    successResponse(res, 'date get successfully', data)
  } catch (error) {
    console.log('error', error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function getstatus (req, res) {
  try {
    const data = {
      final_status: [
        'new-order',
        'inprocess',
        'completed',
        'delivered',
        'canceled'
      ],
      karigar_status: ['inprocess', 'completed', 'delivered'],
      customer_status: ['inprocess', 'completed', 'delivered']
    }
    successResponse(res, 'data get Successfully', data)
  } catch (error) {
    errorResponse(res, 500, 'internal server error')
  }
}

// //  customerFollowup..............................................................

async function customerfollowup (req, res) {
  try {
    const data1 = await orderModel.find({})
    function getRemainingDays (customer_delivery_date) {
      const parts = customer_delivery_date.split('-')
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)

      const deliveryDate = new Date(year, month, day)
      const currentDate = new Date()
      const differenceMs = deliveryDate - currentDate
      const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24))
      console.log('days difference ', differenceDays)
      if (differenceDays >= 0) {
        return differenceDays
      } else {
        return 'Delivery date has already passed'
      }
    }

    function filterOrdersByRemainingDays (orders, remainingDays) {
      const value = orders.filter(
        order => getRemainingDays(order.customer_delivery_date) <= remainingDays
      )
      return value
    }
    const customerfollowup = filterOrdersByRemainingDays(data1, 1)
    if (!customerfollowup) {
      errorResponse(res, 400, 'Data not found')
      return
    }
    successResponse(res, 'data get Successfully', customerfollowup)
  } catch (error) {
    errorResponse(res, 500, 'internal server error')
  }
}

// // // karigar Followup............................................................

async function karigarfollowup (req, res) {
  try {
    const data1 = await orderModel.find({})
    function getRemainingDays (karigar_delivery_date) {
      const parts = karigar_delivery_date.split('-')
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)

      const deliveryDate = new Date(year, month, day)
      const currentDate = new Date()
      const differenceMs = deliveryDate - currentDate
      const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24))

      if (differenceDays >= 0) {
        return differenceDays
      } else {
        return 'Delivery date has already passed'
      }
    }

    function filterOrdersByRemainingDays (orders, remainingDays) {
      const value = orders.filter(
        order => getRemainingDays(order.karigar_delivery_date) <= remainingDays
      )
      return value
    }
    const customerfollowup = filterOrdersByRemainingDays(data1, 1)
    if (!customerfollowup) {
      errorResponse(res, 400, 'Data not found')
      return
    }
    successResponse(res, 'data get Successfully', customerfollowup)
  } catch (error) {
    errorResponse(res, 500, 'internal server error')
  }
}
