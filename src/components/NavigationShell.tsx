// src/components/NavigationShell.tsx
'use client';

import { AppShell, Burger, Group, NavLink, Title, ActionIcon, ScrollArea, useComputedColorScheme, useMantineColorScheme, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  IconNeedleThread, 
  IconBook, 
  IconHome,
  IconCurrencyDollar,
  IconChevronLeft,
  IconCategory,
  IconMoon,
  IconSun,
  IconCoffee
} from '@tabler/icons-react';
import { useWakeLock } from '@hooks/useWakeLock';


export default function NavigationShell({ children }: { children: React.ReactNode }) {
  // Start the sidebar closed by default
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();

  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  const getPageTitle = () => {
    // If the URL is exactly the root, or maybe a dashboard
    if (pathname === '/') return 'Command Center';
    
    // We use .includes() so that both the gallery (/patterns) 
    // AND the individual item (/patterns/1) show the correct category!
    if (pathname.includes('/crafting/patterns')) return 'Pattern Library';
    if (pathname.includes('/crafting/projects')) return 'Active Projects';
    if (pathname.includes('/crafting/inventory')) return 'Yarn Stash'; // Just in case you add this later!
    
    return 'Command Center'; // A safe fallback
  };


  const { isAwake, setIsAwake, isSupported } = useWakeLock();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ 
        width: 260, 
        breakpoint: 'sm', 
        // This forces the sidebar to hide on ALL screen sizes when closed
        collapsed: { desktop: !opened, mobile: !opened } 
      }}
      padding={40}
    >
     <AppShell.Header bg={"olive.8"}>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} size="sm" />
            <Title c={"neutrals.1"} order={3}>{getPageTitle()}</Title>
          </Group>
          
          <Group>
            {/* 3. Add the Keep Awake Toggle (Only renders if the browser supports it) */}
            {isSupported && (
              <Tooltip label={isAwake ? "Allow screen to sleep" : "Keep screen awake"} withArrow>
                <ActionIcon
                  onClick={() => setIsAwake(!isAwake)}
                  variant={isAwake ? "light" : "default"}
                  color={isAwake ? "orange" : "gray"}
                  size="lg"
                  aria-label="Toggle screen wake lock"
                >
                  <IconCoffee stroke={1.5} />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Your Dark Mode Toggle */}
            <ActionIcon
              onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
              variant="default"
              size="lg"
              aria-label="Toggle color scheme"
            >
              <IconSun stroke={1.5} className="mantine-light-hidden" />
              <IconMoon stroke={1.5} className="mantine-dark-hidden" />
            </ActionIcon>
          </Group>
          
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        {/* TOP BAR OF THE SIDEBAR (Logo and Close Button) */}
        <AppShell.Section>
          <Group justify="space-between" p="md">
            <IconCategory size={28} stroke={1.5} color="olive" />
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

      <AppShell.Main p={{ sm: 'xl' }}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}