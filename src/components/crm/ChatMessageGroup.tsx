'use client';

import { Message, Ticket } from './types';
import ChatMessage from './ChatMessage';

interface ChatMessageGroupProps {
  messages: Message[];
  client: Ticket['client'];
  onReply: (message: Message) => void;
}

export default function ChatMessageGroup({ messages, client, onReply }: ChatMessageGroupProps) {
  if (!messages || messages.length === 0) return null;

  const firstMessage = messages[0];
  const sender = firstMessage.sender;

  return (
    <div className={`flex flex-col items-${sender === 'agent' ? 'end' : 'start'} space-y-1`}>
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          client={client}
          onReply={onReply}
          isGrouped={index > 0}
        />
      ))}
    </div>
  );
}