import { Router } from 'express'
import { successResponse, errorResponse } from '../helpers/serverResponse.js'
import orderModel from '../models/orderModel.js'
import multer from 'multer'
import fs, { readFileSync } from 'fs'
import path from 'path'
import { GetOrderNumber } from '../helpers/helperFunction.js'
import customerModel from '../models/customerModel.js'
import karigarModel from '../models/karigarModel.js'
import {
  karigarfollowupfun,
  customerfollowupfun,
  getRemainingDaysCustomer,
  getRemainingDaysKarigar
} from '../helpers/helperFunction.js'
import util from 'util'
import { createPdf } from '../helpers/createPdf.js'

const orderRouter = Router()
orderRouter.get('/pdf/:orderId/:type', getallpdfHandler)
orderRouter.get('/send/:id/:type', sendPDF)
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

// // Get all order...........................
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
        ? { OrderNumber: -1 }
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

//  // add order.............................

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
        try {
          const images = req.files.map(file => `/assets/${file.filename}`)
          const {
            customerId,
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

          if (
            (!customerId,
            !CustomerName,
            !OrderDate,
            !Purity,
            !Weight,
            !Size,
            !ProductName,
            !Specification,
            !Quantity,
            !customer_delivery_date,
            !images)
          ) {
            const message = 'addorder - some params missing'
            errorResponse(res, 400, message)
            return
          }
          const OrderNumber = await GetOrderNumber()
          const data = await orderModel.create({
            OrderNumber,
            customerId,
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

// // asign karigar.................................

async function asignkarigarHandler (req, res) {
  try {
    const { id } = req.params
    const updateData = req.body
    const options = { new: true }
    if (
      !updateData.karigarId ||
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

// // update order............................

async function updateOrderHandler (req, res) {
  try {
    const { id } = req.params
    const updateData = req.body
    const options = { new: true }
    if (
      !updateData.customerId ||
      !updateData.karigarId ||
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
  try {
    const { id } = req.params
    const order = await orderModel.findById(id)
    const images = order.images

    images.forEach(async filename => {
      const filenameWithoutPath = filename.replace('/assets/', '')
      const filePath = path.join('./uploads', filenameWithoutPath)
      try {
        await fs.promises.unlink(filePath)
        console.log('Deleted file:', filePath)
      } catch (error) {
        console.error('Error deleting file:', error)
      }
    })

    const data = await orderModel.findByIdAndDelete(id)
    if (!data) {
      errorResponse(res, 500, 'Internal server error')
      return
    }
    successResponse(res, 'Deleted Successfully', data)
  } catch (error) {
    console.error('Error deleting order:', error)
    errorResponse(res, 500, 'Internal server error')
  }
}

// // dashboard data............................

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

    const customerfollowup = customerfollowupfun(data1)
    const karigarfollowup = karigarfollowupfun(data1)

    const recentlyAdded = await orderModel
      .find({})
      .sort({ OrderNumber: -1 })
      .limit(10)
    const orders = await orderModel.find({})
    const data5 = getRemainingDaysCustomer(orders)
    const data6 = getRemainingDaysKarigar(orders)
    const followup = [...data5, ...data6].slice(0, 10)
    const data = {
      newOrder,
      inProcess,
      completed,
      delivered,
      client,
      karigar,
      customerfollowup,
      karigarfollowup,
      recentlyAdded,
      followup
    }

    successResponse(res, 'date get successfully', data)
  } catch (error) {
    console.log('error', error)
    errorResponse(res, 500, 'internal server error')
  }
}

// // get status .........

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
    const orders = await orderModel.find({})
    const filteredOrders = getRemainingDaysCustomer(orders)
    if (!filteredOrders) {
      errorResponse(res, 400, 'Data not found')
      return
    }
    successResponse(res, 'data get Successfully', filteredOrders)
  } catch (error) {
    errorResponse(res, 500, 'internal server error')
  }
}

// // // karigar Followup............................................................

async function karigarfollowup (req, res) {
  try {
    const orders = await orderModel.find({})
    const filteredOrders = getRemainingDaysKarigar(orders)
    if (!filteredOrders) {
      errorResponse(res, 400, 'Data not found')
      return
    }
    successResponse(res, 'data get Successfully', filteredOrders)
  } catch (error) {
    errorResponse(res, 500, 'internal server error')
  }
}

// // sending requests.........................
async function sendPDF (req, res) {
  try {
    const { id, type } = req.params
    const order = await orderModel.findById(id)
    if (!order) {
      return errorResponse(res, 404, 'order not found')
    }

    if ( type == 'karigar' && order.karigarName == 'not set') {
      return errorResponse(res, 404, 'karigar not set')
    }

    const data = {
      orderId: order.OrderNumber,
      customerName:
        type === 'customer' ? order.CustomerName : order.karigarName,
      orderDate: order.OrderDate,
      productName: order.ProductName,
      deliveryDate: order.customer_delivery_date,
      purity: order.Purity.toString(),
      weight: order.Weight.toString(),
      size: order.Size,
      quantity: order.Quantity.toString(),
      specification: order.Specification
    }

    // Process order.images to get an array of file paths
    const filePathArray = await Promise.all(
      order.images.map(async filename => {
        const filenameWithoutPath = filename.replace('/assets/', '')
        const filePath = path.join('./uploads', filenameWithoutPath)
        return filePath
      })
    )

    const constantImages = filePathArray.map(filePath => {
      // Determine file type based on file extension
      const fileExtension = path.extname(filePath).toLowerCase()
      let fileType = 'png' // Default to png if extension is not recognized

      if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
        fileType = 'jpg'
      } else if (fileExtension === '.png') {
        fileType = 'png'
      }

      return {
        path: filePath,
        type: fileType
      }
    })

    const pdfPath = await createPdf(data, constantImages, type)
     
    // console.log("pdf path=====", pdfPath)
    //.....................................
    const pdfBytes = fs.readFileSync(pdfPath);

    // Convert PDF to base64 encoded string
    const pdfBase64 = pdfBytes.toString('base64');

    // Remove the PDF file after reading if needed (optional)
    //fs.unlinkSync(pdfPath); 
    // Respond with the base64 encoded PDF
    successResponse(res, 'PDF generated successfully', { pdfBase64 });

  } catch (error) {
    console.error('Error:', error)
    return errorResponse(res, 500, 'Internal server error')
  }
}

// get ids of folder

async function getallpdfHandler (req, res) {
  try {
    const { orderId, type } = req.params
    const testFolder = './pdf/'

    if (!orderId || !type) {
      return errorResponse(res, 400, 'Missing orderId or type parameter')
    }

    const filename = `./pdf/${orderId}-${type}.pdf`

    res.sendfile(filename)
  } catch (error) {
    console.log(error)
    errorResponse(res, 500, 'Internal server error')
  }
}
