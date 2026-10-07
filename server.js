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
      return res.status(400).json({ error: "Chưa có nội dung tin nhắn." });
    }

    if (!COZE_TOKEN || !COZE_BOT_ID) {
      return res.status(500).json({
        error: "Website chưa được cấu hình Coze Token và Bot ID."
      });
    }

    const response = await fetch("https://api.coze.com/v3/chat", {
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
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data
      });
    }

    res.json(data);

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
