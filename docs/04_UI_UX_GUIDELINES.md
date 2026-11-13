# UI/UX Guidelines

## Direction
Create a distinctive TeamSync SaaS identity; use familiar productivity conventions without cloning another product.

## Themes
Support dark and light themes using semantic design tokens. Persist preference; consider system theme. Verify contrast in both.

## Navigation
Personal: My Dashboard, My Day, My Tasks, My Calendar (staged), My Inbox, My Profile.
Workspace: Projects, Boards, Members, Messages, Announcements (staged), Knowledge Base (staged), Analytics, Activity History.
System: Notifications, Search, Settings, Security.
Navigation visibility is UX only, never security enforcement.

## Screens
Auth; My Day; workspace switcher/overview; project list/detail; Kanban; task detail; team/members; chat; notifications; profile/settings.

## Components
Button, Input, Select, Textarea, Badge, Avatar, Card, Modal, Dropdown, Tabs, Tooltip, Toast, Skeleton, EmptyState, Sidebar, Header, WorkspaceSwitcher.

## Frontend component organization
These are design and organization guidelines, not a claim that the components or screens are already implemented:
- Put reusable primitives (for example Button, Input, Badge and Modal) in `components/ui/`.
- Put cross-feature components in `components/common/` and shared navigation/page structure such as Sidebar and Header in `components/layout/`.
- Keep feature-specific components beside their feature behavior under `features/<feature>/`; route-level compositions belong in `pages/`.
- Prefer semantic design tokens for color, surfaces, borders, typography and state so components do not encode theme-specific values independently.

The project uses Tailwind CSS v4 for utility styling, with shared styles/tokens maintained centrally rather than duplicated in feature components. The current app imports Tailwind and uses utility classes, but a semantic token system, reusable component library and themed screens have not yet been implemented.

## Interaction
Forms show validation; destructive actions require confirmation; drag-and-drop reconciles with server and rolls back on rejection; major screens have loading/empty/error/success states; keyboard focus is visible; don't rely on color alone; respect reduced motion.

## Accessibility/responsive
Semantic elements, accessible labels, focus management, sufficient contrast and keyboard operation. Core workflows must remain usable on desktop, tablet and mobile browser widths.
