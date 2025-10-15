import { faker } from '@faker-js/faker'

const associateTypes: Associate['associate_type'][] = ['ordinario', 'sostenitore']

const italianProvinces = [
  'AG', 'AL', 'AN', 'AO', 'AR', 'AP', 'AT', 'AV', 'BA', 'BT', 'BL', 'BN', 'BG', 'BI', 'BO', 'BZ', 'BS', 'BR', 'CA', 'CL', 'CB', 'CI', 'CE', 'CT', 'CZ', 'CH', 'CO', 'CS', 'CR', 'KR', 'CN', 'EN', 'FM', 'FE', 'FI', 'FG', 'FC', 'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'SP', 'AQ', 'LT', 'LE', 'LC', 'LI', 'LO', 'LU', 'MC', 'MN', 'MS', 'MT', 'ME', 'MI', 'MO', 'MB', 'NA', 'NO', 'NU', 'OR', 'PD', 'PA', 'PR', 'PV', 'PG', 'PS', 'PE', 'PC', 'PN', 'PZ', 'PO', 'RG', 'RA', 'RC', 'RE', 'RI', 'RN', 'RM', 'RO', 'SA', 'SS', 'SV', 'SI', 'SR', 'SO', 'TA', 'TE', 'TR', 'TO', 'TP', 'TN', 'TV', 'TS', 'UD', 'VA', 'VE', 'VB', 'VC', 'VR', 'VV', 'VI'
]

const pauperwaveNumbers = Array.from({ length: 35 }, (_, i) =>
  `PW-${i.toString().padStart(4, '0')}`)

const italianPrefixes = [
  '320', '324', '327', '328', '329',
  '330', '331', '333', '334', '335', '336', '337', '338', '339',
  '340', '341', '342', '343', '345', '346', '347', '348', '349'
]

const associates: Associate[] = Array.from({ length: 250 }, (_, i) => ({
  id: i + 1,
  uuid: faker.string.uuid(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  request_date: faker.date.past().toISOString(),
  status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
  association_date: faker.datatype.boolean() ? faker.date.past().toISOString() : null,
  pauperwave_associate_number:
  faker.datatype.boolean() && i < pauperwaveNumbers.length
    ? pauperwaveNumbers[i] ?? null
    : null,
  consent_data: true,
  consent_social: faker.datatype.boolean(),
  has_read_statute: true,
  has_acknowledged_surveillance_notice: true,
  associate_type: faker.helpers.arrayElement(associateTypes),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  tax_code: faker.datatype.boolean() ? faker.string.alphanumeric(16) : null,
  phone_number: `+39 ${faker.helpers.arrayElement(italianPrefixes)} ${faker.string.numeric(7)}`,
  email_address: faker.internet.email(),
  born_date: faker.date
    .birthdate({ min: 1970, max: 2007, mode: 'year' })
    .toLocaleDateString('it-IT'),
  born_location: `${faker.location.city()}, ${faker.location.country()}`,
  born_province: faker.helpers.arrayElement(italianProvinces),
  born_state: 'Italia',
  residency_address: faker.location.streetAddress(),
  residency_house_number: faker.string.alphanumeric(3).toUpperCase(),
  residency_city: faker.location.city(),
  residency_province: faker.helpers.arrayElement(italianProvinces),
  residency_cap: faker.location.zipCode(),
  mtgo_nickname: faker.internet.username(),
  mtga_nickname: faker.internet.username()
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

    const newAssociate: Associate = {
      id,
      uuid: faker.string.uuid(),
      ...body
    }

    associates.push(newAssociate)
    return newAssociate
  }

  return associates
})
