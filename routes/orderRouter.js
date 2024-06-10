import { Router } from 'express'
import { successResponse, errorResponse } from '../helpers/serverResponse.js'
import orderModel from '../models/orderModel.js'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { GetOrderNumber } from '../helpers/helperFunction.js'

const orderRouter = Router()

orderRouter.get('/', getAllOrdersHandler)
orderRouter.post('/create', addOrderHandler)
orderRouter.post('/asign/:id', asignkarigarHandler)
orderRouter.post('/delete/:id', deleteOrderHandler)
orderRouter.post('/update/:id', updateOrderHandler)

export default orderRouter

// //get all client
// async function getclientHandler(req, res) {
//   try {
//       const { pageno, sortby } = req.body;

//       const pageNo = parseInt(pageno) || 0;
//       const sortBy = Object.keys(sortby).length === 0 ? { _id: -1 } : sortby;

//       const limit = 100;
//       const skip = pageNo * limit;
//       const data = await userModel
//           .find({ role: "user" })
//           .select({ __v: 0, password: 0, tokenotp: 0 })
//           .sort(sortBy)
//           .skip(skip)
//           .limit(limit);

//       if (!data || data.length === 0) {
//           errorResponse(res, 400, "data not found");
//           return;
//       }
//       successResponse(res, "success", data);
//   } catch (error) {
//       console.log(error);
//       errorResponse(res, 500, "internal server error");
//   }
// }

async function getAllOrdersHandler (req, res) {
  try {
    const orders = await orderModel.aggregate([
      {
        $lookup: {
          from: 'karigars',
          localField: 'order_id',
          foreignField: 'karigarid',
          as: 'karigars'
        }
      },
      {
        $unwind: '$karigars'
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'order_id',
          foreignField: 'karigarid',
          as: 'customers'
        }
      },
      {
        $unwind: '$customers'
      },
      {
        $group: {
          _id: '$OrderNumber',
          data: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$data' }
      },
      {
        $project: {
          _id: 1,
          karigarid: {
            $cond: {
              if: { $eq: ['$karigarid', ''] }, // Check if karigarid is empty
              then: '',
              else: '$karigars.Name'
            }
          },
          CustomerId: '$customers.Name',
          OrderNumber: '$OrderNumber',
          OrderDate: 1,
          Purity: 1,
          Weight: 1,
          Size: 1,
          ProductId: 1,
          Specification: 1,
          Quantity: 1,
          karigar_delivery_date: 1,
          customer_delivery_date: 1,
          order_created_date: 1,
          karigar_status: 1,
          customer_status: 1,
          final_status: 1,
          images: 1
        }
      }
    ])

    const { customer_status, karigar_status, final_status } = req.query
    console.log('request query===', req.query)

    if (customer_status) {
      const filteredOrders = orders.filter(
        c => c.customer_status === customer_status
      )
      return successResponse(res, 'success', filteredOrders)
    }

    if (karigar_status) {
      const filteredOrders = orders.filter(
        c => c.karigar_status === karigar_status
      )
      return successResponse(res, 'success', filteredOrders)
    }

    if (final_status) {
      const filteredOrders = orders.filter(c => c.final_status === final_status)
      return successResponse(res, 'success', filteredOrders)
    }

    successResponse(res, 'success', orders)
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
          CustomerId,
          OrderDate,
          Purity,
          Weight,
          Size,
          ProductId,
          Specification,
          Quantity
        } = req.body

        try {
          const OrderNumber = await GetOrderNumber()
          const data = await orderModel.create({
            OrderNumber,
            CustomerId,
            OrderDate,
            Purity,
            Weight,
            Size,
            ProductId,
            Specification,
            Quantity,
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
      !updateData.karigarid ||
      !updateData.karigar_delivery_date ||
      !updateData.customer_delivery_date ||
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
      !updateData.CustomerId ||
      !updateData.OrderNumber ||
      !updateData.OrderDate ||
      !updateData.Purity ||
      !updateData.Weight ||
      !updateData.Size ||
      !updateData.ProductId ||
      !updateData.Specification ||
      !updateData.Quantity ||
      !updateData.karigarid ||
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

async function karigarfollowup (req, res) {
  try {
    const data = await orderModel.find({})
    if (!data) {
      errorResponse(res, 500, 'orders not found at karigarfollowup')
      return
    }
    successResponse(res, 'success', data)
  } catch (error) {
    console.log(error)
    errorResponse(res, 500, 'internal error')
  }
}
