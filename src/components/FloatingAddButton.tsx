import { Affix, ActionIcon, Text, Paper, Box } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export function FloatingAddButton({ onClick, text }: { onClick: () => void, text: string }) {
  return (
    <Affix position={{ bottom: 30, right: 30 }} zIndex={200}>
      <Paper
        onClick={onClick}
        className="fab-container"
        shadow="lg"
        bg="olive.5"
        radius="xl"
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          height: '56px',
          width: '56px', // Start as a circle
          transition: 'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Icon stays anchored here */}
        <Box style={{ minWidth: '56px', display: 'flex', justifyContent: 'center' }}>
          <IconPlus size={24} color="white" />
        </Box>

        {/* Text sits to the right, hidden until hover */}
        <Text 
          c="white" 
          fw={600} 
          style={{ 
            whiteSpace: 'nowrap', 
            paddingRight: '20px',
            opacity: 0,
            transition: 'opacity 0.2s' 
          }}
        >
          {text}
        </Text>
      </Paper>

      <style jsx global>{`
        .fab-container:hover {
          width: auto !important;
        }
        .fab-container:hover p {
          opacity: 1 !important;
        }
      `}</style>
    </Affix>
  );
}