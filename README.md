# One Hope Church App

A modern web application for One Hope Church with Planning Center integration, Bible study features, and event management.

## 🚀 Features

- **Planning Center Integration**: OAuth authentication and event management
- **Bible Study Tools**: Daily devotionals and verse lookup
- **Event Management**: RSVP functionality and event details
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Dynamic content loading

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Authentication**: Planning Center OAuth 2.0
- **APIs**: Planning Center API, Bible API
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Planning Center account with API access
- Bible API access

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/one-hope-app.git
   cd one-hope-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PLANNING_CENTER_CLIENT_ID=your_client_id
   PLANNING_CENTER_CLIENT_SECRET=your_client_secret
   SESSION_SECRET=your_session_secret
   BIBLE_API_KEY=your_bible_api_key
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🌐 Deployment

### Vercel Deployment

1. **Connect to GitHub**
   - Push your code to a GitHub repository
   - Connect your repository to Vercel

2. **Configure Environment Variables**
   In your Vercel project settings, add the same environment variables as in your `.env` file.

3. **Update Planning Center OAuth**
   - Go to your Planning Center app settings
   - Add your Vercel domain to the allowed redirect URIs:
     ```
     https://your-app-name.vercel.app/auth/callback
     ```

4. **Deploy**
   - Vercel will automatically deploy on every push to main branch
   - Or manually deploy from the Vercel dashboard

## 📁 Project Structure

```
one-hope-app/
├── public/                 # Static files
│   ├── index.html         # Main application
│   ├── script.js          # Frontend JavaScript
│   └── styles/            # CSS files
├── server.js              # Express server
├── package.json           # Dependencies
├── vercel.json           # Vercel configuration
└── README.md             # This file
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PLANNING_CENTER_CLIENT_ID` | Planning Center OAuth client ID | Yes |
| `PLANNING_CENTER_CLIENT_SECRET` | Planning Center OAuth client secret | Yes |
| `SESSION_SECRET` | Express session secret | Yes |
| `BIBLE_API_KEY` | Bible API access key | No |

## 🚀 API Endpoints

- `GET /` - Main application
- `GET /auth/planningcenter` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `GET /api/events` - Get events from Planning Center
- `POST /api/events/:eventId/rsvp` - RSVP for an event
- `GET /api/user` - Get current user info
- `GET /api/signout` - Sign out user
- `GET /api/bible/daily` - Get daily Bible reading
- `GET /api/bible/verse/:passageId` - Get specific Bible verse

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- One Hope Church for the opportunity to serve
- Planning Center for their excellent API
- Bible API for providing scripture access
- Vercel for seamless deployment

## 📞 Support

For support, email corey@onehopechurch.com or create an issue in this repository. 