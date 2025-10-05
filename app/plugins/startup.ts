import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  // This plugin runs on app startup
  // You can add initialization logic here

  // Example: Log when the app starts
  nuxtApp.hook('app:mounted', () => {
    console.log('App is running')
  })
})
