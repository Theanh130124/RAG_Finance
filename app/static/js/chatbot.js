// static/js/chatbot.js
class Chatbot {
  constructor() {
    this.theme = localStorage.getItem("chatbot-theme") || "light"
    this.isTyping = false
    this.apiBaseUrl = "/api/chat"
    this.currentConversationId = null
    this.conversations = []

    this.initializeElements()
    this.bindEvents()
    this.applyTheme()
    this.loadConversations()
  }

  initializeElements() {
    this.elements = {
      chatMessages: document.getElementById("chat-messages"),
      chatInput: document.getElementById("chat-input"),
      sendButton: document.getElementById("send-button"),
      clearChat: document.getElementById("clear-chat"),
      themeToggle: document.getElementById("theme-toggle"),
      infoBtn: document.getElementById("info-btn"),
      newChatBtn: document.getElementById("new-chat-btn"),
      clearHistoryBtn: document.getElementById("clear-history-btn"),
      chatHistory: document.getElementById("chat-history"),
      suggestionsContainer: document.getElementById("suggestions-container"),
      suggestions: document.querySelectorAll(".suggestion-btn"),
      sidebar: document.getElementById("chatbot-sidebar"),
    }
  }

  bindEvents() {
    this.elements.sendButton.addEventListener("click", () => this.sendMessage())
    this.elements.chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })

    this.elements.clearChat.addEventListener("click", () => this.clearCurrentChat())

    if (this.elements.themeToggle) {
      this.elements.themeToggle.addEventListener("click", () => this.toggleTheme())
    }

    if (this.elements.infoBtn) {
      this.elements.infoBtn.addEventListener("click", () => {
        const infoModal = document.getElementById("infoModal")
        if (infoModal && window.bootstrap) {
          new window.bootstrap.Modal(infoModal).show()
        }
      })
    }

    if (this.elements.newChatBtn) {
      this.elements.newChatBtn.addEventListener("click", () => this.startNewConversation())
    }

    if (this.elements.clearHistoryBtn) {
      this.elements.clearHistoryBtn.addEventListener("click", () => this.clearAllHistory())
    }

    this.elements.suggestions.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const topic = e.currentTarget.getAttribute("data-topic")
        this.handleSuggestion(topic)
      })
    })
  }

  handleSuggestion(topic) {
    const suggestions = {
      saving: "Làm thế nào để tiết kiệm tiền hiệu quả?",
      investment: "Đầu tư gì an toàn với số vốn nhỏ?",
      stock: "Tôi nên bắt đầu đầu tư chứng khoán như thế nào?",
      insurance: "Loại bảo hiểm nào cần thiết cho người trẻ?",
      retirement: "Lập kế hoạch hưu trí từ tuổi 30",
      budget: "Cách lập ngân sách chi tiêu hàng tháng",
      debt: "Làm sao để trả nợ nhanh nhất?",
      tax: "Cách tối ưu hóa thuế thu nhập cá nhân"
    }

    if (this.elements.chatInput) {
      this.elements.chatInput.value = suggestions[topic] || topic
      this.sendMessage()
    }
  }

  async loadConversations() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/conversations`)
      if (!response.ok) throw new Error("Failed to load conversations")

      this.conversations = await response.json()

      // Display conversations in sidebar
      if (this.elements.chatHistory) {
        this.renderConversationsSidebar(this.conversations)
      }

      // CHỈ load conversation đầu tiên nếu chưa có conversation hiện tại
      if (this.conversations.length > 0 && !this.currentConversationId) {
        await this.loadConversation(this.conversations[0].id)
      } else if (this.conversations.length === 0 && !this.currentConversationId) {
        await this.startNewConversation()
      }
    } catch (error) {
      console.error("Error loading conversations:", error)
      if (!this.currentConversationId) {
        await this.startNewConversation()
      }
    }
  }

  renderConversationsSidebar(conversations) {
    const historyContainer = this.elements.chatHistory
    if (!historyContainer) return

    if (!conversations || conversations.length === 0) {
      historyContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>Chưa có cuộc tư vấn nào</p>
        </div>
      `
      return
    }

    historyContainer.innerHTML = conversations
      .map(
        (conv) => `
          <div class="chat-item ${conv.id === this.currentConversationId ? 'active' : ''}"
               data-conversation-id="${conv.id}">
            <div class="chat-item-icon">
              <i class="fas fa-comments"></i>
            </div>
            <div class="chat-item-content">
              <div class="chat-item-title">${this.escapeHtml(conv.title)}</div>
              <div class="chat-item-time">${this.escapeHtml(conv.updatedAt)}</div>
            </div>
            <button class="delete-conversation" data-id="${conv.id}" title="Xóa cuộc tư vấn">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `
      )
      .join("")

    // Add click handlers to conversation items
    document.querySelectorAll(".chat-item").forEach((item) => {
      item.addEventListener("click", async (e) => {
        if (!e.target.closest('.delete-conversation')) {
          const convId = item.getAttribute("data-conversation-id")
          await this.loadConversation(Number.parseInt(convId))
        }
      })
    })

    // Add delete conversation handlers
    document.querySelectorAll(".delete-conversation").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation()
        const convId = btn.getAttribute("data-id")
        await this.deleteConversation(Number.parseInt(convId))
      })
    })
  }

  async deleteConversation(conversationId) {
    if (!confirm('Bạn có chắc muốn xóa cuộc tư vấn này?')) return

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete conversation')

      if (this.currentConversationId === conversationId) {
        await this.startNewConversation()
      }

      await this.loadConversations()
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Có lỗi xảy ra khi xóa cuộc tư vấn')
    }
  }

  async loadConversation(conversationId) {
    try {
      this.currentConversationId = conversationId
      const response = await fetch(`${this.apiBaseUrl}/conversations/${conversationId}/messages`)
      if (!response.ok) throw new Error("Failed to load messages")

      const messages = await response.json()

      if (this.elements.chatMessages) {
        this.elements.chatMessages.innerHTML = ""

        // Display all messages
        messages.forEach((msg) => {
          this.renderMessage({
            content: msg.content,
            type: msg.type,
            timestamp: msg.timestamp,
            is_html: msg.is_html
          })
        })

        this.scrollToBottom()
        this.updateSidebarActiveState()
      }
    } catch (error) {
      console.error("Error loading conversation:", error)
    }
  }

  updateSidebarActiveState() {
    const items = document.querySelectorAll('.chat-item')
    items.forEach(item => {
      const convId = item.getAttribute("data-conversation-id")
      if (Number.parseInt(convId) === this.currentConversationId) {
        item.classList.add('active')
      } else {
        item.classList.remove('active')
      }
    })
  }

  async startNewConversation() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Tư vấn tài chính ${new Date().toLocaleString("vi-VN")}`,
        }),
      })

      if (!response.ok) throw new Error("Failed to create conversation")

      const newConversation = await response.json()
      this.currentConversationId = newConversation.id
      this.conversations.unshift(newConversation)

      // Update sidebar
      if (this.elements.chatHistory) {
        this.renderConversationsSidebar(this.conversations)
      }

      if (this.elements.chatMessages) {
        this.elements.chatMessages.innerHTML = ""
        this.addWelcomeMessage()
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  async sendMessage() {
    const message = this.elements.chatInput?.value.trim() || ''

    if (!message || this.isTyping) {
      if (!message) {
        alert('Vui lòng nhập câu hỏi về tài chính')
      }
      return
    }

    // Create conversation if not exists
    if (!this.currentConversationId) {
      await this.startNewConversation()
    }

    // Hiển thị tin nhắn user ngay lập tức
    this.addMessageToUI(message, "user")

    if (this.elements.chatInput) {
      this.elements.chatInput.value = ""
    }

    this.showTypingIndicator()

    try {
      const response = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conversation_id: this.currentConversationId
        })
      })

      const data = await response.json()

      if (data.success) {
        this.hideTypingIndicator()
        this.addMessageToUI(data.response, "bot")
        await this.loadConversations()
      } else {
        throw new Error(data.error || 'Không thể nhận phản hồi')
      }
    } catch (error) {
      this.hideTypingIndicator()
      const errorMsg = "Xin lỗi, đã có lỗi xảy ra khi xử lý câu hỏi tài chính. Vui lòng thử lại sau."
      this.addMessageToUI(errorMsg, "bot")
      console.error("Chatbot error:", error)
    }
  }

  addMessageToUI(content, type) {
    const timestamp = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })

    this.renderMessage({
      content,
      type,
      timestamp
    })

    this.scrollToBottom()
  }

  renderMessage(message) {
    if (!this.elements.chatMessages) return

    const messageElement = document.createElement("div")
    messageElement.className = `message ${message.type}`

    let messageHTML = ''

    if (message.type === "user") {
      messageHTML = `
        <div class="message-content">
          ${message.content ? `<p>${this.formatMessageContent(message.content)}</p>` : ''}
          <div class="message-time">${this.escapeHtml(message.timestamp)}</div>
        </div>
        <div class="message-avatar">
          <i class="fas fa-user"></i>
        </div>
      `
    } else {
      const content = this.formatMessageContent(message.content)

      messageHTML = `
        <div class="message-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
          ${content}
          <div class="message-time">${this.escapeHtml(message.timestamp)}</div>
        </div>
      `
    }

    messageElement.innerHTML = messageHTML
    this.elements.chatMessages.appendChild(messageElement)
  }

  formatMessageContent(content) {
    if (!content) return ''

    // Xử lý markdown đơn giản và emoji
    return this.escapeHtml(content)
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/- (.*?)(?=\n|$)/g, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>")
  }

  escapeHtml(unsafe) {
    if (!unsafe) return ''
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  showTypingIndicator() {
    if (!this.elements.chatMessages) return

    this.isTyping = true
    const typingElement = document.createElement("div")
    typingElement.className = "message bot loading"
    typingElement.id = "typing-indicator"
    typingElement.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="message-content">
        <div class="typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    `
    this.elements.chatMessages.appendChild(typingElement)
    this.scrollToBottom()
  }

  hideTypingIndicator() {
    this.isTyping = false
    const typingElement = document.getElementById("typing-indicator")
    if (typingElement) {
      typingElement.remove()
    }
  }

  scrollToBottom() {
    if (!this.elements.chatMessages) return

    setTimeout(() => {
      this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight
    }, 100)
  }

  async clearCurrentChat() {
    if (!confirm("Bạn có chắc muốn xóa cuộc tư vấn hiện tại?")) return

    try {
      if (this.currentConversationId) {
        const response = await fetch(`${this.apiBaseUrl}/conversations/${this.currentConversationId}`, {
          method: "DELETE",
        })

        if (!response.ok) throw new Error("Failed to delete conversation")

        this.conversations = this.conversations.filter((c) => c.id !== this.currentConversationId)
      }

      if (this.elements.chatHistory) {
        this.renderConversationsSidebar(this.conversations)
      }

      await this.startNewConversation()
    } catch (error) {
      console.error("Error deleting conversation:", error)
      alert('Có lỗi xảy ra khi xóa cuộc tư vấn')
    }
  }

  async clearAllHistory() {
    if (!confirm("Bạn có chắc muốn xóa tất cả lịch sử tư vấn? Hành động này không thể hoàn tác.")) return

    try {
      // Delete all conversations
      const deletePromises = this.conversations.map(conv =>
        fetch(`${this.apiBaseUrl}/conversations/${conv.id}`, { method: "DELETE" })
      )

      await Promise.all(deletePromises)

      this.conversations = []

      if (this.elements.chatMessages) {
        this.elements.chatMessages.innerHTML = ""
      }

      if (this.elements.chatHistory) {
        this.renderConversationsSidebar([])
      }

      await this.startNewConversation()
    } catch (error) {
      console.error("Error clearing history:", error)
      alert('Có lỗi xảy ra khi xóa lịch sử')
    }
  }

  addWelcomeMessage() {
    if (!this.elements.chatMessages) return

    const welcomeMessage = `💰 **Xin chào! Tôi là chuyên gia tư vấn tài chính cá nhân** 👨‍💼

Tôi có thể giúp bạn với các vấn đề về:

📊 **Lập kế hoạch tài chính** - Ngân sách, tiết kiệm, đầu tư
💹 **Đầu tư thông minh** - Chứng khoán, bất động sản, quỹ mở
🏦 **Quản lý thu nhập** - Tối ưu hóa thu nhập, giảm thuế
🛡️ **Bảo hiểm và rủi ro** - Bảo vệ tài chính gia đình
🎯 **Mục tiêu tài chính** - Mua nhà, xe, du học, hưu trí
📈 **Phân tích thị trường** - Xu hướng đầu tư hiện tại

**Bạn có thể hỏi về:**
- Cách tiết kiệm 20% thu nhập
- Đầu tư an toàn với số vốn nhỏ
- Lập kế hoạch hưu trí
- Quản lý nợ hiệu quả
- Tối ưu thuế thu nhập
- Phân bổ tài sản hợp lý

Hãy bắt đầu bằng cách hỏi bất kỳ câu hỏi tài chính nào! 💰`

    this.addMessageToUI(welcomeMessage, "bot")
  }

  toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light"
    this.applyTheme()
    localStorage.setItem("chatbot-theme", this.theme)
  }

  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.theme)
    const icon = this.elements.themeToggle?.querySelector("i")
    if (icon) {
      icon.className = this.theme === "light" ? "fas fa-moon" : "fas fa-sun"
    }
  }
}

// Khởi tạo chatbot khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
  // Đợi một chút để đảm bảo tất cả element đã sẵn sàng
  setTimeout(() => {
    try {
      window.chatbot = new Chatbot()
      console.log('Chatbot tài chính đã được khởi tạo thành công')
    } catch (error) {
      console.error('Không thể khởi tạo chatbot:', error)
    }
  }, 100)
})