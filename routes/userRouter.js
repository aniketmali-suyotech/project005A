import { Router } from 'express'
import { successResponse, errorResponse } from '../helpers/serverResponse.js'
import userModel from '../models/userModel.js'

const userRouter = Router()

userRouter.get('/getall', getAllusersHandler)
userRouter.post('/create', adduserHandler)
userRouter.post('/delete/:id', deleteuserHandler)
userRouter.post('/update/:id', updateuserHandler)

export default userRouter

async function getAllusersHandler (req, res) {
  try {
    const data = await userModel.find({})
    successResponse(res, 'success', data)
  } catch (error) {
    console.log('error', error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function adduserHandler (req, res) {
  try {
    const { firstname, lastname, role, email, mobile, password } = req.body
    if ((!firstname, !lastname, !role, !email, !mobile, !password)) {
      const message = 'adduser - some params missing'
      errorResponse(res, 400, message)
      return
    }
    const params = { firstname, lastname, role, email, mobile, password }
    await userModel.create(params)
    successResponse(res, 'success added', params)
  } catch (error) {
    console.log('error', error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function updateuserHandler (req, res) {
  try {
    const { id } = req.params
    const updateddata = req.body
    const options = { new: true }
    if (
      !updateddata.firstname ||
      !updateddata.lastname ||
      !updateddata.email ||
      !updateddata.mobile ||
      !updateddata.password
    ) {
      errorResponse(res, 500, 'params missing at updated data')
      return
    }
    const data = await userModel.findByIdAndUpdate(id, updateddata, options)
    successResponse(res, 'success updated', data)
  } catch (error) {
    console.log(error)
    errorResponse(res, 500, 'internal server error')
  }
}

async function deleteuserHandler (req, res) {
  const { id } = req.params
  const data = await userModel.findByIdAndDelete(id)
  if (!data) {
    errorResponse(res, 500, 'internal server error')
    return
  }
  successResponse(res, 'Deleted Successfully', data)
}
