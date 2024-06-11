import userModel from '../models/userModel.js'
import orderModel from '../models/orderModel.js'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt, { compare } from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { errorResponse } from './serverResponse.js'

//add super admin

export async function AddSuperAdmin () {
  const email = process.env.SUPERADMIN

  // Check if super admin with provided email already exists
  const existingSuperAdmin = await userModel.findOne({ email })

  if (!existingSuperAdmin) {
    // Create super admin if it doesn't exist
    await userModel.create({
      firstname: 'admin',
      lastname: 'admin',
      email: email,
      mobile: '90876545',
      password: bcryptPassword('1234')
    })
    console.log('Super admin created successfully.')
  } else {
    // console.log('Super admin already exists. Skipped creation.')
  }
}

//TOKEN GENERATION...............
const secrectKey = crypto.randomBytes(48).toString('hex')
export function generateAccessToken (id, email, role) {
  const sessionid = createSession(id)
  const accesstokenPayload = {
    id,
    email,
    role
  }
  const refreshtokenPayload = {
    id,
    email,
    role,
    sessionid
  }
  const encoded_token = jwt.sign(accesstokenPayload, secrectKey, {
    expiresIn: '5m'
  })
  const public_token = jwt.sign(refreshtokenPayload, secrectKey, {
    expiresIn: '1h'
  })
  return { encoded_token, public_token }
}

//validate token
export function validatetoken (token) {
  try {
    return jwt.verify(token, secrectKey)
  } catch (error) {
    throw error
  }
}

//hash pass
export function bcryptPassword (password) {
  return bcrypt.hashSync(password, 10)
}

//compare pass
export function comparePassword (password, hashedpassword) {
  return bcrypt.compareSync(password, hashedpassword)
}

//sessions
let sessions = new Map()
/**
 *
 * @param {Object} data
 * @returns
 */
export function createSession (id) {
  const sessionId = uuidv4()
  sessions.set(id, sessionId)
  return sessionId
}

export function getSessionData (id) {
  return sessions.has(id) ? sessions.get(id) : null
}

export function deleteSession (id) {
  return sessions.has(id) ? sessions.delete(id) : false
}

export async function GetOrderNumber () {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const prefix = `${year}${month}`

  // Find the highest serial number for the current month
  const lastOrder = await orderModel
    .findOne({
      OrderNumber: new RegExp(`^${prefix}`)
    })
    .sort({ OrderNumber: -1 })
    .exec()

  let serialNumber = '0001'
  if (lastOrder) {
    const lastSerial = parseInt(lastOrder.OrderNumber.slice(-4), 10)
    serialNumber = String(lastSerial + 1).padStart(4, '0')
  }

  return `${prefix}${serialNumber}`
}

// auth middleware
/**
 *
 * @param {import("express").Request} req
 * @param {Response} res
 * @param {import("express").Nextexport function} next
 */
export function authMiddleware (req, res, next) {
  const authHeader =
    req.headers.Authorization || req.headers.authorization || req.query.token

  if (!authHeader) {
    errorResponse(res, 401, 'token not found')
    return
  }
  const encoded_token = authHeader.split(' ')[1]

  if (!encoded_token) return res.status(401).json('Unauthorize user')

  try {
    const decoded = jwt.verify(encoded_token, secrectKey)

    if (!decoded.role || !decoded.email) {
      console.log('NOt authorized')
      return res.status(401).json('Unauthorize user')
    }

    res.locals['id'] = decoded.id
    res.locals['role'] = decoded.role
    res.locals['email'] = decoded.email
    next()
  } catch (error) {
    console.log(error.message)
    errorResponse(res, 401, 'user not authorized')
  }
}

//Remaining days calculating.....

function getRemainingDays (customerDeliveryDate) {
  const deliveryDate = new Date(customerDeliveryDate)
  const currentDate = new Date()
  const differenceMs = deliveryDate - currentDate
  const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24))
  return differenceDays
}

// Function to filter orders based on remaining days

/**
 *
 * @param {*} data
 * @param {*} remainingDays
 * @returns
 */
export function filterOrdersByRemainingDays (orders, remainingDays) {
  return orders.filter(
    order => getRemainingDays(order.customer_delivery_date) <= remainingDays
  )
}
