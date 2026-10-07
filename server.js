const express = require("express");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const COZE_TOKEN = process.env.COZE_TOKEN;
const COZE_BOT_ID = process.env.COZE_BOT_ID;

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body.message;

    if (!message) {
      return res.status(400).json({
        error: "Chưa có nội dung tin nhắn."
      });
    }

    if (!COZE_TOKEN || !COZE_BOT_ID) {
      return res.status(500).json({
        error: "Chưa cấu hình Coze Token hoặc Bot ID."
      });
    }

    // 1. Gửi câu hỏi đến Coze
    const chatResponse = await fetch(
      "https://api.coze.com/v3/chat",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${COZE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bot_id: COZE_BOT_ID,
          user_id: "website_user",
          stream: false,
          auto_save_history: true,
          additional_messages: [
            {
              role: "user",
              content: message,
              content_type: "text"
            }
          ]
        })
      }
    );

    const chatData = await chatResponse.json();

    if (!chatResponse.ok || chatData.code !== 0) {
      return res.status(500).json({
        error: chatData.msg || "Coze không tạo được cuộc trò chuyện."
      });
    }

    const conversationId = chatData.data.conversation_id;
    const chatId = chatData.data.id;

    // 2. Chờ Coze xử lý
    let status = "in_progress";

    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const retrieveResponse = await fetch(
        `https://api.coze.com/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`,
        {
          headers: {
            "Authorization": `Bearer ${COZE_TOKEN}`
          }
        }
      );

      const retrieveData = await retrieveResponse.json();

      if (retrieveData.code !== 0) {
        return res.status(500).json({
          error: retrieveData.msg || "Không lấy được trạng thái Coze."
        });
      }

      status = retrieveData.data.status;

      if (status === "completed") {
        break;
      }

      if (status === "failed") {
        return res.status(500).json({
          error: "Coze xử lý câu hỏi thất bại."
        });
      }
    }

    if (status !== "completed") {
      return res.status(504).json({
        error: "Coze phản hồi quá lâu."
      });
    }

    // 3. Lấy danh sách tin nhắn
    const messageResponse = await fetch(
      `https://api.coze.com/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`,
      {
        headers: {
          "Authorization": `Bearer ${COZE_TOKEN}`
        }
      }
    );

    const messageData = await messageResponse.json();

    if (messageData.code !== 0) {
      return res.status(500).json({
        error: messageData.msg || "Không lấy được câu trả lời."
      });
    }

    // 4. Tìm câu trả lời của AI
    const answer = messageData.data
      .filter(item => item.type === "answer")
      .map(item => item.content)
      .pop();

    res.json({
      answer: answer || "Coze chưa trả về nội dung."
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Không thể kết nối đến Coze."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});
