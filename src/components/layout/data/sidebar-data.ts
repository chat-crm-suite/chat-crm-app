import {
  LayoutDashboard,
  ListTodo,
  Settings,
  UserCog,
  Users,
  MessagesSquare,
  Plug,
  MessageSquare,
  NotebookTabs,
  House,
} from 'lucide-react'

import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Chat CRM',
    email: 'soporte@chat-crm',
    avatar: '',
  },
  teams: [
    {
      name: 'Chat CRM',
      logo: House,
      plan: 'CRM',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Tasks',
          url: '/tasks',
          icon: ListTodo,
        },
        {
          title: 'Contacts',
          url: '/contacts',
          icon: NotebookTabs,
        },
        {
          title: 'Chats',
          url: '/chats',
          // badge: '3', // TODO: This is for chat notifications
          icon: MessagesSquare,
        },
        {
          title: 'Users',
          url: '/users',
          icon: Users,
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Integrations',
              icon: Plug,
              items: [
                {
                  title: 'WhatsApp',
                  url: '/settings/integrations/whatsapp',
                  icon: MessageSquare,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
