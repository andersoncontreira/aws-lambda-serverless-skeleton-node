const packageConfig = require('../package')
require('dotenv').config()

if (typeof (process.env.ROOT_PATH) === 'undefined') {
  process.env.ROOT_PATH = '/demo'
}

if (typeof (process.env.REGION) === 'undefined') {
  process.env.REGION = 'sa-east-1'
}

if (typeof (process.env.PORT) === 'undefined') {
  process.env.PORT = 3000
}

if (typeof (process.env.ARCH_VERSION) === 'undefined') {
  process.env.ARCH_VERSION = 'v1'
}

if (typeof (process.env.VERSION) === 'undefined') {
  process.env.VERSION = packageConfig.version
}

// if (typeof (process.env.DYNAMODB_TABLE) === 'undefined') {
//   process.env.DYNAMODB_TABLE = 'demo-table'
// }

const bodyParser = require('body-parser')
const express = require('express')
const serverlessExpress = require('aws-serverless-express')
const corsMiddleware = require('./http/middlewares/cors-middleware')
const customHeadersMiddleware = require('./http/middlewares/custom-headers-middleware')
const defaultRoutes = require('./http/routes/default-routes')
const personRoutes = require('./http/routes/v1/person-routes')
const router = new express.Router()

const logRequest = (req, res, next) => {
  console.log('request: ' + req.path)
  next()
}

const clientErrorHandler = (request, response, next) => {
  response.status(404).send({ error: `Route ${request.path} not found` })
}

// TODO To remove, this only for demonstration
const createSomeSampleData = require('./../samples/demo-temp-data')

exports.execute = (event, context, callback) => {
  console.log('event', event)

  // TODO To remove, this only for demonstration
  createSomeSampleData()

  const app = express()

  // Express Middleware
  app.use(express.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  // Custom middleware
  // Register the request URI
  app.use(logRequest)

  // CORS filter
  app.use(corsMiddleware.filter)
  // Add Headers
  app.use(customHeadersMiddleware.apply)

  // Routes
  app.use(defaultRoutes.map(router))
  app.use(personRoutes.map(router))

  // Print the routes
  defaultRoutes.printRoutes(router)

  // Error handler
  app.get('*', clientErrorHandler)

  // lambda check
  const isInLambda = !!process.env.LAMBDA_TASK_ROOT
  if (isInLambda) {
    const binaryMimeTypes = [
      'image/*',
      'image/jpeg',
      'image/png',
      'image/svg+xml'
    ]

    const server = serverlessExpress.createServer(app, null, binaryMimeTypes)
    serverlessExpress.proxy(server, event, context)
  } else {
    app.listen(process.env.PORT, () => console.log(`Listening on ${process.env.PORT}`))
  }
}
