import { type LinkProps } from '@tanstack/react-router'

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: NavItem[]
  url?: LinkProps['to'] | (string & {})
}

type NavItem = NavLink | NavCollapsible

type NavGroup = {
  title: string
  items: NavItem[]
}

export type { NavGroup, NavItem, NavCollapsible, NavLink }
