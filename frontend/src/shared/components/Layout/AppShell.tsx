import { useState } from 'react';
import { useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Avatar,
  Menu,
  UnstyledButton,
  rem,
} from '@mantine/core';
import {
  IconChevronDown,
  IconLogout,
  IconSettings,
  IconUser,
  IconHome,
  IconUpload,
  IconUsers,
  IconChartBar,
  IconTemplate,
  IconSchool,
  IconBook,
  IconTag,
  IconFileText,
  IconBrain,
} from '@tabler/icons-react';
import { useAuthStore, type UserRole } from '@store/auth.store';
import { useLogout } from '@features/auth/services/auth.service';
import { SchoolSwitcher } from '../SchoolSwitcher/SchoolSwitcher';

// Define navigation items for each role
const navigationItems: Record<UserRole, Array<{ label: string; icon: any; href: string }>> = {
  teacher: [
    { label: 'Dashboard', icon: IconHome, href: '/dashboard' },
    { label: 'Upload Recording', icon: IconUpload, href: '/upload' },
    { label: 'Template Analysis', icon: IconBrain, href: '/analysis' },
    { label: 'My Reports', icon: IconFileText, href: '/reports' },
  ],
  school_manager: [
    { label: 'Dashboard', icon: IconHome, href: '/dashboard' },
    { label: 'Upload Recording', icon: IconUpload, href: '/upload' },
    { label: 'All Recordings', icon: IconFileText, href: '/recordings' },
    { label: 'Template Analysis', icon: IconBrain, href: '/analysis' },
    { label: 'Teachers', icon: IconUsers, href: '/teachers' },
    { label: 'Templates', icon: IconTemplate, href: '/templates' },
    { label: 'Categories', icon: IconTag, href: '/categories' },
    { label: 'Subjects', icon: IconBook, href: '/subjects' },
    { label: 'Analytics', icon: IconChartBar, href: '/analytics' },
  ],
  super_admin: [
    { label: 'Dashboard', icon: IconHome, href: '/dashboard' },
    { label: 'Upload Recording', icon: IconUpload, href: '/upload' },
    { label: 'Schools', icon: IconSchool, href: '/admin/schools' },
    { label: 'Users', icon: IconUsers, href: '/admin/users' },
    { label: 'All Recordings', icon: IconFileText, href: '/admin/recordings' },
    { label: 'Template Analysis', icon: IconBrain, href: '/admin/analysis' },
    { label: 'Templates', icon: IconTemplate, href: '/admin/templates' },
    { label: 'Categories', icon: IconTag, href: '/admin/categories' },
    { label: 'Subjects', icon: IconBook, href: '/admin/subjects' },
  ],
};

export function AppShell() {
  const [opened, setOpened] = useState(false);
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { mutate: logout } = useLogout();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  
  if (!user) return null;
  
  const navItems = navigationItems[user.role] || [];
  
  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={() => setOpened(!opened)}
              hiddenFrom="sm"
              size="sm"
            />
            <Text size="xl" fw={700} c="blue">
              ClassReflect
            </Text>
          </Group>
          
          <Group gap="lg">
            <SchoolSwitcher />
            
            <Menu shadow="md" width={200}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap={7}>
                  <Avatar 
                    color="blue" 
                    radius={20} 
                    size="md"
                  >
                    {user.firstName[0]}{user.lastName[0]}
                  </Avatar>
                  <Text fw={500} size="sm" mr={3}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <IconChevronDown size={12} stroke={1.5} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            
            <Menu.Dropdown>
              <Menu.Label>{user.schoolName}</Menu.Label>
              <Menu.Label>{user.role.replace('_', ' ').toUpperCase()}</Menu.Label>
              
              <Menu.Divider />
              
              <Menu.Item
                component={Link}
                to="/profile"
                leftSection={<IconUser size={14} />}
              >
                Profile
              </Menu.Item>
              
              <Menu.Item
                component={Link}
                to="/settings"
                leftSection={<IconSettings size={14} />}
              >
                Settings
              </Menu.Item>
              
              <Menu.Divider />
              
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={14} />}
                onClick={() => logout()}
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </MantineAppShell.Header>
      
      <MantineAppShell.Navbar p="md">
        <MantineAppShell.Section grow>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              to={item.href}
              label={item.label}
              leftSection={<item.icon size={20} />}
              active={location.pathname === item.href}
              mb="xs"
              onClick={() => {
                if (isMobile) setOpened(false);
              }}
            />
          ))}
        </MantineAppShell.Section>
        
        <MantineAppShell.Section>
          <Text size="xs" c="dimmed" ta="center">
            © 2024 ClassReflect
          </Text>
        </MantineAppShell.Section>
      </MantineAppShell.Navbar>
      
      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
