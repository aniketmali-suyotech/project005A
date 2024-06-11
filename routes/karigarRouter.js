import { Router } from 'express'
import { successResponse, errorResponse } from '../helpers/serverResponse.js'
import karigarModel from '../models/karigarModel.js'

const karigarRouter = Router()

karigarRouter.get('/getall', getAllKarigarHandler)
karigarRouter.post('/create', addKarigarHandler)
karigarRouter.post('/delete/:id', deletekarigarHandler)
karigarRouter.post('/update/:id', updateKarigarHandler)

export default karigarRouter

async function getAllKarigarHandler (req, res) {
  try {
    const data = await karigarModel.find({})
    successResponse(res, 'success', data)
  } catch (error) {
    console.log('error', error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function addKarigarHandler (req, res) {
  try {
    const { Name, Mob, CompName, Address, City, PinCode } = req.body

    if ((!Name, !Mob, !CompName, !Address, !City, !PinCode)) {
      const message = 'addorder - some params missing'
      errorResponse(res, 400, message)
      return
    }
    const params = { Name, Mob, CompName, Address, City, PinCode }
    await karigarModel.create(params)
    successResponse(res, 'success added', params)
  } catch (error) {
    console.log('error', error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function updateKarigarHandler (req, res) {
  try {
    const { id } = req.params
    const updateddata = req.body
    const options = { new: true }
    if (
      !updateddata.Name ||
      !updateddata.Mob ||
      !updateddata.CompName ||
      !updateddata.Address ||
      !updateddata.City ||
      !updateddata.PinCode
    ) {
      errorResponse(res, 500, 'params missing at updated data')
      return
    }
    const data = await karigarModel.findByIdAndUpdate(id, updateddata, options)
    successResponse(res, 'success updated', data)
  } catch (error) {
    console.log(error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function deletekarigarHandler (req, res) {
  const { id } = req.params

  const data = await karigarModel.findByIdAndDelete(id)
  if (!data) {
    errorResponse(res, 500, 'internal server error')
    return
  }
  successResponse(res, 'Deleted Successfully', data)
}
