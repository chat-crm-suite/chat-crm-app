import { type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavGroup as NavGroupProps,
} from './types'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

function isNavCollapsible(item: NavItem): item is NavCollapsible {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return 'items' in item && Array.isArray((item as any).items)
}

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar()
  const href = useLocation({ select: (location) => location.href })

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const key = `${item.title}-${'url' in item ? item.url : 'collapsible'}`

          if (!isNavCollapsible(item)) {
            // `item` is a NavLink here
            return <SidebarMenuLink key={key} item={item} href={href} />
          }

          // `item` is a NavCollapsible here
          if (state === 'collapsed' && !isMobile) {
            return (
              <SidebarMenuCollapsedDropdown key={key} item={item} href={href} />
            )
          }

          return <SidebarMenuCollapsible key={key} item={item} href={href} />
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return <Badge className='rounded-full px-1 py-0 text-xs'>{children}</Badge>
}

function SidebarMenuLink({ item, href }: { item: NavLink; href: string }) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={item.title}
      >
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  const { setOpenMobile } = useSidebar()
  return (
    <Collapsible
      asChild
      defaultOpen={checkIsActive(href, item, true)}
      className='group/collapsible'
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <SidebarMenuSub>
            {item.items.map((subItem) => {
              const key = `${subItem.title}-${'url' in subItem ? subItem.url : 'collapsible'}`
              if (isNavCollapsible(subItem)) {
                // recursion: `subItem` is a NavCollapsible
                return (
                  <SidebarMenuCollapsible
                    key={key}
                    item={subItem}
                    href={href}
                  />
                )
              }

              return (
                <SidebarMenuSubItem key={key}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={checkIsActive(href, subItem)}
                  >
                    <Link to={subItem.url} onClick={() => setOpenMobile(false)}>
                      {subItem.icon && <subItem.icon />}
                      <span>{subItem.title}</span>
                      {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function SidebarMenuCollapsedDropdown({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={checkIsActive(href, item)}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4}>
          <DropdownMenuLabel>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((sub) => {
            const key = `${sub.title}-${'url' in sub ? sub.url : 'collapsible'}`
            if (isNavCollapsible(sub)) {
              // nested submenus render their title and their children
              return (
                <div key={key} className='px-2 py-1'>
                  <DropdownMenuLabel>{sub.title}</DropdownMenuLabel>
                  {sub.items.map((inner) => (
                    <DropdownMenuItem
                      key={`${inner.title}-${'url' in inner ? inner.url : 'collapsible'}`}
                      asChild
                    >
                      {/* inner debe ser NavLink aquí */}
                      <Link
                        to={inner.url}
                        className={`${checkIsActive(href, inner) ? 'bg-secondary' : ''}`}
                      >
                        {inner.icon && <inner.icon />}
                        <span className='max-w-52 text-wrap'>{inner.title}</span>
                        {inner.badge && (
                          <span className='ms-auto text-xs'>{inner.badge}</span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              )
            }

            return (
              <DropdownMenuItem key={key} asChild>
                <Link
                  to={sub.url}
                  className={`${checkIsActive(href, sub) ? 'bg-secondary' : ''}`}
                >
                  {sub.icon && <sub.icon />}
                  <span className='max-w-52 text-wrap'>{sub.title}</span>
                  {sub.badge && <span className='ms-auto text-xs'>{sub.badge}</span>}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function checkIsActive(href: string, item: NavItem, mainNav = false): boolean {
  const path = href.split('?')[0]
  const url = 'url' in item ? (item.url as string | undefined) : undefined

  // A link is active on its own page and on pages nested under it
  // (/settings/security keeps "Ajustes" lit); "/" only matches itself.
  const isOwnPage =
    !!url && (path === url || (url !== '/' && path.startsWith(`${url}/`)))

  return (
    isOwnPage ||
    (!!item?.items?.some((i) => checkIsActive(href, i))) ||
    (mainNav &&
      !!url &&
      href.split('/')[1] !== '' &&
      href.split('/')[1] === url.split('/')[1])
  )
}
