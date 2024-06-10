import { Router } from 'express'
import { successResponse, errorResponse } from '../helpers/serverResponse.js'
import productModel from '../models/productModel.js'

const productRouter = Router()

productRouter.get('/getall', getAllproductHandler)
productRouter.post('/create', addproductHandler)
productRouter.post('/delete/:id', deleteproductHandler)
productRouter.post('/update/:id', updateproductHandler)

export default productRouter

async function getAllproductHandler (req, res) {
  try {
    const data = await productModel.find({})
    successResponse(res, 'success', data)
  } catch (error) {
    console.log('error', error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function addproductHandler (req, res) {
  try {
    const { Name } = req.body
    if (!Name) {
      const message = 'addproducts - some params missing'
      errorResponse(res, 400, message)
      return
    }
    const params = { Name }
    await productModel.create(params)
    successResponse(res, 'success added', params)
  } catch (error) {
    console.log('error', error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function updateproductHandler (req, res) {
  try {
    const { id } = req.params
    const updateddata = req.body
    const options = { new: true }
    if (!updateddata.Name) {
      errorResponse(res, 500, 'params missing at updated data')
      return
    }
    const data = await productModel.findByIdAndUpdate(id, updateddata, options)
    successResponse(res, 'success updated', data)
  } catch (error) {
    console.log(error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function deleteproductHandler (req, res) {
  const { id } = req.params
  const data = await productModel.findByIdAndDelete(id)
  if (!data) {
    errorResponse(res, 500, 'internal server error')
    return
  }
  successResponse(res, 'Deleted Successfully', data)
}
