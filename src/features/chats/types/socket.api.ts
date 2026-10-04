// SOCKET
export const ChatSocketEvents = {
    join: 'chat:join',
    broadcast: 'chat:message:broadcast',
    error: 'chat:message:error',
    sendMessage: 'chat:message:send',
    sentimentIndicator: 'chat:sentiment:update',
    assigned: 'chat:assigned',
    unassigned: 'chat:unassigned'
} as const;

export type ChatSocketEvents = typeof ChatSocketEvents[keyof typeof ChatSocketEvents];
