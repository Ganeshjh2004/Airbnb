import React, { useState } from "react";

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className="chat-button" onClick={() => setIsOpen(!isOpen)}>
                💬 AI Chat
            </div>

            <div className={`chat-iframe-container ${isOpen ? "open" : ""}`}>
                <iframe
                    src="https://www.chatbase.co/chatbot-iframe/gikRxe-1lN9kV5XD_4kMe"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    title="WanderLust AI Chat"
                ></iframe>
            </div>
        </>
    );
}
