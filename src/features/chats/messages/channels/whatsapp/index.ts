import type { ChannelBodies } from '../channel-bodies'

/**
 * WhatsApp-specific message views. Empty today: every WhatsApp message
 * renders with the channel-agnostic views of `bodies/`. Add an entry here
 * only when WhatsApp must look different (and keep the common view as is).
 */
export const whatsappBodies: ChannelBodies = {}
