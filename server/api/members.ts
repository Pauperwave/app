const members = [
  {
    name: 'Emanuele Nardi',
    username: 'emanuelenardi',
    role: 'owner',
    avatar: { src: '' }
  },
  {
    name: 'Marco Cazzola',
    username: 'marcocazzola',
    role: 'organizer',
    avatar: { src: '' }
  },
  {
    name: 'Nicola Cordeschi',
    username: 'ilFritto',
    role: 'organizer',
    avatar: { src: '' }
  },
  {
    name: 'Lorenzo Castelli',
    username: 'lorenzocastelli',
    role: 'judge',
    avatar: { src: '' }
  },
  {
    name: 'Pietro Bragioto',
    username: 'crila-peoty',
    role: 'writer',
    avatar: { src: '' }
  },
  {
    name: 'Paolo Donfrancesco',
    username: 'Walker735',
    role: 'writer',
    avatar: { src: '' }
  },
  {
    name: 'Alessandro Moretti',
    username: 'A_AdeptoTerra',
    role: 'writer',
    avatar: { src: '' }
  }
]

export default eventHandler(async () => {
  return members
})
