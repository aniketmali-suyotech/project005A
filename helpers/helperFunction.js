import userModel from '../models/userModel.js'
import orderModel from '../models/orderModel.js'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt, { compare } from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { errorResponse } from './serverResponse.js'
import config from '../config.js'
import axios from 'axios'

//add super admin

export async function AddSuperAdmin () {
  const adminsstr = process.env.SUPERADMIN
  const admins = adminsstr.split(',')

  for (const email of admins) {
    const existingUser = await userModel.findOne({ email })

    if (!existingUser) {
      await userModel.create({
        firstname: 'admin',
        lastname: 'admin',
        email: email,
        mobile: '12345678',
        password: bcryptPassword('1234')
      })
    } else {
      console.log(`User already exists.`)
    }
  }
}

//get email otp
export async function getEmailOTP (email) {
  try {
    const apikey = config.APIKEY
    const emailerUrl = 'https://emailer.suyotech.com'
    const resp = await axios.post(emailerUrl, {
      apikey,
      email
    })
    return resp.data.otp
  } catch (error) {
    console.log('otp error', error)
    return null
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
    expiresIn: '1h'
  })
  const public_token = jwt.sign(refreshtokenPayload, secrectKey, {
    expiresIn: '1d'
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

// // days calculated for followup.................

export function getRemainingDaysCustomer (orders) {
  const currentDate = new Date()
  return orders.filter(order => {
    const parts = order.customer_delivery_date.split('-')
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)

    const deliveryDate = new Date(year, month, day)
    const differenceMs = deliveryDate - currentDate
    const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24))
    console.log('difference days ==', differenceDays)

    if (differenceDays <= 0) {
      return order.final_status === 'inprocess'
    }

    if (
      order.final_status === 'delivered' ||
      order.final_status === 'cancelled'
    ) {
      return false
    }

    return differenceDays < 2
  })
}

export function getRemainingDaysKarigar (orders) {
  const currentDate = new Date()

  return orders.filter(order => {
    const parts = order.karigar_delivery_date.split('-')
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)

    const deliveryDate = new Date(year, month, day)
    const differenceMs = deliveryDate - currentDate
    const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24))
    console.log('difference days ==', differenceDays)

    if (differenceDays <= 0) {
      return order.final_status === 'inprocess'
    }

    if (
      order.final_status === 'delivered' ||
      order.final_status === 'cancelled'
    ) {
      return false
    }
    return differenceDays < 2
  })
}

// // dashboard karigar followup............................

export function karigarfollowupfun (orders) {
  const currentDate = new Date()

  const filteredOrders = orders.filter(order => {
    const parts = order.karigar_delivery_date.split('-')
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)

    const deliveryDate = new Date(year, month, day)
    const differenceMs = deliveryDate - currentDate
    const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24))
    console.log('difference days ==', differenceDays)

    if (differenceDays <= 0) {
      return order.final_status === 'inprocess'
    }
    if (
      order.final_status === 'delivered' ||
      order.final_status === 'cancelled'
    ) {
      return false
    }
    return differenceDays < 2
  })

  return filteredOrders.length
}

// // dashboard customer followup.......................................
export function customerfollowupfun (orders) {
  const currentDate = new Date()
  const filteredOrders = orders.filter(order => {
    const parts = order.customer_delivery_date.split('-')
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)

    const deliveryDate = new Date(year, month, day)
    const differenceMs = deliveryDate - currentDate
    const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24))
    console.log('difference days ==', differenceDays)

    if (differenceDays <= 0) {
      return order.final_status === 'inprocess'
    }

    if (
      order.final_status === 'delivered' ||
      order.final_status === 'cancelled'
    ) {
      return false
    }
    return differenceDays < 2
  })

  return filteredOrders.length
}
