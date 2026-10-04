// app\utils\commanders\edhrecUrl.ts

// EDHREC's commander page slug is the front face's name, lowercased and stripped of punctuation
export function edhrecCommanderUrl(name: string): string {
  const frontFace = name.split(' // ')[0] ?? name
  return `https://edhrec.com/commanders/${slugify(frontFace)}`
}
