require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const app = express()
const Person = require('./models/person')

app.use(express.json())
app.use(express.static('build'))
app.use(cors())

morgan.token('body', (req, res) => JSON.stringify(req.body))

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body', {
  skip: (req, res) => req.method !== 'POST'
}))

app.use(morgan('tiny', {
  skip: (req, res) => req.method === 'POST'
}))

app.get('/api/persons', (req, res, next) => {
  Person.find({})
    .then(persons => {
      res.json(persons)
    })
    .catch(error => next(error))
})

app.get('/info', (req, res, next) => {
  Person.find({})
    .then(persons => {
      res.send(
        `
        <p>Phonebook has info for ${persons.length} people</p>
        <p>${new Date().toString()}</p>
        `
      )
    })
    .catch(error => next(error))
})

app.get('/api/persons/:id', (req, res, next) => {
  Person.findById(req.params.id)
    .then(person => {
      if (person) {
        res.json(person)
      } else {
        res.status(404).end()
      }
    })
    .catch(error => next(error))
})

app.delete('/api/persons/:id', (req, res, next) => {
  Person.findByIdAndRemove(req.params.id)
    .then(result => {
      res.status(204).end()
    })
    .catch(error => next(error))
})

app.post('/api/persons', (req, res, next) => {
  const body = req.body

  if (!body.name || !body.number) {
    return res.status(400).json({
      error: 'name or number missing'
    })
  }

  Person.find({ name: body.name })
    .then(foundPersons => {
      if (foundPersons.length) {
        return res.status(400).json({
          error: 'the name already exists'
        })
      } else {
        const person = new Person({
          name: body.name,
          number: body.number,
        })

        person.save()
          .then(savedPerson => {
            res.json(savedPerson)
          })
          .catch(error => next(error))
      }
    })
    .catch(error => next(error))
})

app.put('/api/persons/:id', (req, res, next) => {
  const { name, number } = req.body

  Person.findByIdAndUpdate(
    req.params.id,
    { name, number },
    { new: true, runValidators: true, context: 'query' }
  )
    .then(updatedPerson => {
      if (updatedPerson) {
        res.json(updatedPerson)
      } else {
        res.status(404).send({ error: 'person not found, probably already deleted by someone else' })
      }
    })
    .catch(error => next(error))
})

const generateId = () => {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
}

const errorHandler = (error, req, res, next) => {
  console.log(error.message)

  if (error.name === 'CastError') {
    return res.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message })
  }

  next(error)
}

app.use(errorHandler)

const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
