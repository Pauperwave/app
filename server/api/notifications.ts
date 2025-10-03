import { sub } from 'date-fns'

const notifications = [{
  id: 1,
  unread: true,
  sender: {
    name: 'Jordan Brown',
    email: 'jordan.brown@example.com',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=2'
    }
  },
  body: 'sent you a message',
  date: sub(new Date(), { minutes: 7 }).toISOString()
}, {
  id: 2,
  sender: {
    name: 'Lindsay Walton'
  },
  body: 'subscribed to your email list',
  date: sub(new Date(), { hours: 1 }).toISOString()
}, {
  id: 3,
  unread: true,
  sender: {
    name: 'Taylor Green',
    email: 'taylor.green@example.com',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=3'
    }
  },
  body: 'sent you a message',
  date: sub(new Date(), { hours: 3 }).toISOString()
}, {
  id: 4,
  sender: {
    name: 'Courtney Henry',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=4'
    }
  },
  body: 'added you to a project',
  date: sub(new Date(), { hours: 3 }).toISOString()
}, {
  id: 5,
  sender: {
    name: 'Tom Cook',
    avatar: {
      src: 'https://i.pravatar.cc/128?u=5'
    }
  },
  body: 'abandonned cart',
  date: sub(new Date(), { hours: 7 }).toISOString()
}]

export default eventHandler(async () => {
  return notifications
})
