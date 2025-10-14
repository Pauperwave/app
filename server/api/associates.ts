import type { User } from '~/types'
import { faker } from '@faker-js/faker'

// Define the User type with all properties from the comments
interface Associate {
  id: number
  uuid: string
  request_date: string
  association_date: string | null
  pauperwave_associate_number: string | null
  consent_data: boolean
  consent_social: boolean
  has_read_statute: boolean
  has_acknowledged_surveillance_notice: boolean
  associate_type: 'ordinario' | 'sostenitore'
  tax_code: string | null
  name: string
  surname: string
  email: string
  phone_number: string
  born_location: string
  born_date: string
  born_province: string
  born_state: string
  residency_address: string
  residency_city: string
  residency_province: string
  residency_cap: string
  mtgo_nickname: string
  mtga_nickname: string
}

const associateTypes: Associate['associate_type'][] = ['ordinario', 'sostenitore']

const associates: Associate[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  uuid: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  request_date: faker.date.past().toISOString(),
  association_date: faker.datatype.boolean() ? faker.date.past().toISOString() : null,
  pauperwave_associate_number: faker.datatype.boolean() ? faker.string.numeric(6) : null,
  consent_data: faker.datatype.boolean(),
  consent_social: faker.datatype.boolean(),
  has_read_statute: faker.datatype.boolean(),
  has_acknowledged_surveillance_notice: faker.datatype.boolean(),
  associate_type: faker.helpers.arrayElement(associateTypes),
  tax_code: faker.datatype.boolean() ? faker.string.alphanumeric(16) : null,
  name: faker.person.firstName(),
  surname: faker.person.lastName(),
  email: faker.internet.email(),
  phone_number: faker.phone.number(),
  born_location: `${faker.location.city()}, ${faker.location.country()}`,
  born_date: faker.date.birthdate({ min: 1970, max: 2007, mode: 'year' }).toISOString().slice(0, 10),
  born_province: faker.location.stateAbbr(),
  born_state: faker.location.country(),
  residency_address: faker.location.streetAddress(),
  residency_city: faker.location.city(),
  residency_province: faker.location.stateAbbr(),
  residency_cap: faker.location.zipCode(),
  mtgo_nickname: faker.internet.userName(),
  mtga_nickname: faker.internet.userName()
}))

export default eventHandler(async (event) => {
  if (event.req.method === 'POST') {
    const body = await readBody(event)
    // Basic validation
    if (!body || !body.name || !body.email || !body.phone_number) {
      sendError(event, createError({ statusCode: 400, statusMessage: 'Missing required fields' }))
      return
    }

    const id = associates.length ? Math.max(...associates.map(a => a.id)) + 1 : 1
    const uuid = body.uuid ?? `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`

    const newAssociate: Associate = {
      id,
      uuid,
      ...body
    }

    associates.push(newAssociate)
    return newAssociate
  }

  return associates
})
