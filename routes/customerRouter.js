import { Router } from 'express'
import { successResponse, errorResponse } from '../helpers/serverResponse.js'
import customerModel from '../models/customerModel.js'

const customerRouter = Router()

customerRouter.get('/:id?', getAllClientsHandler)
customerRouter.post('/create', addClientHandler)
customerRouter.post('/delete/:id', deleteClientHandler)
customerRouter.post('/update/:id', updateClientHandler)

export default customerRouter

async function getAllClientsHandler (req, res) {
  try {
    const { id } = req.params
    if (id) {
      const customer = await customerModel.findById(id)

      if (!customer) {
        return errorResponse(res, 404, 'Customer not found')
      }
      return successResponse(res, 'success', customer)
    } else {
      const data = await customerModel.find({})
      return successResponse(res, 'success', data)
    }
  } catch (error) {
    console.error('Error:', error)
    return errorResponse(res, 500, 'Internal server error')
  }
}

async function addClientHandler (req, res) {
  try {
    const { Name, Mob, Address, City, PinCode } = req.body
    if ((!Name, !Mob, !Address, !City, !PinCode)) {
      const message = 'addclient - some params missing'
      errorResponse(res, 400, message)
      return
    }
    const params = { Name, Mob, Address, City, PinCode }
    await customerModel.create(params)
    successResponse(res, 'success added', params)
  } catch (error) {
    console.log('error', error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function updateClientHandler (req, res) {
  try {
    const { id } = req.params
    const updateddata = req.body
    const options = { new: true }
    if (
      !updateddata.Name ||
      !updateddata.Mob ||
      !updateddata.Address ||
      !updateddata.City ||
      !updateddata.PinCode
    ) {
      errorResponse(res, 500, 'params missing at updated data')
      return
    }
    const data = await customerModel.findByIdAndUpdate(id, updateddata, options)
    successResponse(res, 'success updated', data)
  } catch (error) {
    console.log(error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function deleteClientHandler (req, res) {
  const { id } = req.params
  const data = await customerModel.findByIdAndDelete(id)
  if (!data) {
    errorResponse(res, 500, 'internal server error')
    return
  }
  successResponse(res, 'Deleted Successfully', data)
}
