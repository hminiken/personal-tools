// src/components/NavigationShell.tsx
'use client';

import { AppShell, Burger, Group, NavLink, Title, ActionIcon, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  IconNeedleThread, 
  IconBook, 
  IconHome,
  IconCurrencyDollar,
  IconChevronLeft,
  IconCategory
} from '@tabler/icons-react';

export default function NavigationShell({ children }: { children: React.ReactNode }) {
  // Start the sidebar closed by default
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ 
        width: 260, 
        breakpoint: 'sm', 
        // This forces the sidebar to hide on ALL screen sizes when closed
        collapsed: { desktop: !opened, mobile: !opened } 
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          {/* Show the burger menu only when the sidebar is hidden */}
          {!opened && (
            <Burger opened={opened} onClick={toggle} size="sm" />
          )}
          <Title order={3}>Command Center</Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        {/* TOP BAR OF THE SIDEBAR (Logo and Close Button) */}
        <AppShell.Section>
          <Group justify="space-between" p="md">
            <IconCategory size={28} stroke={1.5} color="var(--mantine-color-blue-filled)" />
            <ActionIcon onClick={close} variant="subtle" color="gray">
              <IconChevronLeft size={20} />
            </ActionIcon>
          </Group>
        </AppShell.Section>

        {/* SCROLLABLE LINKS AREA */}
        <AppShell.Section grow component={ScrollArea} p="md">
          <NavLink 
            component={Link} 
            href="/" 
            label="Dashboard" 
            leftSection={<IconHome size="1rem" stroke={1.5} />} 
            active={pathname === '/'}
          />
          
    {/* --- NESTED CRAFTING MENU --- */}
          <NavLink 
            label="Crochet & Crafting" 
            leftSection={<IconNeedleThread size="1rem" stroke={1.5} />} 
            childrenOffset={28} // This creates that nice indentation for the sub-links
            // This keeps the folder open if you are currently on any page inside it
            defaultOpened={pathname.startsWith('/crafting')} 
          >
            <NavLink 
              component={Link} 
              href="/crafting/patterns" 
              label="Patterns" 
              active={pathname.includes('/patterns')}
            />
            <NavLink 
              component={Link} 
              href="/crafting/projects" // You can create this route later!
              label="Projects" 
              active={pathname.includes('/projects')}
            />
            <NavLink 
              component={Link} 
              href="/crafting/stash" 
              label="Yarn Stash" 
              active={pathname.includes('/stash')}
            />
          </NavLink>

          <NavLink 
            component={Link} 
            href="/writing" 
            label="Writing Desk" 
            leftSection={<IconBook size="1rem" stroke={1.5} />} 
            active={pathname.startsWith('/writing')}
          />

          <NavLink 
            component={Link} 
            href="/budget" 
            label="Budget" 
            leftSection={<IconCurrencyDollar size="1rem" stroke={1.5} />} 
            active={pathname.startsWith('/budget')}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}