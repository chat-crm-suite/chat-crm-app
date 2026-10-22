## 2.3.0 (2026-10-22)

### Feat

- ✨ carousel cards in template picker, preview and thread
- ✨ template message view and header media upload
- ✨ notifications phase 2: open chat reads its own notices
- ✨ notifications v2: one toast layer, synced bell, OS notices
- ✨ channel down notice with retry and settings link
- ✨ inbox v2 unified chat UI, tasks and templates
- ✨ dev proxy to the API over the compose network + single endpoints module
- ✨ pending WhatsApp channel screen, connection test and null bodies
- ✨ auto-commit the contracts lock after contracts:pull

### Fix

- 🔒 whatsapp settings admin-only
- 🐛 wait for the API instead of the 500 page when it does not answer

## 2.0.0-b0 (2025-11-16)

## 0.1.0 (2025-11-15)

## 1.0.0 (2025-11-16)

## 0.1.0 (2025-11-15)

## 1.0.0 (2025-11-15)

## 1.0.0-beta (2025-11-15)

### Feat

- :sparkles: Add analysis sentiment in real time for indicator view in chat
- :ambulance: Fix attributes forms
- :sparkles: Add status in user column for table view
- :sparkles: Add sentiment indicator and mobile support
- :lipstick: Change the top contacto for best agents card
- :sparkles: Add filter sentiment metrics for datetime (year, month, week, day)
- :lipstick: Add superbase theme for theme.css
- :lipstick: Drop innecesary components in dashboard view
- Add sentiment metrics and fix kpis cards
- :sparkles: Add notification mask as read update query data
- :construction: Add provisional notification system
- :sparkles: Add badge for status view
- :sparkles: Add button to assigned user
- :sparkles: Add chat id in message dto
- :sparkles: Add support for view error toast for handler error message
- :sparkles: Add bidireccional response in chat
- :sparkles: Add send messages to whatsapp
- :sparkles: Add error handler support in socket provider
- :construction: WIP socket implementation and new chat componente support
- :sparkles: Add initial new chat component
- :building_construction: Add socket provider for bidirectional chat in the app
- :construction: Adding chat functionality
- :sparkles: Add users dialogs for modals
- :sparkles: Add create/edit user form
- :sparkles: Add user's table data
- :sparkles: Add table contact dialogs actions funcionality
- :zap: Add locale variable stage for contact table
- :lipstick: Add more styles and using new componentes (button copy and input and end on)
- :lipstick: Add button copy and input and add components
- :sparkles: Add contacts table
- :sparkles: Add integration to command menu and refactor general sidebar for layout
- :sparkles: Add whatsapp config
- :sparkles: Add integrations in sidebar and recursive items mapping
- :sparkles: Add login form for admin auth validation and handle error with store hook
- :sparkles: Add RTL support in sidebar component
- :boom: Add Shadcn Admin template
- :sparkles: Add columns definitions and fix minors
- :sparkles: Add libraries and config for data table and nuqs
- :sparkles: Add data-table hooks
- :lipstick: Add table-data components from Dice UI
- :lipstick: Add ui components for shadcn
- :sparkles: Add phone number input and input seach loader
- :construction: Add contact dialog for create contact
- :construction: Add provisional contact view table
- :sparkles: Add pagination for table
- :sparkles: Add table components
- :sparkles: Add services for table
- :wrench: Add configuration for dayjs locale and format code syntax
- :sparkles: Add lib files for table view client
- :sparkles: Add react-table, dayjs and libphonenumberjs
- :sparkles: Add testing button for whatsapp api config
- :sparkles: Add react quey (tanstack query) and fix select undefined error and minors
- :lipstick: Add form to setting integration whatsapp
- :sparkles: Add whatsapp business api setting
- :sparkles: Add businessId to claims
- :sparkles: Add sonner component
- :sparkles: Add mobile view
- :sparkles: Add wrapper for setting and refactor dialog component
- :sparkles: Add config modal dialog for settings
- :poop: Add basic send and recive messages in chat component
- :see_no_evil: Add backend path and socket path
- :sparkles: Add toast notification to login
- :sparkles: Add context for routes
- :sparkles: Add validation in login and dashboard routes
- :poop: Add protected routes
- :poop: Add protected routes
- :sparkles: Login and Forgot password form
- :sparkles: Add socker hook
- :sparkles: Add send chats funcionality in chat card component
- :lipstick: Add useT in chat and implemented types
- :building_construction: Add i18n provider
- :globe_with_meridians: Add language config and i18n library
- :lipstick: Add chat component + route
- :sparkles: Add login (components and route)
- :lipstick: Add provider for theme mode (dark, light, system)
- :lipstick: Add dark mode and component needed

### Fix

- :bug: Fix key accessors to columns definitions for tables (users, contacts)
- :bug: Add close option to send template message in chat
- :bug: Fix order messages in chat
- :recycle: Reorder providers for socket
- :bug: Fix tags definition and uuid optional attribute
- :bug: Change name to username attribute on contact schema
- :bug: Change 'phone' name for 'phoneNumber'
- :lipstick: Fix with for showSubmittedData function helper
- :bug: Fix styles in input password component
- :lipstick: Fix route and sidebar menu in integrations view
- :rotating_light: Fix types in NavCollapsible
- :bug: Fix TRC direction in scroll area and fix order imports
- :fire: Drop login form file
- :ambulance: Add startTransition for render sorting options in table
- :bug: Fix sintaxis error
- :bug: Fix duplicate mensajes sended
- :bug: Fix route index for redirect
- :bug: Fix rename path
- :bug: Fix import rename path
- :bug: A problem with contacts
- :bug: Fix route __root for parent redirection in routes children

### Refactor

- :loud_sound: Drop notifications logs for console.log
- :lipstick: Change color for sentiment categories in metrics
- :loud_sound: Drop log in analysis sentiment metrics
- :bulb: Commented the badge notifications in chat sidebar view
- :bulb: Commented icons code for future implementation
- :recycle: Refactor service, table, hook, types, route and fix import order
- :truck: rename columns contact file and rename header from table
- :truck: Rename api config globals
