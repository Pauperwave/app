// test\unit\composables\tournaments\useTournamentRealtimeChannel.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref, type Ref } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useTournamentRealtimeChannel } from '~/composables/tournaments/useTournamentRealtimeChannel'

describe('useTournamentRealtimeChannel', () => {
  const removeChannel = vi.fn()
  const subscribe = vi.fn()
  const channelFactory = vi.fn()

  beforeEach(() => {
    removeChannel.mockClear()
    subscribe.mockClear()
    channelFactory.mockClear()

    // Each created channel is its own object so removal can be asserted per channel
    channelFactory.mockImplementation((name: string) => ({ name, subscribe: () => {
      subscribe(name)
      return { name }
    } }))
    vi.stubGlobal('useSupabaseClient', () => ({ channel: channelFactory, removeChannel }))
  })

  function mountWith(uuid: ReturnType<typeof ref<string>>, clientOnly = false) {
    const listen = vi.fn((channel: unknown) => channel as RealtimeChannel)
    const wrapper = mount(defineComponent({
      setup() {
        useTournamentRealtimeChannel(uuid as Ref<string>, id => `t-${id}`, listen, { clientOnly })
        return () => null
      }
    }))
    return { wrapper, listen }
  }

  it('subscribes right away to a channel named after the tournament', () => {
    const { listen } = mountWith(ref('a'))

    expect(channelFactory).toHaveBeenCalledWith('t-a')
    expect(listen).toHaveBeenCalledWith(expect.objectContaining({ name: 't-a' }), 'a')
    expect(subscribe).toHaveBeenCalledWith('t-a')
  })

  it('skips an empty tournament uuid', () => {
    mountWith(ref(''))

    expect(channelFactory).not.toHaveBeenCalled()
  })

  it('swaps the channel when the tournament changes', async () => {
    const uuid = ref('a')
    mountWith(uuid)

    uuid.value = 'b'
    await nextTick()

    expect(removeChannel).toHaveBeenCalledWith({ name: 't-a' })
    expect(subscribe).toHaveBeenLastCalledWith('t-b')
  })

  it('removes the channel on unmount', () => {
    const { wrapper } = mountWith(ref('a'))

    wrapper.unmount()

    expect(removeChannel).toHaveBeenCalledWith({ name: 't-a' })
  })

  it('still subscribes after mount when client only', () => {
    mountWith(ref('a'), true)

    expect(subscribe).toHaveBeenCalledWith('t-a')
  })
})
