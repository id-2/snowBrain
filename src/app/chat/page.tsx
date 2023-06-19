"use client";

import { useLocalStorage } from "@/../hooks/use-local-storage";
import { appendUserMessage, createNewChat, deleteChat, editChat } from '@/../utils/chatHelpers';
import { ChatArea } from "@/components/ChatArea";
import CustomToast from '@/components/CustomToast';
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SidebarChatButton } from "@/components/SidebarChatButton";
import { TokenCountContext } from "@/components/token";
import { Chat } from "@/types/Chat";
import { ChatMessage } from "@/types/ChatMessage";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const Page = () => {
  const [sidebarOpened, setSidebarOpened] = useState(false);
  const [Loading, setLoading] = useState(false);
  // const [chatList, setChatList] = useState<Chat[]>([]);
  const [chatList, setChatList] = useLocalStorage<Chat[]>('chatList', []);
  const [chatActiveId, setChatActiveId] = useState<string>("");
  const [chatActive, setChatActive] = useState<Chat>();
  const [image, setImage] = useState<string | null>(null);
  const { setCurrentMessageToken } = useContext(TokenCountContext); // use context
  const [activeChatMessagesCount, setActiveChatMessagesCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const activeChat = chatList.find(item => item.id === chatActiveId);
    setChatActive(activeChat);

    if (activeChat) {
      setActiveChatMessagesCount(activeChat.messages.length);
    }
  }, [chatActiveId, chatList])

  useEffect(() => {
    if (Loading) fetchResponse();
  }, [Loading]);

  // Add the state variables at the start of your component.
  const [pythonCode, setPythonCode] = useState("");
  const [sqlCode, setSqlCode] = useState("");

  const fetchResponse = async () => {
    const decoder = new TextDecoder('utf-8');
    let fullChat = [...chatList];
    let ChatIndex = fullChat.findIndex(item => item.id === chatActiveId);
    if (ChatIndex > -1) {
      let chat = fullChat[ChatIndex];

      // Prepare the history array
      let history: string[] = [];
      for (let i = 0; i < chat.messages.length - 1; i += 2) {
        let question = chat.messages[i].content;
        let answer = chat.messages[i + 1]?.content || '';
        history.push(question, answer);
      }
      let question = chat.messages[chat.messages.length - 1].content;
      // Store the history array in chatHistories with the chat id as the key
      const response = await fetch('/api/sql', {
        method: 'POST',
        body: JSON.stringify({ prompt: question, history: history }),
        headers: {
          'Content-Type': 'application/json'
        },
      })
      if (!response.body) {
        return alert('Something went wrong');
      }

      const reader = response.body.getReader();
      let messageObject: ChatMessage = { id: uuidv4(), author: 'assistant', content: "" }; // Fixing author type issue
      // Add a new messageObject for the AI's response
      fullChat[ChatIndex].messages = [...fullChat[ChatIndex].messages, messageObject]; // Using spread operator instead of concat for array
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Once streaming is done, we handle the message content
          const pythonCodeRegex = /```python([\s\S]*?)```/g;
          const sqlCodeRegex = /```sql([\s\S]*?)```/g;
          let pythonCodeMatch, sqlCodeMatch;
          let pythonCode = '', sqlCode = '';
          while ((pythonCodeMatch = pythonCodeRegex.exec(messageObject.content)) !== null) {
            pythonCode = pythonCodeMatch[1].trim();
          }
          while ((sqlCodeMatch = sqlCodeRegex.exec(messageObject.content)) !== null) {
            sqlCode = sqlCodeMatch[1].trim();
          }
          setPythonCode(pythonCode);
          setSqlCode(sqlCode);
          // Remove the Python code from the displayed message
          // messageObject.content = messageObject.content.replace(pythonCodeRegex, '');
          fullChat[ChatIndex].messages[fullChat[ChatIndex].messages.length - 1] = messageObject;
          setChatList([...fullChat]);
          break;
        }

        const text = decoder.decode(value);
        messageObject.content += text;
        // Update the last message with updated message
        fullChat[ChatIndex].messages[fullChat[ChatIndex].messages.length - 1] = messageObject;
        console.log("Message Object", messageObject)
        console.log("Full Chat", fullChat)
        setChatList([...fullChat]);
      }
    }
    console.log("Python   ", pythonCode)
    console.log("SQL   ", sqlCode)
    setLoading(false);
  }

  console.log("Python   ", pythonCode)
  console.log("SQL   ", sqlCode)
  console.log("Chat List", chatList)


  const openSidebar = () => setSidebarOpened(true);
  const closeSidebar = () => setSidebarOpened(false);

  const handleClearConversations = () => {
    if (Loading) return;
    setChatList([]);
    setChatActiveId('');
    // location.reload();
  }

  const handleNewChat = () => {
    if (Loading) return;
    setChatActiveId('')
    closeSidebar();

  }

  const handleSendMessage = (message: string) => {
    if (activeChatMessagesCount >= 8) {
      toast((t) => <CustomToast message='You have reached the maximum number of messages for this chat' />, {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }
    if (!chatActiveId) {
      let newChat = createNewChat(message);
      setChatList([newChat, ...chatList]);
      setChatActiveId(newChat.id);
    } else {
      let updatedChatList = appendUserMessage([...chatList], chatActiveId, message);
      setChatList(updatedChatList);

      // Update the message count for the active chat
      setActiveChatMessagesCount(prev => prev + 1);
    }
    setCurrentMessageToken(0); // Reset token count
    setLoading(true);
  }


  const handleSelectChat = (id: string) => {
    if (Loading) return;
    let item = chatList.find(item => item.id === id);
    if (item) setChatActiveId(item.id);
    closeSidebar();
  }

  const handleDeleteChat = (id: string) => {
    let updatedChatList = deleteChat([...chatList], id);
    setChatList(updatedChatList);
    setChatActiveId('');
    router.push('/')
  }

  const handleEditChat = (id: string, newTitle: string) => {
    if (newTitle) {
      let updatedChatList = editChat([...chatList], id, newTitle);
      setChatList(updatedChatList);
    }
  }

  const handleTestOpenAI = async () => {
    const response = await fetch('/api/py');
    const data = await response.json();

    console.log(data); // Add this line to check the data


    let image = new Image();
    image.src = 'data:image/png;base64,' + data.base64String;
    console.log(image);
    console.log("image--", image.src);
    document.body.appendChild(image);
    setImage(image.src);

  }

  return (
    <main className="flex min-h-screen dark:bg-neutral-900 bg-neutral-200/40">
      <Sidebar
        open={sidebarOpened}
        onClose={closeSidebar}
        onClear={handleClearConversations}
        onNewChat={handleNewChat}
      >
        {chatList.map(item => (
          <SidebarChatButton
            key={item.id}
            chatItem={item}
            active={item.id === chatActiveId}
            onClick={handleSelectChat}
            onDelete={handleDeleteChat}
            onEdit={handleEditChat}
          />
        ))}

      </Sidebar>
      <section className="flex flex-col w-full">
        <Header
          openSidebarClick={openSidebar}
          title={chatActive ? chatActive.title : 'Chat'}
          newChatClick={handleNewChat}
        />

        <ChatArea chat={chatActive} loading={Loading} />

        {/* <button onClick={handleTestOpenAI}>Test AI</button> */}

        {/* Display the image if it's loaded */}
        {image && <img src={image} alt="Plot" />}        {/* {streamedData} */}

        <Footer
          onSendMessage={handleSendMessage}
          disabled={Loading || activeChatMessagesCount >= 10}
        />

      </section>
    </main>
  );
}

export default Page;