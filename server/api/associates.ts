import type { User } from '~/types'

const associates: User[] = [{
  id: 1,
  name: 'Marco',
  surname: 'Cazzola',
  email: 'marco.cazzola@pauperwave.com',
  avatar: {
    src: 'https://i.pravatar.cc/128?u=1'
  },
  status: 'subscribed',
  location: 'New York, USA',
  born_location: 'Rome, Italy'
}, {
  id: 2,
  name: 'Jordan',
  surname: 'Brown',
  email: 'jordan.brown@example.com',
  avatar: {
    src: 'https://i.pravatar.cc/128?u=2'
  },
  status: 'unsubscribed',
  location: 'London, UK'
}, {
  id: 3,
  name: 'Taylor',
  surname: 'Green',
  email: 'taylor.green@example.com',
  avatar: {
    src: 'https://i.pravatar.cc/128?u=3'
  },
  status: 'bounced',
  location: 'Paris, France'
}, {
  id: 4,
  name: 'Marco',
  surname: 'Cazzola',
  email: 'marco.cazzola@pauperwave.com',
  avatar: {
    src: 'https://i.pravatar.cc/128?u=4'
  },
  status: 'subscribed',
  location: 'New York, USA'
}]

// uuid: '00000000-0000-4000-8000-000000000004',
// request_date: new Date().toISOString(),
// association_date: null,
// pauperwave_associate_number: null,
// consent_data: true,
// consent_social: false,
// has_read_statute: true,
// has_acknowledged_surveillance_notice: true,
// associate_type: 'regular',
// tax_code: null,
// phone_number: '+1-555-123-4567',
// born_location: 'Rome, Italy',
// born_date: '1985-06-15',
// born_province: 'RM',
// born_state: 'Italy',
// residency_address: '123 Main St',
// residency_city: 'New York',
// residency_province: 'NY',
// residency_cap: '10001',
// mtgo_nickname: '',
// mtga_nickname: '',

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

    const newAssociate: User = {
      id,
      uuid,
      ...body,
      avatar: body.avatar ?? (body.avatarSrc ? { src: body.avatarSrc } : undefined)
    }

    associates.push(newAssociate)
    return newAssociate
  }

  return associates
})
