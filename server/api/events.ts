const events = [
  { id: 1, date: '2025-09-02', league: 'Magman Autunno 2025', name: 'Commander', status: 'Completed' },
  { id: 2, date: '2025-09-12', league: 'Magman Autunno 2025', name: 'Commander Party', status: 'Completed' },
  { id: 3, date: '2025-09-16', league: 'Magman Autunno 2025', name: 'Commander', status: 'Completed' },
  { id: 4, date: '2025-10-07', league: 'Magman Autunno 2025', name: 'Commander Precon', status: 'Scheduled' },
  { id: 5, date: '2025-10-17', league: 'Magman Autunno 2025', name: 'Commander', status: 'Scheduled' },
  { id: 6, date: '2025-10-17', league: 'Magman Autunno 2025', name: 'Commander Party', status: 'Scheduled' },
  { id: 7, date: '2025-10-21', league: 'Magman Autunno 2025', name: 'Commander', status: 'Scheduled' },
  { id: 8, date: '2025-04-11', league: 'Magman Autunno 2025', name: 'Commander Precon', status: 'Scheduled' },
  { id: 9, date: '2025-04-14', league: 'Magman Autunno 2025', name: 'Commander Party', status: 'Scheduled' },
  { id: 10, date: '2025-04-18', league: 'Magman Autunno 2025', name: 'Commander', status: 'Scheduled' },
  { id: 11, date: '2025-12-02', league: 'Magman Autunno 2025', name: 'Commander', status: 'Scheduled' }
]

export default defineEventHandler(async () => {
  return events
})
