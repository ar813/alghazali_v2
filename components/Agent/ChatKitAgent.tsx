"use client";

import { useChatKit, ChatKit } from '@openai/chatkit-react';
import { useEffect, useState } from 'react';
import { Flex, Text, Spinner } from '@chakra-ui/react';

export default function ChatKitAgent() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for the custom element to be registered by the CDN script
    if (typeof window !== 'undefined' && customElements) {
      customElements.whenDefined('openai-chatkit').then(() => {
        console.log('ChatKit Custom Element Defined');
        setIsReady(true);
      }).catch(err => {
        console.error('Failed to register ChatKit element:', err);
        setError('Interface registration failed.');
      });
    }
  }, []);

  const { control } = useChatKit({
    api: {
      url: '/api/chatkit/chat',
      domainKey: 'local-dev',
    },
    theme: {
      colorScheme: 'light',
      radius: 'soft',
      density: 'spacious',
      typography: {
        baseSize: 15
      }
    },
    composer: {
      placeholder: 'Ask with Ghazali Agent',
    },
    startScreen: {
      greeting: 'AL GHAZALI AI AGENT',
      prompts: [
        {
          icon: 'circle-question',
          label: 'What is Al Ghazali School?',
          prompt: 'Tell me about Al Ghazali High School'
        },
        {
          icon: 'book-open',
          label: 'Admission Process',
          prompt: 'How can I get admission?'
        },
        {
          icon: 'clock',
          label: 'School Timings',
          prompt: 'What are the school timings?'
        }
      ],
    },
    onError: (err) => {
      console.error('ChatKit internal error:', err);
    }
  });

  if (!isReady) {
    return (
      <Flex align="center" justify="center" h="600px" direction="column" gap={4}>
        <Spinner size="xl" color="primary" />
        <Text color="muted.foreground">Setting up secure chat environment...</Text>
        {error && <Text color="red.500" fontSize="sm">{error}</Text>}
      </Flex>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col bg-white">
      <ChatKit 
        control={control} 
        className="flex-1 w-full border rounded-2xl overflow-hidden shadow-xl" 
      />
    </div>
  );
}
