import { NavLink } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Users,
  Users2,
  CalendarDays,
  Pill,
  User,
  Settings,
  BookMarked,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useLabIntake } from '../../queries/hooks';
import { SYSTEM_ROLE_LABELS, isSystemRole, type Permission } from '../../lib/permissions';
import { useRolePolicyStore } from '../../stores/rolePolicyStore';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  /** Permission the user needs to see this item in the sidebar. */
  requires?: Permission;
}

const primary: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users, requires: 'patient:read' },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays, requires: 'appointment:read' },
  { to: '/consultations', label: 'Consultations', icon: ClipboardList, requires: 'patient:read' },
  { to: '/inbox', label: 'Lab inbox', icon: Inbox, requires: 'report:read' },
  { to: '/medicines', label: 'Medicines', icon: Pill, requires: 'medicine:read' },
];

const secondary: NavItem[] = [
  { to: '/profile', label: 'Doctor profile', icon: User, requires: 'settings:manage' },
  { to: '/templates', label: 'Rx templates', icon: BookMarked, requires: 'template:read' },
  { to: '/team', label: 'Team', icon: Users2, requires: 'team:read' },
  { to: '/usage', label: 'AI usage', icon: Activity, requires: 'settings:manage' },
  { to: '/billing', label: 'Billing', icon: CreditCard, requires: 'settings:manage' },
  { to: '/settings', label: 'Settings', icon: Settings, requires: 'settings:manage' },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: intake = [] } = useLabIntake();
  const attention = intake.filter(
    (r) => r.status === 'needs_review' || r.status === 'unidentified'
  ).length;

  const role = user?.role;
  const has = useRolePolicyStore((s) => s.has);
  const rolesFromStore = useRolePolicyStore((s) => s.roles);
  const roleName =
    rolesFromStore.find((r) => r.id === role)?.name ??
    (role && isSystemRole(role) ? SYSTEM_ROLE_LABELS[role] : role ?? 'Guest');
  const visible = (items: NavItem[]) =>
    items.filter((it) => !it.requires || has(role, it.requires));

  const primaryWithBadges = visible(primary).map((it) =>
    it.to === '/inbox' && attention > 0
      ? { ...it, badge: String(attention) }
      : it
  );
  const secondaryVisible = visible(secondary);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 border-r border-line bg-surface transition-[width] duration-200',
        'sticky top-0 h-screen',
        collapsed ? 'w-[68px]' : 'w-[248px]'
      )}
    >
      <div
        className={cn(
          'h-16 border-b border-line flex items-center px-4',
          collapsed && 'justify-center px-0'
        )}
      >
        <BrandMark collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-5">
        <NavGroup label="Workspace" collapsed={collapsed}>
          {primaryWithBadges.map((it) => (
            <NavRow key={it.to} item={it} collapsed={collapsed} />
          ))}
        </NavGroup>
        {secondaryVisible.length > 0 && (
          <NavGroup label="Account" collapsed={collapsed}>
            {secondaryVisible.map((it) => (
              <NavRow key={it.to} item={it} collapsed={collapsed} />
            ))}
          </NavGroup>
        )}
      </nav>

      <div className="p-3 border-t border-line">
        <div
          className={cn(
            'rounded-lg px-2 py-2 flex items-center gap-2.5',
            collapsed && 'justify-center px-0'
          )}
        >
          <Avatar name={user?.name ?? 'Doctor'} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-[12.5px] font-semibold text-ink truncate">
                {user?.name ?? 'Doctor'}
              </div>
              <div className="text-[10.5px] text-ink-3 truncate inline-flex items-center gap-1.5">
                <Badge tone={role === 'admin' ? 'accent' : 'neutral'} variant="soft" uppercase>
                  {roleName}
                </Badge>
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => logout()}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="mt-2 w-full inline-flex items-center justify-center h-8 rounded-md text-ink-3 hover:text-ink hover:bg-bg-muted transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      {!collapsed && (
        <div className="text-[10px] font-bold uppercase tracking-[1.4px] text-ink-3 px-2 mb-1.5">
          {label}
        </div>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'group relative inline-flex items-center gap-3 rounded-md text-[13px] font-medium transition-colors',
          collapsed ? 'h-10 w-10 justify-center mx-auto' : 'px-2.5 h-9',
          isActive
            ? 'bg-accent-softer text-accent-ink font-semibold'
            : 'text-ink-2 hover:text-ink hover:bg-bg-muted'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-accent rounded-r" />
          )}
          <Icon
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2'
            )}
          />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && item.badge && (
            <span
              className={cn(
                'text-[9.5px] font-bold tracking-wider uppercase rounded-xs px-1.5 py-0.5',
                /^\d+$/.test(item.badge)
                  ? 'bg-danger text-white'
                  : 'bg-accent text-white'
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}
